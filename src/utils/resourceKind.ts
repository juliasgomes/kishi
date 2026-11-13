export type SheetResourceKind =
  | 'planilha'
  | 'drive'
  | 'doc'
  | 'apresentacao'
  | 'arquivo';

export const LINK_RESOURCE_KINDS: Array<{
  id: Exclude<SheetResourceKind, 'arquivo'>;
  label: string;
}> = [
  { id: 'planilha', label: 'Planilha' },
  { id: 'drive', label: 'Drive' },
  { id: 'doc', label: 'Doc' },
  { id: 'apresentacao', label: 'Apresentação' },
];

export interface ResourceKindMeta {
  id: SheetResourceKind;
  label: string;
  badgeClass: string;
  iconBoxClass: string;
}

const VALID_RESOURCE_KINDS = new Set<SheetResourceKind>([
  'planilha',
  'drive',
  'doc',
  'apresentacao',
  'arquivo',
]);

export function isValidResourceKind(value: unknown): value is SheetResourceKind {
  return typeof value === 'string' && VALID_RESOURCE_KINDS.has(value as SheetResourceKind);
}

export function suggestResourceKindFromUrl(
  rawUrl: string,
): Exclude<SheetResourceKind, 'arquivo'> {
  const clean = (rawUrl || '').trim().toLowerCase();
  if (!clean) return 'planilha';

  if (
    clean.includes('docs.google.com/presentation') ||
    clean.includes('slides.google.com') ||
    /\.(ppt|pptx)(\?|#|$)/i.test(clean)
  ) {
    return 'apresentacao';
  }

  if (
    clean.includes('docs.google.com/document') ||
    /\.(doc|docx|pdf)(\?|#|$)/i.test(clean)
  ) {
    return 'doc';
  }

  if (clean.includes('drive.google.com')) {
    return 'drive';
  }

  if (
    clean.includes('docs.google.com/spreadsheets') ||
    clean.includes('sheets.google.com') ||
    /\.(xlsx|xls|csv)(\?|#|$)/i.test(clean)
  ) {
    return 'planilha';
  }

  return 'planilha';
}

export function detectResourceKind(
  url: string,
  itemType?: 'link' | 'file',
  explicitKind?: string,
): SheetResourceKind {
  if (isValidResourceKind(explicitKind)) {
    return explicitKind;
  }

  const clean = (url || '').trim().toLowerCase();
  if (clean.startsWith('data:')) {
    return itemType === 'file' ? 'arquivo' : 'planilha';
  }

  if (
    clean.includes('docs.google.com/presentation') ||
    clean.includes('slides.google.com') ||
    /\.(ppt|pptx)(\?|#|$)/i.test(clean)
  ) {
    return 'apresentacao';
  }

  if (
    clean.includes('docs.google.com/document') ||
    /\.(doc|docx|pdf)(\?|#|$)/i.test(clean)
  ) {
    return 'doc';
  }

  if (clean.includes('drive.google.com')) {
    return 'drive';
  }

  if (
    clean.includes('docs.google.com/spreadsheets') ||
    clean.includes('sheets.google.com') ||
    /\.(xlsx|xls|csv)(\?|#|$)/i.test(clean)
  ) {
    return 'planilha';
  }

  if (itemType === 'file') {
    return 'arquivo';
  }

  return 'planilha';
}

export function getResourceKindMeta(kind: SheetResourceKind): ResourceKindMeta {
  switch (kind) {
    case 'drive':
      return {
        id: 'drive',
        label: 'Drive',
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
        iconBoxClass: 'bg-amber-500/15 text-amber-300 border border-amber-400/25',
      };
    case 'doc':
      return {
        id: 'doc',
        label: 'Doc',
        badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
        iconBoxClass: 'bg-sky-500/15 text-sky-300 border border-sky-400/25',
      };
    case 'apresentacao':
      return {
        id: 'apresentacao',
        label: 'Apresentação',
        badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-400/30',
        iconBoxClass: 'bg-orange-500/15 text-orange-300 border border-orange-400/25',
      };
    case 'arquivo':
      return {
        id: 'arquivo',
        label: 'Arquivo',
        badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-400/30',
        iconBoxClass: 'bg-violet-500/15 text-violet-300 border border-violet-400/25',
      };
    case 'planilha':
    default:
      return {
        id: 'planilha',
        label: 'Planilha',
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
        iconBoxClass: 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/25',
      };
  }
}
