import bundledSeedData from '@/src/data/kishi-data.json';
import type {
  KishiChannel,
  KishiCommonTask,
  KishiState,
  KishiTask,
  KishiTimeRule,
  SheetResourceKind,
} from '@/src/types/kishi';
import {
  isValidResourceKind,
  suggestResourceKindFromUrl,
} from '@/src/utils/resourceKind';
import { detectCategoryFromText } from '@/src/utils/sheetParser';
import { DEFAULT_TIME_RULES } from '@/src/utils/timeEstimator';
import { getBrasiliaTimeParts } from '@/src/utils/workHours';

const LEGACY_LOCAL_CACHE_KEY = 'kishi_storage_v1';
const LOCAL_CACHE_PREFIX = 'kishi_ws_v2_';

function getLocalCacheKey(uid?: string): string | null {
  if (!uid || !uid.trim()) return null;
  return `${LOCAL_CACHE_PREFIX}${uid.trim()}`;
}

export function clearSensitiveLocalCaches(uid?: string): void {
  try {
    localStorage.removeItem(LEGACY_LOCAL_CACHE_KEY);
    localStorage.removeItem('kishi_mural_collapsed_v1');
    if (uid) {
      localStorage.removeItem(`${LOCAL_CACHE_PREFIX}${uid.trim()}`);
    }
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore storage errors
  }
  try {
    sessionStorage.clear();
  } catch {
    // ignore sessionStorage errors
  }
}

export function getFormattedToday(): string {
  return getBrasiliaTimeParts().formattedDate;
}

export function getFormattedTimeNow(): string {
  return getBrasiliaTimeParts().formattedHHMM;
}

export function getFormattedDateHeader(): string {
  return getBrasiliaTimeParts().formattedDateHeader;
}

function normalizeChannelList(
  items: unknown,
  fallbackType: 'Interno' | 'Externo',
): KishiChannel[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      name: String(item.name || '').trim(),
      url: String(item.url || '').trim(),
      type:
        item.type === 'Interno' || item.type === 'Externo'
          ? item.type
          : fallbackType,
      monitorSheetUrl:
        typeof item.monitorSheetUrl === 'string' && item.monitorSheetUrl.trim()
          ? item.monitorSheetUrl.trim()
          : undefined,
      watchChanges: Boolean(item.watchChanges),
      lastCsvHash:
        typeof item.lastCsvHash === 'string' && item.lastCsvHash.trim()
          ? item.lastCsvHash.trim()
          : undefined,
      lastSyncedAt:
        typeof item.lastSyncedAt === 'string' && item.lastSyncedAt.trim()
          ? item.lastSyncedAt.trim()
          : undefined,
      lastVerifiedAt:
        typeof item.lastVerifiedAt === 'string' && item.lastVerifiedAt.trim()
          ? item.lastVerifiedAt.trim()
          : undefined,
    }))
    .filter((ch) => Boolean(ch.name));
}

