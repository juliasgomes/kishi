import type { KishiWavePlan, WaveStatus } from '@/src/types/kishi';

export interface ParsedSheetRow {
  waveName: string;
  planTitle: string;
  planUrl?: string;
  startDate?: string;
  endDate?: string;
  status: WaveStatus;
  hasExplicitStatus?: boolean;
  totalValue?: string;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function detectWaveStatus(rawStatus: string): WaveStatus {
  const norm = normalizeText(rawStatus);
  if (!norm) return 'nao_extraido';
  if (
    norm.includes('nao') ||
    norm.includes('pendente') ||
    norm.includes('atualizar') ||
    norm.includes('vermelho') ||
    norm.includes('fazer') ||
    norm.includes('aguardando') ||
    norm.includes('revisar') ||
    norm.includes('faltando')
  ) {
    return 'nao_extraido';
  }
  if (
    norm.includes('extraid') ||
    norm === 'ok' ||
    norm.includes('concluid') ||
    norm.includes('atualizad') ||
    norm.includes('finalizad') ||
    norm.includes('pront') ||
    norm.includes('verde') ||
    norm === 'sim' ||
    norm === 'feito' ||
    norm === 'feita' ||
    norm === 'done'
  ) {
    return 'extraido';
  }
  return 'nao_extraido';
}

function isStatusLike(val: string): boolean {
  const norm = normalizeText(val);
  if (!norm) return false;
  return (
    norm === 'extraido' ||
    norm === 'nao extraido' ||
    norm.includes('extraid') ||
    norm.includes('concluid') ||
    norm === 'pendente' ||
    norm === 'atualizado' ||
    norm === 'atualizada' ||
    norm === 'atualizar' ||
    norm === 'feito' ||
    norm === 'feita' ||
    norm === 'ok' ||
    norm === 'sim' ||
    norm === 'nao'
  );
}

function isDateLike(val: string): boolean {
  const trimmed = val.trim();
  return (
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed) ||
    /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ||
    /^\d{1,2}-\d{1,2}-\d{2,4}$/.test(trimmed)
  );
}

function isMoneyLike(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith('R$') ||
    trimmed.startsWith('USD') ||
    trimmed.startsWith('$') ||
    /^\d{1,3}(\.\d{3})*(,\d{2})?$/.test(trimmed) ||
    /^\d+(\.\d{2})?$/.test(trimmed)
  );
}

function cleanListItemText(raw: string): string {
  return raw
    .trim()
    .replace(/^\[[ xX]?\]\s*/, '')
    .replace(/^(?:[-*•◦▪–—]+|\d+[.)])\s+/, '')
    .trim();
}

function extractInlineUrl(raw: string): { cleanText: string; url?: string } {
  const urlMatch = raw.match(/(https?:\/\/[^\s)<>]+)/i);
  if (!urlMatch) {
    return { cleanText: raw.trim() };
  }
  const url = urlMatch[1].replace(/[.,;]+$/, '');
  const withoutUrl = raw
    .replace(urlMatch[0], '')
    .replace(/\(\s*\)/g, '')
    .replace(/(?:\s*[-–—|:]\s*)$/, '')
    .replace(/^(?:\s*[-–—|:]\s*)/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return {
    cleanText: withoutUrl || url,
    url,
  };
}

const SINGLE_COL_HEADER_SET = new Set([
  'campanha',
  'campanhas',
  'wave',
  'waves',
  'plano',
  'planos',
  'plano de midia',
  'planos de midia',
  'nome',
  'nomes',
  'titulo',
  'titulos',
  'item',
  'itens',
  'lista',
  'listas',
  'acao',
  'acoes',
  'tarefa',
  'tarefas',
  'demanda',
  'demandas',
  'entrega',
  'entregas',
  'atividade',
  'atividades',
  'descricao',
]);

function isSingleColumnHeader(text: string): boolean {
  const norm = normalizeText(text);
  return SINGLE_COL_HEADER_SET.has(norm);
}

interface RawCell {
  text: string;
  href?: string;
}

interface HeaderColumnMap {
  waveIdx?: number;
  planIdx?: number;
  urlIdx?: number;
  startIdx?: number;
  endIdx?: number;
  statusIdx?: number;
  valueIdx?: number;
}

