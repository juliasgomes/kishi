import bundledSeedData from '@/src/data/kishi-data.json';
import type { KishiCommonTask, KishiState, KishiTimeRule } from '@/src/types/kishi';
import { DEFAULT_TIME_RULES } from '@/src/utils/timeEstimator';
import { getBrasiliaTimeParts } from '@/src/utils/workHours';

const LOCAL_CACHE_KEY = 'kishi_storage_v1';

export function getFormattedToday(): string {
  return getBrasiliaTimeParts().formattedDate;
}

export function getFormattedTimeNow(): string {
  return getBrasiliaTimeParts().formattedHHMM;
}

export function getFormattedDateHeader(): string {
  return getBrasiliaTimeParts().formattedDateHeader;
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
    sheets: Array.isArray(raw?.sheets) ? raw.sheets : seed.sheets,
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
          notes: camp.notes || undefined,
          waves: Array.isArray(camp.waves) ? camp.waves : [],
          todos: Array.isArray(camp.todos) ? camp.todos : [],
        }))
      : [],
    channels: {
      rides: {
        common: normalizeCommonTasks(raw?.channels?.rides?.common ?? seed.channels.rides.common),
        internos: Array.isArray(raw?.channels?.rides?.internos)
          ? raw.channels.rides.internos
          : seed.channels.rides.internos,
        externos: Array.isArray(raw?.channels?.rides?.externos)
          ? raw.channels.rides.externos
          : seed.channels.rides.externos,
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
        internos: Array.isArray(raw?.channels?.food?.internos)
          ? raw.channels.food.internos
          : seed.channels.food.internos,
        externos: Array.isArray(raw?.channels?.food?.externos)
          ? raw.channels.food.externos
          : seed.channels.food.externos,
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
    tasks: Array.isArray(raw?.tasks) ? raw.tasks : [],
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
        ? normalizeTimeRules(raw.timeBank.timeRules)
        : DEFAULT_TIME_RULES,
    },
  };
  return base;
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

export async function fetchKishiState(): Promise<{ state: KishiState; source: 'repo' | 'bundled' }> {
  try {
    const response = await fetch('/api/data', { cache: 'no-store' });
    if (response.ok) {
      const parsed = (await response.json()) as Partial<KishiState>;
      const normalized = normalizeKishiState(parsed);
      try {
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(normalized));
      } catch {
        // ignore storage quota errors
      }
      return { state: normalized, source: 'repo' };
    }
  } catch {
    // fallback for static hosting without Node backend
  }

  try {
    const cached = localStorage.getItem(LOCAL_CACHE_KEY);
    if (cached) {
      return { state: normalizeKishiState(JSON.parse(cached)), source: 'bundled' };
    }
  } catch {
    // ignore invalid cache
  }

  return { state: normalizeKishiState(bundledSeedData as KishiState), source: 'bundled' };
}

export async function persistKishiState(nextState: KishiState): Promise<boolean> {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(nextState));
  } catch {
    // ignore storage quota errors
  }

  try {
    const response = await fetch('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextState),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function uploadSheetFile(file: File): Promise<{ url: string; note: string }> {
  const base64 = await readFileAsBase64(file);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentBase64: base64,
      }),
    });

    if (response.ok) {
      const result = (await response.json()) as { url: string };
      return {
        url: result.url,
        note: `${(file.size / 1024).toFixed(1)} KB • Salvo no código`,
      };
    }
  } catch {
    // static fallback below
  }

  return {
    url: base64,
    note: `${(file.size / 1024).toFixed(1)} KB • Arquivo Local`,
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

export async function syncGoogleSheetUrl(
  url: string,
): Promise<{ ok: boolean; csv?: string; requiresAuth?: boolean; error?: string }> {
  try {
    const response = await fetch('/api/sync-google-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = (await response.json()) as {
      ok?: boolean;
      csv?: string;
      requiresAuth?: boolean;
      error?: string;
    };
    return {
      ok: Boolean(data.ok),
      csv: data.csv,
      requiresAuth: data.requiresAuth,
      error: data.error,
    };
  } catch {
    return {
      ok: false,
      error: 'Erro ao conectar com o servidor local para ler a planilha.',
    };
  }
}