export function normalizeKishiState(raw: Partial<KishiState> | null | undefined): KishiState {
  const seed = bundledSeedData as KishiState;
  const base: KishiState = {
    lastDateStr: raw?.lastDateStr || seed.lastDateStr || getFormattedToday(),
    user: {
      name: raw?.user?.name || seed.user.name || 'Júlia',
      initial: (raw?.user?.initial || seed.user.initial || 'J').toUpperCase(),
      role: raw?.user?.role || seed.user.role || 'Operação 99 Food & Rides',
    },
    portals: Array.isArray(raw?.portals) ? raw.portals : seed.portals,
    sheets: Array.isArray(raw?.sheets)
      ? raw.sheets.map((sh) => ({
          ...sh,
          resourceKind: isValidResourceKind(sh.resourceKind) ? sh.resourceKind : undefined,
          autoSyncMeta:
            typeof sh.autoSyncMeta === 'boolean'
              ? sh.autoSyncMeta
              : sh.type === 'link',
          lastSheetTitle:
            typeof sh.lastSheetTitle === 'string' && sh.lastSheetTitle.trim()
              ? sh.lastSheetTitle.trim()
              : undefined,
          lastSyncedAt:
            typeof sh.lastSyncedAt === 'string' && sh.lastSyncedAt.trim()
              ? sh.lastSyncedAt.trim()
              : undefined,
        }))
      : seed.sheets,
    campaigns: {
      drv: Array.isArray(raw?.campaigns?.drv) ? raw.campaigns.drv : [],
      food: Array.isArray(raw?.campaigns?.food) ? raw.campaigns.food : [],
    },
    activeCampaigns: Array.isArray(raw?.activeCampaigns)
      ? raw.activeCampaigns.map((camp) => ({
          id: camp.id || `ac_${Date.now()}`,
          name: camp.name || 'Campanha',
          front: camp.front === '99 Food' ? '99 Food' : '99 Rides',
          sheetUrl: camp.sheetUrl || undefined,
          autoSync:
            typeof camp.autoSync === 'boolean'
              ? camp.autoSync
              : Boolean(camp.sheetUrl),
          lastSyncedAt: camp.lastSyncedAt || undefined,
          lastSheetTitle:
            typeof camp.lastSheetTitle === 'string' && camp.lastSheetTitle.trim()
              ? camp.lastSheetTitle.trim()
              : undefined,
          notes: camp.notes || undefined,
          waves: Array.isArray(camp.waves) ? camp.waves : [],
          todos: Array.isArray(camp.todos) ? camp.todos : [],
        }))
      : [],
    channels: {
      rides: {
        common: normalizeCommonTasks(raw?.channels?.rides?.common ?? seed.channels.rides.common),
        internos: normalizeChannelList(
          raw?.channels?.rides?.internos ?? seed.channels.rides.internos,
          'Interno',
        ),
        externos: normalizeChannelList(
          raw?.channels?.rides?.externos ?? seed.channels.rides.externos,
          'Externo',
        ),
        mediaPlan: {
          sheetName:
            raw?.channels?.rides?.mediaPlan?.sheetName ?? seed.channels.rides.mediaPlan.sheetName,
          sheetUrl:
            raw?.channels?.rides?.mediaPlan?.sheetUrl ?? seed.channels.rides.mediaPlan.sheetUrl,
          revisions: Array.isArray(raw?.channels?.rides?.mediaPlan?.revisions)
            ? raw.channels.rides.mediaPlan.revisions
            : [],
        },
      },
      food: {
        common: normalizeCommonTasks(raw?.channels?.food?.common ?? seed.channels.food.common),
        internos: normalizeChannelList(
          raw?.channels?.food?.internos ?? seed.channels.food.internos,
          'Interno',
        ),
        externos: normalizeChannelList(
          raw?.channels?.food?.externos ?? seed.channels.food.externos,
          'Externo',
        ),
        mediaPlan: {
          sheetName:
            raw?.channels?.food?.mediaPlan?.sheetName ?? seed.channels.food.mediaPlan.sheetName,
          sheetUrl:
            raw?.channels?.food?.mediaPlan?.sheetUrl ?? seed.channels.food.mediaPlan.sheetUrl,
          revisions: Array.isArray(raw?.channels?.food?.mediaPlan?.revisions)
            ? raw.channels.food.mediaPlan.revisions
            : [],
        },
      },
    },
    tasks: Array.isArray(raw?.tasks)
      ? raw.tasks.map((t: KishiTask) => {
          const cleanTag = (t.tag || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
          if (cleanTag === 'conferencia') {
            return { ...t, tag: undefined };
          }
          return t;
        })
      : [],
    history: Array.isArray(raw?.history) ? raw.history : [],
    timeBank: {
      workStart:
        typeof raw?.timeBank?.workStart === 'string' && /^\d{2}:\d{2}$/.test(raw.timeBank.workStart)
          ? raw.timeBank.workStart
          : '09:00',
      workEnd:
        typeof raw?.timeBank?.workEnd === 'string' && /^\d{2}:\d{2}$/.test(raw.timeBank.workEnd)
          ? raw.timeBank.workEnd
          : '18:00',
      breakMinutes:
        typeof raw?.timeBank?.breakMinutes === 'number' && raw.timeBank.breakMinutes >= 0
          ? raw.timeBank.breakMinutes
          : 60,
      extraBankMinutes:
        typeof raw?.timeBank?.extraBankMinutes === 'number'
          ? raw.timeBank.extraBankMinutes
          : 0,
      defaultTaskMinutes:
        typeof raw?.timeBank?.defaultTaskMinutes === 'number' && raw.timeBank.defaultTaskMinutes >= 0
          ? raw.timeBank.defaultTaskMinutes
          : 15,
      defaultWaveMinutes:
        typeof raw?.timeBank?.defaultWaveMinutes === 'number' && raw.timeBank.defaultWaveMinutes >= 0
          ? raw.timeBank.defaultWaveMinutes
          : 0,
      defaultTodoMinutes:
        typeof raw?.timeBank?.defaultTodoMinutes === 'number' && raw.timeBank.defaultTodoMinutes >= 0
          ? raw.timeBank.defaultTodoMinutes
          : 0,
      timeRules: Array.isArray(raw?.timeBank?.timeRules)
        ? normalizeTimeRules(raw.timeBank.timeRules).filter(
            (r) =>
              r.id !== 'rule_conferencia' &&
              r.tag
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim()
                .toLowerCase() !== 'conferencia',
          )
        : DEFAULT_TIME_RULES,
      sheetColorLabels: normalizeSheetColorLabels(raw?.timeBank?.sheetColorLabels),
    },
  };
  return base;
}

function normalizeSheetColorLabels(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key === 'string' && typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed) out[key] = trimmed;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeTimeRules(items: unknown[]): KishiTimeRule[] {
  return items
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => ({
      id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `rule_${idx}_${Date.now()}`,
      label: typeof item.label === 'string' && item.label.trim() ? item.label.trim() : 'Atividade',
      tag: typeof item.tag === 'string' && item.tag.trim() ? item.tag.trim() : 'Geral',
      keywords: Array.isArray(item.keywords)
        ? item.keywords.map((k) => String(k || '').trim()).filter(Boolean)
        : [],
      minutes:
        typeof item.minutes === 'number' && Number.isFinite(item.minutes) && item.minutes >= 0
          ? item.minutes
          : 15,
      appliesTo:
        item.appliesTo === 'tasks' || item.appliesTo === 'extractions' ? item.appliesTo : 'all',
    }));
}