function detectHeaderMap(cells: RawCell[]): HeaderColumnMap | null {
  // A real table header never contains concrete data values like dates, money, URLs, or status badges
  const containsConcreteData = cells.some((c) => {
    const t = c.text.trim();
    if (!t) return false;
    return (
      Boolean(c.href) ||
      t.startsWith('http') ||
      isDateLike(t) ||
      isMoneyLike(t) ||
      isStatusLike(t) ||
      t.length > 55
    );
  });
  if (containsConcreteData) return null;

  const norms = cells.map((c) => normalizeText(c.text));
  const map: HeaderColumnMap = {};
  let matches = 0;

  norms.forEach((h, idx) => {
    if (!h) return;
    // Header labels do not look like compound file slugs with underscores
    if (h.includes('_')) return;

    if (
      h === 'wave' ||
      h.startsWith('wave ') ||
      h === 'campanha' ||
      h === 'campanhas' ||
      h.includes('identificador') ||
      h === 'nome' ||
      h === 'titulo' ||
      h === 'item' ||
      h === 'demanda' ||
      h === 'entrega' ||
      h === 'atividade'
    ) {
      if (map.waveIdx === undefined) {
        map.waveIdx = idx;
        matches++;
      } else if (map.planIdx === undefined) {
        map.planIdx = idx;
        matches++;
      }
    } else if (
      h.includes('link do plano') ||
      h.includes('plano de midia') ||
      h === 'plano' ||
      h === 'midia' ||
      h === 'acao' ||
      h === 'acoes' ||
      h === 'descricao' ||
      h === 'detalhe' ||
      h === 'detalhes'
    ) {
      if (map.planIdx === undefined) {
        map.planIdx = idx;
        matches++;
      }
    } else if (h === 'link' || h === 'url') {
      if (map.urlIdx === undefined) {
        map.urlIdx = idx;
        matches++;
      }
    } else if (
      h.includes('inicio') ||
      h.includes('start') ||
      h.includes('data inicial') ||
      h === 'data' ||
      h === 'prazo' ||
      h === 'periodo'
    ) {
      if (map.startIdx === undefined) {
        map.startIdx = idx;
        matches++;
      }
    } else if (
      h === 'fim' ||
      h.startsWith('fim ') ||
      h.includes('termino') ||
      h === 'end' ||
      h.includes('data final')
    ) {
      if (map.endIdx === undefined) {
        map.endIdx = idx;
        matches++;
      }
    } else if (
      h === 'status' ||
      h.startsWith('status ') ||
      h.includes('situacao') ||
      h.includes('extracao')
    ) {
      if (map.statusIdx === undefined) {
        map.statusIdx = idx;
        matches++;
      }
    } else if (
      h.includes('valor') ||
      h.includes('investimento') ||
      h.includes('budget') ||
      h.includes('valor total')
    ) {
      if (map.valueIdx === undefined) {
        map.valueIdx = idx;
        matches++;
      }
    }
  });

  const joined = norms.join(' ');
  const looksLikeHeader =
    matches >= 2 ||
    joined.includes('link do plano') ||
    (joined.includes('inicio') && joined.includes('fim')) ||
    (joined.includes('status') &&
      (joined.includes('plano') || joined.includes('campanha') || joined.includes('wave')));

  return looksLikeHeader ? map : null;
}

function isSummaryOrTitleRow(cells: RawCell[]): boolean {
  const nonEmpty = cells.filter((c) => c.text.trim().length > 0);
  if (nonEmpty.length === 0) return true;
  if (nonEmpty.length === 1 && !nonEmpty[0].href) {
    const t = normalizeText(nonEmpty[0].text);
    if (t === 'total' || t.startsWith('total geral') || isMoneyLike(nonEmpty[0].text)) {
      return true;
    }
  }
  const firstNorm = normalizeText(nonEmpty[0]?.text || '');
  if (
    (firstNorm === 'total' || firstNorm === 'total geral' || firstNorm === 'subtotal') &&
    nonEmpty.length <= 2
  ) {
    return true;
  }
  return false;
}

