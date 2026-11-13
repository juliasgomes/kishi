import type { FolderKey, KishiState } from '@/src/types/kishi';

export interface DuplicateLinkMatch {
  matchType: 'exact' | 'same_sheet';
  label: string;
  location: string;
  url: string;
}

export interface DuplicateExcludeFilter {
  kind: 'sheet' | 'portal' | 'channel' | 'campaign' | 'wave';
  id?: string;
  campaignId?: string;
  channelRef?: {
    folder: FolderKey;
    listKey: 'internos' | 'externos';
    index: number;
  };
  channelField?: 'url' | 'monitorSheetUrl';
}

export function isGoogleSheetsUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl.trim());
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'docs.google.com' &&
      /\/spreadsheets\/d\/(e\/)?[a-zA-Z0-9-_]+/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

export function extractGoogleSheetMeta(rawUrl: string): {
  docKey: string;
  gid: string;
} | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.hostname !== 'docs.google.com') return null;
    const pubMatch = parsed.pathname.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
    const idMatch = parsed.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!pubMatch && !idMatch) return null;

    const hashGidMatch = parsed.hash.match(/gid=(\d+)/);
    const gid = parsed.searchParams.get('gid') || hashGidMatch?.[1] || '';

    return {
      docKey: pubMatch ? `pub:${pubMatch[1]}` : `id:${idMatch![1]}`,
      gid,
    };
  } catch {
    return null;
  }
}

const IGNORED_QUERY_PARAMS = new Set([
  'usp',
  'ouid',
  'sd',
  'rtpof',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
]);

export function normalizeUrlForCompare(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';

  const sheetMeta = extractGoogleSheetMeta(trimmed);
  if (sheetMeta) {
    return sheetMeta.gid
      ? `gsheet:${sheetMeta.docKey}#gid=${sheetMeta.gid}`
      : `gsheet:${sheetMeta.docKey}`;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    const params = new URLSearchParams();
    for (const [k, v] of parsed.searchParams.entries()) {
      if (!IGNORED_QUERY_PARAMS.has(k.toLowerCase())) {
        params.append(k, v);
      }
    }
    params.sort();
    const qs = params.toString();
    const hash = parsed.hash && parsed.hash !== '#' ? parsed.hash : '';
    return `${parsed.protocol}//${host}${pathname}${qs ? `?${qs}` : ''}${hash}`;
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, '');
  }
}

export function findDuplicateLinks(
  candidateUrl: string,
  state: KishiState | undefined,
  exclude?: DuplicateExcludeFilter,
): DuplicateLinkMatch[] {
  if (!state) return [];
  const trimmed = (candidateUrl || '').trim();
  if (!trimmed || trimmed.startsWith('data:')) return [];

  const targetNorm = normalizeUrlForCompare(trimmed);
  if (!targetNorm || targetNorm.length < 6) return [];

  const targetSheet = extractGoogleSheetMeta(trimmed);
  const matches: DuplicateLinkMatch[] = [];

  const checkEntry = (
    entryUrl: string | undefined,
    label: string,
    location: string,
    isExcluded: boolean,
  ) => {
    if (isExcluded || !entryUrl) return;
    const cleanEntry = entryUrl.trim();
    if (!cleanEntry || cleanEntry.startsWith('data:')) return;

    const entryNorm = normalizeUrlForCompare(cleanEntry);
    if (!entryNorm) return;

    if (entryNorm === targetNorm) {
      matches.push({ matchType: 'exact', label, location, url: cleanEntry });
      return;
    }

    if (targetSheet) {
      const entrySheet = extractGoogleSheetMeta(cleanEntry);
      if (entrySheet && entrySheet.docKey === targetSheet.docKey) {
        matches.push({ matchType: 'same_sheet', label, location, url: cleanEntry });
      }
    }
  };

  for (const sheet of state.sheets) {
    checkEntry(
      sheet.url,
      sheet.name,
      `Planilhas & Arquivos · ${sheet.category}`,
      exclude?.kind === 'sheet' && exclude.id === sheet.id,
    );
  }

  for (const portal of state.portals) {
    checkEntry(
      portal.url,
      portal.name,
      `${portal.kind} · ${portal.category}`,
      exclude?.kind === 'portal' && exclude.id === portal.id,
    );
  }

  const folders: FolderKey[] = ['rides', 'food'];
  for (const folder of folders) {
    const frontLabel = folder === 'rides' ? '99 Rides' : '99 Food';
    const listKeys: Array<'internos' | 'externos'> = ['internos', 'externos'];

    for (const listKey of listKeys) {
      const items = state.channels[folder][listKey];
      items.forEach((ch, idx) => {
        const sameChannel =
          exclude?.kind === 'channel' &&
          exclude.channelRef?.folder === folder &&
          exclude.channelRef?.listKey === listKey &&
          exclude.channelRef?.index === idx;

        checkEntry(
          ch.url,
          ch.name,
          `Canal ${frontLabel} (${ch.type})`,
          Boolean(sameChannel && (!exclude?.channelField || exclude.channelField === 'url')),
        );

        if (
          ch.monitorSheetUrl &&
          normalizeUrlForCompare(ch.monitorSheetUrl) !== normalizeUrlForCompare(ch.url)
        ) {
          checkEntry(
            ch.monitorSheetUrl,
            `${ch.name} (Planilha monitorada)`,
            `Canal ${frontLabel} (${ch.type})`,
            Boolean(sameChannel && exclude?.channelField === 'monitorSheetUrl'),
          );
        }
      });
    }

    const mediaPlan = state.channels[folder].mediaPlan;
    if (mediaPlan?.sheetUrl) {
      checkEntry(
        mediaPlan.sheetUrl,
        mediaPlan.sheetName || `Plano de Mídia — ${frontLabel}`,
        `Plano de Mídia · ${frontLabel}`,
        false,
      );
    }
  }

  for (const camp of state.activeCampaigns) {
    checkEntry(
      camp.sheetUrl,
      camp.name,
      `Campanha · ${camp.front}`,
      exclude?.kind === 'campaign' && exclude.id === camp.id,
    );

    for (const wave of camp.waves) {
      checkEntry(
        wave.planUrl,
        `${wave.planTitle} (${wave.waveName})`,
        `Plano na campanha "${camp.name}"`,
        exclude?.kind === 'wave' && exclude.id === wave.id,
      );
    }
  }

  return matches;
}

export async function hashNormalizedCsv(csvText: string): Promise<string> {
  const normalized = csvText.replace(/\r\n/g, '\n').trim();
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const bytes = new TextEncoder().encode(normalized);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return `sha256:${hex.slice(0, 32)}`;
    } catch {
      // fall through to deterministic hash
    }
  }

  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i += 1) {
    const c = normalized.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c ^ (i & 0xff);
    h2 = Math.imul(h2, 0x01000193);
  }
  return `fnv:${(h1 >>> 0).toString(16)}_${(h2 >>> 0).toString(16)}_${normalized.length}`;
}
