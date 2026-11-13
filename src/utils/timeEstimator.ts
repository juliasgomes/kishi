import type {
  KishiActiveCampaign,
  KishiTask,
  KishiTimeBank,
  KishiTimeRule,
  KishiWavePlan,
} from '@/src/types/kishi';

export const DEFAULT_TIME_TAGS = [
  'Extração',
  'Plano de Mídia',
  'Conferência',
  'Relatório',
  'Canais',
  'Geral',
];

export const DEFAULT_TIME_RULES: KishiTimeRule[] = [
  {
    id: 'rule_extracao',
    label: 'Extração de Plano / Campanha',
    tag: 'Extração',
    keywords: ['extrair', 'extracao', 'wave', 'onda', 'campanha', 'plano'],
    minutes: 20,
    appliesTo: 'all',
  },
  {
    id: 'rule_plano_midia',
    label: 'Atualizar Plano de Mídia',
    tag: 'Plano de Mídia',
    keywords: ['plano', 'midia', 'revisao', 'aba', 'investimento'],
    minutes: 15,
    appliesTo: 'all',
  },
  {
    id: 'rule_conferencia',
    label: 'Conferência de Canais / Base',
    tag: 'Conferência',
    keywords: ['conferir', 'validar', 'checar', 'divergencia', 'base', 'uol', 'logan', 'canal'],
    minutes: 15,
    appliesTo: 'all',
  },
  {
    id: 'rule_relatorio',
    label: 'Relatório / Fechamento',
    tag: 'Relatório',
    keywords: ['relatorio', 'fechamento', 'cpb', 'drive', 'report'],
    minutes: 25,
    appliesTo: 'all',
  },
];

const STOP_WORDS = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'para',
  'pra',
  'com',
  'em',
  'na',
  'no',
  'nas',
  'nos',
  'a',
  'o',
  'as',
  'os',
  'e',
  'ou',
  'que',
  'se',
  'por',
  'um',
  'uma',
]);

const STEM_MAP: Record<string, string> = {
  extrair: 'extrai',
  extracao: 'extrai',
  extracoes: 'extrai',
  extraido: 'extrai',
  extraida: 'extrai',
  extraidos: 'extrai',
  campanha: 'campanha',
  campanhas: 'campanha',
  plano: 'plano',
  planos: 'plano',
  midia: 'midia',
  midias: 'midia',
  relatorio: 'relatori',
  relatorios: 'relatori',
  report: 'relatori',
  conferir: 'confer',
  conferencia: 'confer',
  validar: 'confer',
  validacao: 'confer',
  checar: 'confer',
  revisar: 'confer',
  revisao: 'confer',
  divergencia: 'diverg',
  divergencias: 'diverg',
  atualizar: 'atualiz',
  atualizacao: 'atualiz',
  canal: 'canal',
  canais: 'canal',
  externo: 'extern',
  externos: 'extern',
  interno: 'intern',
  internos: 'intern',
  disparo: 'dispar',
  disparos: 'dispar',
  disparar: 'dispar',
  criativo: 'criativ',
  criativos: 'criativ',
  subir: 'subir',
  subida: 'subir',
  upload: 'subir',
  wave: 'wave',
  waves: 'wave',
  onda: 'wave',
  ondas: 'wave',
  base: 'base',
  bases: 'base',
  fechamento: 'fechament',
  fechar: 'fechament',
};

export function normalizeMatchText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemToken(token: string): string {
  if (STEM_MAP[token]) return STEM_MAP[token];
  if (token.length > 5 && token.endsWith('s')) {
    const singular = token.slice(0, -1);
    if (STEM_MAP[singular]) return STEM_MAP[singular];
    return singular;
  }
  return token;
}

export function tokenizeOperationalText(text: string): string[] {
  const norm = normalizeMatchText(text);
  if (!norm) return [];
  const tokens = norm
    .split(' ')
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t))
    .map(stemToken);
  return Array.from(new Set(tokens));
}

export interface RuleMatchResult {
  rule: KishiTimeRule | null;
  matchType: 'manual' | 'tag' | 'smart' | 'default' | 'none';
  score: number;
}