function mapRawCellsToRow(
  cells: RawCell[],
  headerMap: HeaderColumnMap | null,
  fallbackContext?: { waveName?: string; planTitle?: string },
): ParsedSheetRow | null {
  const nonEmptyCount = cells.filter((c) => c.text.trim().length > 0).length;
  if (nonEmptyCount === 0) return null;
  if (isSummaryOrTitleRow(cells)) return null;

  // If we have a detected header map and cells align with it, use it directly
  if (headerMap) {
    const getCell = (idx?: number) => (idx !== undefined ? cells[idx] : undefined);
    const waveCell = getCell(headerMap.waveIdx);
    const planCell = getCell(headerMap.planIdx);
    const urlCell = getCell(headerMap.urlIdx);
    const startCell = getCell(headerMap.startIdx);
    const endCell = getCell(headerMap.endIdx);
    const statusCell = getCell(headerMap.statusIdx);
    const valueCell = getCell(headerMap.valueIdx);

    const waveText = cleanListItemText(waveCell?.text || '');
    const planText = cleanListItemText(planCell?.text || '');
    const urlText = urlCell?.text.trim() || '';
    const inlineFromWave = extractInlineUrl(waveText);
    const inlineFromPlan = extractInlineUrl(planText);

    const explicitUrl =
      planCell?.href ||
      urlCell?.href ||
      (urlText.startsWith('http') ? urlText : undefined) ||
      (planText.startsWith('http') ? planText : undefined) ||
      inlineFromPlan.url ||
      inlineFromWave.url;

    const startVal = startCell?.text.trim() || undefined;
    const endVal = endCell?.text.trim() || undefined;
    const statusText = statusCell?.text.trim() || '';
    const hasExplicitStatus = headerMap.statusIdx !== undefined && Boolean(statusText);
    const valueVal = valueCell?.text.trim() || undefined;

    const cleanWave = inlineFromWave.cleanText;
    const cleanPlan = inlineFromPlan.cleanText;

    const hasMainIdentifier = Boolean(cleanWave || cleanPlan || explicitUrl);
    const hasDataFields = Boolean(startVal || endVal || statusText || valueVal);

    if (hasMainIdentifier || hasDataFields) {
      const resolvedWave =
        cleanWave || cleanPlan || fallbackContext?.waveName || 'Item';
      const resolvedPlan =
        cleanPlan || cleanWave || fallbackContext?.planTitle || resolvedWave;
      return {
        waveName: resolvedWave,
        planTitle: resolvedPlan,
        planUrl: explicitUrl,
        startDate: startVal,
        endDate: endVal,
        status: hasExplicitStatus ? detectWaveStatus(statusText) : 'nao_extraido',
        hasExplicitStatus,
        totalValue: valueVal,
      };
    }
  }

  // Fallback heuristic when header row wasn't copied/detected
  let statusIdx = -1;
  for (let i = cells.length - 1; i >= 0; i--) {
    if (isStatusLike(cells[i].text)) {
      statusIdx = i;
      break;
    }
  }

  const dateIndices: number[] = [];
  cells.forEach((c, idx) => {
    if (isDateLike(c.text)) dateIndices.push(idx);
  });

  // Case 1: Full 6-column format (Wave | Link do Plano | Início | Fim | Status | Valor)
  if (cells.length >= 5 && (dateIndices[0] === 2 || statusIdx === 4)) {
    const waveName = cleanListItemText(cells[0]?.text || '') || cleanListItemText(cells[1]?.text || '') || 'Wave';
    const planTitle = cleanListItemText(cells[1]?.text || '') || waveName;
    const planUrl =
      cells[1]?.href ||
      (cells[1]?.text.trim().startsWith('http') ? cells[1].text.trim() : undefined);
    const startDate = cells[2]?.text.trim() || undefined;
    const endDate = cells[3]?.text.trim() || undefined;
    const rawStatus = cells[4]?.text.trim() || '';
    const hasExplicitStatus = Boolean(rawStatus) && isStatusLike(rawStatus);
    const status = hasExplicitStatus ? detectWaveStatus(rawStatus) : 'nao_extraido';
    const totalValue = cells[5]?.text.trim() || undefined;
    return { waveName, planTitle, planUrl, startDate, endDate, status, hasExplicitStatus, totalValue };
  }

  // Case 2: Copied starting at Column B (Link do Plano | Início | Fim | Status | Valor)
  if (cells.length >= 4 && (dateIndices[0] === 1 || statusIdx === 3)) {
    const planTitle = cleanListItemText(cells[0]?.text || '') || 'Plano de Mídia';
    const planUrl =
      cells[0]?.href ||
      (cells[0]?.text.trim().startsWith('http') ? cells[0].text.trim() : undefined);
    const startDate = cells[1]?.text.trim() || undefined;
    const endDate = cells[2]?.text.trim() || undefined;
    const rawStatus = cells[3]?.text.trim() || '';
    const hasExplicitStatus = Boolean(rawStatus) && isStatusLike(rawStatus);
    const status = hasExplicitStatus ? detectWaveStatus(rawStatus) : 'nao_extraido';
    const totalValue = cells[4]?.text.trim() || undefined;
    return {
      waveName: planTitle,
      planTitle,
      planUrl,
      startDate,
      endDate,
      status,
      hasExplicitStatus,
      totalValue,
    };
  }

  // General fallback for arbitrary column layouts and plain lists (1 or more columns)
  const textCandidates = cells
    .map((c, idx) => ({ cell: c, idx }))
    .filter(
      ({ cell, idx }) =>
        cell.text.trim().length > 0 &&
        idx !== statusIdx &&
        !dateIndices.includes(idx) &&
        !isMoneyLike(cell.text),
    );

  if (textCandidates.length === 0) return null;

  const linkCandidate = textCandidates.find(({ cell }) => Boolean(cell.href));
  const firstCandidate = textCandidates[0];
  const secondCandidate = textCandidates[1];

  const firstCleaned = cleanListItemText(firstCandidate.cell.text);
  const secondCleaned = secondCandidate ? cleanListItemText(secondCandidate.cell.text) : '';
  const firstInline = extractInlineUrl(firstCleaned);
  const secondInline = secondCleaned ? extractInlineUrl(secondCleaned) : { cleanText: '' };

  // Avoid using a raw URL as the title when another text cell exists
  const firstIsOnlyUrl = firstCleaned.startsWith('http') && Boolean(secondInline.cleanText);
  const secondIsOnlyUrl = secondCleaned.startsWith('http');

  const waveName = firstIsOnlyUrl ? secondInline.cleanText : firstInline.cleanText;
  const planTitle =
    (linkCandidate ? extractInlineUrl(cleanListItemText(linkCandidate.cell.text)).cleanText : '') ||
    (!secondIsOnlyUrl && secondInline.cleanText ? secondInline.cleanText : '') ||
    waveName;

  if (!waveName && !planTitle) return null;

  const planUrl =
    linkCandidate?.cell.href ||
    cells.find((c) => c.href)?.href ||
    cells.find((c) => c.text.trim().startsWith('http'))?.text.trim() ||
    secondInline.url ||
    firstInline.url;

  const startDate = dateIndices[0] !== undefined ? cells[dateIndices[0]]?.text.trim() : undefined;
  const endDate = dateIndices[1] !== undefined ? cells[dateIndices[1]]?.text.trim() : undefined;
  const hasExplicitStatus = statusIdx >= 0;
  const status = hasExplicitStatus ? detectWaveStatus(cells[statusIdx].text) : 'nao_extraido';
  const valueCell = [...cells].reverse().find((c, revIdx) => {
    const origIdx = cells.length - 1 - revIdx;
    return origIdx !== statusIdx && !dateIndices.includes(origIdx) && isMoneyLike(c.text);
  });

  return {
    waveName: waveName || planTitle,
    planTitle: planTitle || waveName,
    planUrl,
    startDate,
    endDate,
    status,
    hasExplicitStatus,
    totalValue: valueCell?.text.trim() || undefined,
  };
}