function normalizeCommonTasks(items: unknown[]): KishiCommonTask[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === 'string') {
      return { title: item, done: false };
    }
    const obj = item as Partial<KishiCommonTask>;
    return {
      title: String(obj.title || ''),
      done: Boolean(obj.done),
    };
  });
}

export async function fetchKishiState(
  uid?: string,
): Promise<{ state: KishiState; source: 'repo' | 'bundled' }> {
  const cacheKey = getLocalCacheKey(uid);
  if (cacheKey) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return { state: normalizeKishiState(JSON.parse(cached)), source: 'bundled' };
      }
      // Remove any legacy unscoped cache from prior builds
      localStorage.removeItem(LEGACY_LOCAL_CACHE_KEY);
    } catch {
      // ignore invalid cache
    }
  }

  return { state: normalizeKishiState(bundledSeedData as KishiState), source: 'bundled' };
}

export async function persistKishiState(nextState: KishiState, uid?: string): Promise<boolean> {
  const cacheKey = getLocalCacheKey(uid);
  if (!cacheKey) return false;
  try {
    localStorage.setItem(cacheKey, JSON.stringify(nextState));
    return true;
  } catch {
    return false;
  }
}

export async function uploadSheetFile(file: File): Promise<{ url: string; note: string }> {
  const base64 = await readFileAsBase64(file);
  return {
    url: base64,
    note: `${(file.size / 1024).toFixed(1)} KB • Arquivo Privado (Nuvem)`,
  };
}