export function matchTimeRule(
  text: string,
  explicitTag: string | undefined,
  rules: KishiTimeRule[],
  scope: 'tasks' | 'extractions',
): RuleMatchResult {
  const eligible = rules.filter(
    (r) => !r.appliesTo || r.appliesTo === 'all' || r.appliesTo === scope,
  );
  if (eligible.length === 0) {
    return { rule: null, matchType: 'none', score: 0 };
  }

  // 1. Exact tag / etiqueta match
  const normTag = normalizeMatchText(explicitTag || '');
  if (normTag) {
    const byTag = eligible.find((r) => normalizeMatchText(r.tag) === normTag);
    if (byTag) {
      return { rule: byTag, matchType: 'tag', score: 1 };
    }
  }

  // 2. Smart name / keyword matching
  const normInput = normalizeMatchText(text);
  const inputTokens = tokenizeOperationalText(text);
  if (!normInput || inputTokens.length === 0) {
    return { rule: null, matchType: 'none', score: 0 };
  }

  let bestRule: KishiTimeRule | null = null;
  let bestScore = 0;

  for (const rule of eligible) {
    const normLabel = normalizeMatchText(rule.label);
    const normRuleTag = normalizeMatchText(rule.tag);
    let score = 0;

    if (normLabel && (normInput.includes(normLabel) || normLabel.includes(normInput))) {
      score = Math.max(score, 0.95);
    }
    if (normRuleTag && normRuleTag.length >= 3 && normInput.includes(normRuleTag)) {
      score = Math.max(score, 0.8);
    }

    const ruleTokens = tokenizeOperationalText(
      `${rule.label} ${rule.tag} ${(rule.keywords || []).join(' ')}`,
    );
    const keywordTokens = new Set(tokenizeOperationalText((rule.keywords || []).join(' ')));

    let hits = 0;
    let keywordHits = 0;
    for (const tk of inputTokens) {
      if (ruleTokens.includes(tk)) {
        hits += 1;
        if (keywordTokens.has(tk)) keywordHits += 1;
      }
    }

    if (hits > 0) {
      const unionSize = new Set([...inputTokens, ...ruleTokens]).size;
      const jaccard = hits / Math.max(1, unionSize);
      const coverage = hits / Math.max(1, Math.min(inputTokens.length, ruleTokens.length));
      const tokenScore = Math.min(
        0.92,
        coverage * 0.55 + jaccard * 0.25 + Math.min(keywordHits, 2) * 0.14,
      );
      score = Math.max(score, tokenScore);
    }

    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  if (bestRule && bestScore >= 0.34) {
    return { rule: bestRule, matchType: 'smart', score: bestScore };
  }

  return { rule: null, matchType: 'none', score: 0 };
}

export interface EstimatedTaskItem {
  task: KishiTask;
  minutes: number;
  matchType: 'manual' | 'tag' | 'smart' | 'default';
  matchedRule: KishiTimeRule | null;
}

export interface EstimatedWaveItem {
  campaignId: string;
  campaignName: string;
  front: '99 Rides' | '99 Food';
  wave: KishiWavePlan;
  minutes: number;
  matchType: 'manual' | 'tag' | 'smart' | 'default' | 'none';
  matchedRule: KishiTimeRule | null;
}

export interface EstimatedTodoItem {
  campaignId: string;
  campaignName: string;
  todoId: string;
  text: string;
  minutes: number;
  matchType: 'tag' | 'smart' | 'default' | 'none';
  matchedRule: KishiTimeRule | null;
}

export interface WorkspaceTimeEstimate {
  taskEstimates: EstimatedTaskItem[];
  waveEstimates: EstimatedWaveItem[];
  todoEstimates: EstimatedTodoItem[];
  tasksMinutes: number;
  wavesMinutes: number;
  todosMinutes: number;
  totalEstimatedMinutes: number;
}

export function getAllAvailableTags(timeBank: KishiTimeBank, tasks: KishiTask[] = []): string[] {
  const set = new Set<string>(DEFAULT_TIME_TAGS);
  for (const r of timeBank.timeRules || []) {
    if (r.tag?.trim()) set.add(r.tag.trim());
  }
  for (const t of tasks) {
    if (t.tag?.trim()) set.add(t.tag.trim());
  }
  return Array.from(set);
}

export function estimateWorkspaceTime(params: {
  tasks: KishiTask[];
  activeCampaigns: KishiActiveCampaign[];
  timeBank: KishiTimeBank;
}): WorkspaceTimeEstimate {
  const { tasks, activeCampaigns, timeBank } = params;
  const rules = timeBank.timeRules || [];

  const pendingTasks = tasks.filter((t) => t.status !== 'concluido');
  const taskEstimates: EstimatedTaskItem[] = pendingTasks.map((task) => {
    if (typeof task.estimatedMinutes === 'number' && task.estimatedMinutes >= 0) {
      return {
        task,
        minutes: task.estimatedMinutes,
        matchType: 'manual',
        matchedRule: null,
      };
    }

    const searchText = [task.title, task.channelName, task.product, task.subBrand]
      .filter(Boolean)
      .join(' ');
    const matched = matchTimeRule(searchText, task.tag, rules, 'tasks');
    if (matched.rule) {
      return {
        task,
        minutes: matched.rule.minutes,
        matchType: matched.matchType === 'tag' ? 'tag' : 'smart',
        matchedRule: matched.rule,
      };
    }

    return {
      task,
      minutes: Math.max(0, timeBank.defaultTaskMinutes || 0),
      matchType: 'default',
      matchedRule: null,
    };
  });

  const waveEstimates: EstimatedWaveItem[] = [];
  const todoEstimates: EstimatedTodoItem[] = [];

  for (const campaign of activeCampaigns) {
    for (const wave of campaign.waves) {
      if (wave.status !== 'nao_extraido') continue;

      if (typeof wave.estimatedMinutes === 'number' && wave.estimatedMinutes >= 0) {
        waveEstimates.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          front: campaign.front,
          wave,
          minutes: wave.estimatedMinutes,
          matchType: 'manual',
          matchedRule: null,
        });
        continue;
      }

      const waveText = [
        wave.waveName,
        wave.planTitle,
        campaign.name,
        campaign.front,
        'extrair extracao',
      ]
        .filter(Boolean)
        .join(' ');
      const matched = matchTimeRule(
        waveText,
        wave.tag || 'Extração',
        rules,
        'extractions',
      );
      if (matched.rule) {
        waveEstimates.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          front: campaign.front,
          wave,
          minutes: matched.rule.minutes,
          matchType: matched.matchType === 'tag' ? 'tag' : 'smart',
          matchedRule: matched.rule,
        });
      } else if ((timeBank.defaultWaveMinutes || 0) > 0) {
        waveEstimates.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          front: campaign.front,
          wave,
          minutes: timeBank.defaultWaveMinutes,
          matchType: 'default',
          matchedRule: null,
        });
      } else {
        waveEstimates.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          front: campaign.front,
          wave,
          minutes: 0,
          matchType: 'none',
          matchedRule: null,
        });
      }
    }

    for (const todo of campaign.todos) {
      if (todo.done) continue;
      const todoText = [todo.text, todo.waveRef, campaign.name, campaign.front]
        .filter(Boolean)
        .join(' ');
      const matched = matchTimeRule(todoText, undefined, rules, 'tasks');
      if (matched.rule) {
        todoEstimates.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          todoId: todo.id,
          text: todo.text,
          minutes: matched.rule.minutes,
          matchType: matched.matchType === 'tag' ? 'tag' : 'smart',
          matchedRule: matched.rule,
        });
      } else if ((timeBank.defaultTodoMinutes || 0) > 0) {
        todoEstimates.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          todoId: todo.id,
          text: todo.text,
          minutes: timeBank.defaultTodoMinutes,
          matchType: 'default',
          matchedRule: null,
        });
      } else {
        todoEstimates.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          todoId: todo.id,
          text: todo.text,
          minutes: 0,
          matchType: 'none',
          matchedRule: null,
        });
      }
    }
  }

  const tasksMinutes = taskEstimates.reduce((acc, item) => acc + item.minutes, 0);
  const wavesMinutes = waveEstimates.reduce((acc, item) => acc + item.minutes, 0);
  const todosMinutes = todoEstimates.reduce((acc, item) => acc + item.minutes, 0);

  return {
    taskEstimates,
    waveEstimates,
    todoEstimates,
    tasksMinutes,
    wavesMinutes,
    todosMinutes,
    totalEstimatedMinutes: tasksMinutes + wavesMinutes + todosMinutes,
  };
}