export function parseGoogleSheetsHtml(html: string): ParsedSheetRow[] {
  if (!html || !html.includes('<tr')) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rows = Array.from(doc.querySelectorAll('tr'));

  // Expand rowspan/colspan so merged Google Sheets cells stay aligned per column
  const grid: RawCell[][] = [];
  rows.forEach((tr, rIdx) => {
    if (!grid[rIdx]) grid[rIdx] = [];
    const tds = Array.from(tr.querySelectorAll('td, th'));
    let colCursor = 0;

    for (const td of tds) {
      while (grid[rIdx][colCursor] !== undefined) {
        colCursor++;
      }
      const anchor = td.querySelector('a[href]');
      const cellData: RawCell = {
        text: (td.textContent || '').replace(/\s+/g, ' ').trim(),
        href: anchor?.getAttribute('href') || undefined,
      };
      const rowspan = Math.max(1, Number.parseInt(td.getAttribute('rowspan') || '1', 10) || 1);
      const colspan = Math.max(1, Number.parseInt(td.getAttribute('colspan') || '1', 10) || 1);

      for (let r = 0; r < rowspan; r++) {
        const targetRowIdx = rIdx + r;
        if (!grid[targetRowIdx]) grid[targetRowIdx] = [];
        for (let c = 0; c < colspan; c++) {
          // Only copy text/href into top cell of span or repeat wave identifier downwards cleanly
          grid[targetRowIdx][colCursor + c] =
            r === 0 && c === 0 ? cellData : r > 0 && c === 0 ? cellData : { text: '' };
        }
      }
      colCursor += colspan;
    }
  });

  // Scan top rows to locate header row first so banner/title rows above it don't create fake waves
  let headerRowIdx = -1;
  let headerMap: HeaderColumnMap | null = null;
  for (let i = 0; i < Math.min(grid.length, 15); i++) {
    const rowCells = (grid[i] || []).map((c) => c || { text: '' });
    const detected = detectHeaderMap(rowCells);
    if (detected) {
      headerMap = detected;
      headerRowIdx = i;
      break;
    }
  }

  const parsed: ParsedSheetRow[] = [];
  let startIdx = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
  if (
    headerRowIdx < 0 &&
    grid.length >= 2 &&
    grid[0]?.filter((c) => c?.text.trim()).length === 1 &&
    isSingleColumnHeader(grid[0].find((c) => c?.text.trim())?.text || '')
  ) {
    startIdx = 1;
  }

  let lastContext: { waveName?: string; planTitle?: string } = {};

  for (let i = startIdx; i < grid.length; i++) {
    const cells = grid[i];
    if (!cells || cells.length === 0) continue;
    const normalizedCells = cells.map((c) => c || { text: '' });
    if (headerMap && detectHeaderMap(normalizedCells)) {
      continue;
    }

    const mapped = mapRawCellsToRow(normalizedCells, headerMap, lastContext);
    if (mapped) {
      parsed.push(mapped);
      lastContext = { waveName: mapped.waveName, planTitle: mapped.planTitle };
    }
  }

  return parsed;
}