export async function deleteUploadedSheetFile(url: string): Promise<void> {
  if (!url.startsWith('/uploads/')) return;
  const filename = url.replace('/uploads/', '');
  try {
    await fetch(`/api/upload/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
  } catch {
    // ignore if static host
  }
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

function extractGoogleSheetInfo(rawUrl: string): {
  ok: true;
  pubId?: string;
  sheetId?: string;
  gid: string;
} | {
  ok: false;
  error: string;
} {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { ok: false, error: 'URL inválida.' };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: 'Formato de URL inválido.' };
  }

  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'docs.google.com') {
    return {
      ok: false,
      error: 'Informe um link válido do Google Sheets (https://docs.google.com/spreadsheets/...).',
    };
  }

  const pubMatch = parsedUrl.pathname.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
  const idMatch = parsedUrl.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!pubMatch && !idMatch) {
    return {
      ok: false,
      error: 'Não foi possível identificar o ID da planilha no link informado.',
    };
  }

  const hashGidMatch = parsedUrl.hash.match(/gid=(\d+)/);
  const gid = parsedUrl.searchParams.get('gid') || hashGidMatch?.[1] || '';

  return {
    ok: true,
    pubId: pubMatch?.[1],
    sheetId: pubMatch ? undefined : idMatch?.[1],
    gid,
  };
}

function parseHeaderDocTitle(header: string | null): string | undefined {
  if (!header) return undefined;
  const utf8Match = header.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  let raw = utf8Match?.[1];
  if (raw) {
    try {
      raw = decodeURIComponent(raw);
    } catch {
      // keep raw
    }
  } else {
    const asciiMatch =
      header.match(/filename\s*=\s*"([^"]+)"/i) || header.match(/filename\s*=\s*([^;]+)/i);
    raw = asciiMatch?.[1]?.trim();
  }
  if (!raw) return undefined;
  return raw.replace(/\.(csv|tsv|xlsx|xls)$/i, '').trim() || undefined;
}

export interface SyncGoogleSheetResult {
  ok: boolean;
  csv?: string;
  docTitle?: string;
  detectedCategory?: '99' | '99 Rides' | '99 Food';
  requiresAuth?: boolean;
  error?: string;
}

async function fetchGoogleSheetDirectInBrowser(
  info: { pubId?: string; sheetId?: string; gid: string },
): Promise<SyncGoogleSheetResult> {
  const candidates = info.pubId
    ? [
        `https://docs.google.com/spreadsheets/d/e/${info.pubId}/pub?output=csv${
          info.gid ? `&gid=${info.gid}&single=true` : ''
        }&_t=${Date.now()}`,
      ]
    : [
        `https://docs.google.com/spreadsheets/d/${info.sheetId}/gviz/tq?tqx=out:csv${
          info.gid ? `&gid=${info.gid}` : ''
        }`,
        `https://docs.google.com/spreadsheets/d/${info.sheetId}/export?format=csv${
          info.gid ? `&gid=${info.gid}` : ''
        }&_t=${Date.now()}`,
      ];

  let sawLoginWall = false;

  for (const candidateUrl of candidates) {
    try {
      const response = await fetch(candidateUrl, {
        redirect: 'follow',
        cache: 'no-store',
      });
      const contentType = response.headers.get('content-type') || '';
      const finalUrl = response.url || '';
      const docTitle = parseHeaderDocTitle(response.headers.get('content-disposition'));
      const bodyText = await response.text();

      if (
        !response.ok ||
        finalUrl.includes('accounts.google.com') ||
        contentType.includes('text/html') ||
        bodyText.trimStart().startsWith('<!DOCTYPE') ||
        bodyText.trimStart().startsWith('<html')
      ) {
        sawLoginWall = true;
        continue;
      }

      if (bodyText.trim()) {
        const csvHead = bodyText.split('\n').slice(0, 6).join(' ');
        const detectedCategory = detectCategoryFromText(docTitle, csvHead);
        return { ok: true, csv: bodyText, docTitle, detectedCategory };
      }
    } catch {
      // Blocked by CORS or network when sheet requires Google login
    }
  }

  return {
    ok: false,
    requiresAuth: true,
    error: sawLoginWall
      ? 'Esta planilha exige login corporativo (restrita). Selecione as linhas no Google Sheets (Ctrl+C) e cole abaixo (Ctrl+V), ou importe o arquivo CSV.'
      : 'Não foi possível ler o link direto (verifique se a planilha está liberada como "Qualquer pessoa com o link" ou publicada na web). Se preferir, copie as linhas (Ctrl+C) e cole abaixo (Ctrl+V) ou clique em "Subir CSV".',
  };
}

export async function syncGoogleSheetUrl(url: string): Promise<SyncGoogleSheetResult> {
  const parsed = extractGoogleSheetInfo(url);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  try {
    const response = await fetch('/api/sync-google-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = (await response.json()) as {
        ok?: boolean;
        csv?: string;
        docTitle?: string;
        requiresAuth?: boolean;
        error?: string;
      };
      const csvHead = data.csv ? data.csv.split('\n').slice(0, 6).join(' ') : '';
      const detectedCategory = detectCategoryFromText(data.docTitle, csvHead);
      return {
        ok: Boolean(data.ok),
        csv: data.csv,
        docTitle: data.docTitle,
        detectedCategory,
        requiresAuth: data.requiresAuth,
        error: data.error,
      };
    }
  } catch {
    // Static host (e.g. GitHub Pages) has no /api server — fall back to direct browser fetch
  }

  return fetchGoogleSheetDirectInBrowser(parsed);
}

export interface InspectGoogleLinkResult {
  ok: boolean;
  title?: string;
  resourceKind: Exclude<SheetResourceKind, 'arquivo'>;
  category?: '99' | '99 Rides' | '99 Food';
  requiresAuth?: boolean;
}

export async function inspectGoogleResourceLink(
  url: string,
): Promise<InspectGoogleLinkResult> {
  const fallbackKind = suggestResourceKindFromUrl(url);

  try {
    const response = await fetch('/api/inspect-google-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = (await response.json()) as {
        ok?: boolean;
        title?: string;
        resourceKind?: Exclude<SheetResourceKind, 'arquivo'>;
        category?: '99' | '99 Rides' | '99 Food';
        requiresAuth?: boolean;
      };
      if (data.ok) {
        return {
          ok: true,
          title: data.title,
          resourceKind: data.resourceKind || fallbackKind,
          category: data.category,
          requiresAuth: data.requiresAuth,
        };
      }
    }
  } catch {
    // Static host fallback below
  }

  if (fallbackKind === 'planilha') {
    const sheetRes = await syncGoogleSheetUrl(url);
    if (sheetRes.ok) {
      return {
        ok: true,
        title: sheetRes.docTitle,
        resourceKind: 'planilha',
        category: sheetRes.detectedCategory,
      };
    }
  }

  return {
    ok: false,
    resourceKind: fallbackKind,
    category: detectCategoryFromText(url),
  };
}