export function parseHtmlListItems(html: string): ParsedSheetRow[] {
  if (!html || !html.includes('<li')) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const items = Array.from(doc.querySelectorAll('li'));
  const parsed: ParsedSheetRow[] = [];

  for (const li of items) {
    const rawText = (li.textContent || '').replace(/\s+/g, ' ').trim();
    const cleaned = cleanListItemText(rawText);
    if (!cleaned || isSingleColumnHeader(cleaned)) continue;

    const anchor = li.querySelector('a[href]');
    const inline = extractInlineUrl(cleaned);
    const title = inline.cleanText || cleaned;
    const url = anchor?.getAttribute('href') || inline.url;

    parsed.push({
      waveName: title,
      planTitle: title,
      planUrl: url,
      status: 'nao_extraido',
      hasExplicitStatus: false,
    });
  }

  return parsed;
}

function detectDelimiter(rawText: string): string {
  const sampleLines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 10);

  if (sampleLines.length === 0) return '\t';

  let tabHits = 0;
  let semiHits = 0;
  let commaHits = 0;

  for (const line of sampleLines) {
    if (line.includes('\t')) tabHits++;
    if (line.includes(';')) semiHits++;
    if (line.includes(',')) commaHits++;
  }

  if (tabHits >= Math.max(1, Math.floor(sampleLines.length / 2))) return '\t';
  if (semiHits > commaHits && semiHits >= Math.max(1, Math.floor(sampleLines.length / 2))) {
    return ';';
  }
  if (commaHits >= Math.max(1, Math.ceil(sampleLines.length / 2))) return ',';
  if (semiHits > 0) return ';';
  return '\t';
}

// True RFC-4180 parser: preserves newlines inside quoted cells instead of breaking rows!
function parseDelimitedRecords(rawText: string, delimiter: string): string[][] {
  const cleaned = rawText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const records: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '"') {
      if (inQuotes && cleaned[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      row.push(field.replace(/\s+/g, ' ').trim());
      field = '';
    } else if (ch === '\n' && !inQuotes) {
      row.push(field.replace(/\s+/g, ' ').trim());
      if (row.some((cell) => cell.length > 0)) {
        records.push(row);
      }
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  row.push(field.replace(/\s+/g, ' ').trim());
  if (row.some((cell) => cell.length > 0)) {
    records.push(row);
  }

  return records;
}

export function parseDelimitedSheetText(rawText: string): ParsedSheetRow[] {
  const cleaned = rawText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!cleaned.trim()) return [];

  const delimiter = detectDelimiter(cleaned);
  const records = parseDelimitedRecords(cleaned, delimiter);
  if (records.length === 0) return [];

  // Scan top 15 rows to locate header row first so banner/title rows above it don't create fake waves
  let headerRowIdx = -1;
  let headerMap: HeaderColumnMap | null = null;
  for (let i = 0; i < Math.min(records.length, 15); i++) {
    const rowCells: RawCell[] = records[i].map((text) => ({ text }));
    const detected = detectHeaderMap(rowCells);
    if (detected) {
      headerMap = detected;
      headerRowIdx = i;
      break;
    }
  }

  const parsed: ParsedSheetRow[] = [];
  let startIdx = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
  if (
    headerRowIdx < 0 &&
    records.length >= 2 &&
    records[0].filter((c) => c.trim()).length === 1 &&
    isSingleColumnHeader(records[0].find((c) => c.trim()) || '')
  ) {
    startIdx = 1;
  }

  let lastContext: { waveName?: string; planTitle?: string } = {};

  for (let i = startIdx; i < records.length; i++) {
    const rawCells: RawCell[] = records[i].map((text) => ({ text }));
    if (headerMap && detectHeaderMap(rawCells)) {
      continue;
    }

    const mapped = mapRawCellsToRow(rawCells, headerMap, lastContext);
    if (mapped) {
      parsed.push(mapped);
      lastContext = { waveName: mapped.waveName, planTitle: mapped.planTitle };
    }
  }

  return parsed;
}

export function parseWaveDateTimestamp(dateStr?: string): number | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  // DD/MM/YYYY or DD/MM/YY
  const brMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (brMatch) {
    const day = Number.parseInt(brMatch[1], 10);
    const month = Number.parseInt(brMatch[2], 10) - 1;
    let year = Number.parseInt(brMatch[3], 10);
    if (year < 100) year += 2000;
    const ts = new Date(year, month, day).getTime();
    return Number.isNaN(ts) ? null : ts;
  }
  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = Number.parseInt(isoMatch[1], 10);
    const month = Number.parseInt(isoMatch[2], 10) - 1;
    const day = Number.parseInt(isoMatch[3], 10);
    const ts = new Date(year, month, day).getTime();
    return Number.isNaN(ts) ? null : ts;
  }
  return null;
}

function makeWaveSignature(w: {
  waveName?: string;
  planTitle?: string;
  startDate?: string;
  endDate?: string;
  totalValue?: string;
}): string {
  return [
    normalizeText(w.waveName || ''),
    normalizeText(w.planTitle || ''),
    normalizeText(w.startDate || ''),
    normalizeText(w.endDate || ''),
    normalizeText(w.totalValue || ''),
  ].join('|');
}

export function mergeParsedWaves(
  existing: KishiWavePlan[],
  incoming: ParsedSheetRow[],
): { waves: KishiWavePlan[]; added: number; updated: number } {
  const next = [...existing];
  const matchedExistingIndices = new Set<number>();
  let added = 0;
  let updated = 0;

  incoming.forEach((row, batchIdx) => {
    const rowSig = makeWaveSignature(row);
    const normTitle = normalizeText(row.planTitle);
    const normWave = normalizeText(row.waveName);

    let matchIdx = existing.findIndex(
      (w, idx) => !matchedExistingIndices.has(idx) && makeWaveSignature(w) === rowSig,
    );

    if (matchIdx < 0) {
      matchIdx = existing.findIndex(
        (w, idx) =>
          !matchedExistingIndices.has(idx) &&
          ((normTitle && normalizeText(w.planTitle) === normTitle && normalizeText(w.waveName) === normWave) ||
            (normTitle && normalizeText(w.planTitle) === normTitle)),
      );
    }

    if (matchIdx >= 0) {
      matchedExistingIndices.add(matchIdx);
      const prev = next[matchIdx];
      next[matchIdx] = {
        ...prev,
        waveName: row.waveName || prev.waveName,
        planTitle: row.planTitle || prev.planTitle,
        planUrl: row.planUrl || prev.planUrl,
        startDate: row.startDate || prev.startDate,
        endDate: row.endDate || prev.endDate,
        status: row.hasExplicitStatus ? row.status : prev.status,
        totalValue: row.totalValue || prev.totalValue,
        fromSheet: true,
      };
      updated++;
    } else {
      next.push({
        id: `wv_${Date.now()}_${batchIdx}_${Math.random().toString(36).slice(2, 6)}`,
        waveName: row.waveName,
        planTitle: row.planTitle,
        planUrl: row.planUrl,
        startDate: row.startDate,
        endDate: row.endDate,
        status: row.status,
        totalValue: row.totalValue,
        fromSheet: true,
      });
      added++;
    }
  });

  return { waves: next, added, updated };
}

// Live sync: mirrors the current rows of the sheet while preserving manually-created waves, captured URLs, and local status when the sheet has no explicit status column
export function syncWavesFromSheet(
  existing: KishiWavePlan[],
  incoming: ParsedSheetRow[],
): KishiWavePlan[] {
  const manualWaves = existing.filter((w) => w.fromSheet === false);
  const sheetExisting = existing.filter((w) => w.fromSheet !== false);
  const usedIndices = new Set<number>();

  const syncedFromSheet: KishiWavePlan[] = incoming.map((row, idx) => {
    const rowSig = makeWaveSignature(row);
    const normTitle = normalizeText(row.planTitle);
    const normWave = normalizeText(row.waveName);

    let matchIdx = sheetExisting.findIndex(
      (w, i) => !usedIndices.has(i) && makeWaveSignature(w) === rowSig,
    );
    if (matchIdx < 0) {
      matchIdx = sheetExisting.findIndex(
        (w, i) =>
          !usedIndices.has(i) &&
          ((normTitle && normalizeText(w.planTitle) === normTitle && normalizeText(w.waveName) === normWave) ||
            (normTitle && normalizeText(w.planTitle) === normTitle)),
      );
    }

    const matched = matchIdx >= 0 ? sheetExisting[matchIdx] : undefined;
    if (matchIdx >= 0) usedIndices.add(matchIdx);

    return {
      id: matched?.id || `wv_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      waveName: row.waveName,
      planTitle: row.planTitle,
      planUrl: row.planUrl || matched?.planUrl,
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.hasExplicitStatus ? row.status : (matched?.status ?? row.status),
      totalValue: row.totalValue,
      fromSheet: true,
    };
  });

  return [...syncedFromSheet, ...manualWaves];
}

export function haveWavesChanged(prev: KishiWavePlan[], next: KishiWavePlan[]): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (
      a.waveName !== b.waveName ||
      a.planTitle !== b.planTitle ||
      (a.planUrl || '') !== (b.planUrl || '') ||
      (a.startDate || '') !== (b.startDate || '') ||
      (a.endDate || '') !== (b.endDate || '') ||
      a.status !== b.status ||
      (a.totalValue || '') !== (b.totalValue || '')
    ) {
      return true;
    }
  }
  return false;
}


