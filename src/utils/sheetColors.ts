export interface SheetColorMeta {
  id: string;
  defaultLabel: string;
  dotClass: string;
  borderClass: string;
  pillActiveClass: string;
  textClass: string;
}

export const SHEET_COLOR_PALETTE: SheetColorMeta[] = [
  {
    id: 'red',
    defaultLabel: 'Vermelho',
    dotClass: 'bg-rose-400',
    borderClass: 'border-l-4 border-l-rose-500',
    pillActiveClass: 'bg-rose-500/20 border-rose-400 text-rose-200',
    textClass: 'text-rose-300',
  },
  {
    id: 'amber',
    defaultLabel: 'Amarelo',
    dotClass: 'bg-amber-400',
    borderClass: 'border-l-4 border-l-amber-400',
    pillActiveClass: 'bg-amber-500/20 border-amber-400 text-amber-200',
    textClass: 'text-amber-300',
  },
  {
    id: 'emerald',
    defaultLabel: 'Verde',
    dotClass: 'bg-emerald-400',
    borderClass: 'border-l-4 border-l-emerald-400',
    pillActiveClass: 'bg-emerald-500/20 border-emerald-400 text-emerald-200',
    textClass: 'text-emerald-300',
  },
  {
    id: 'sky',
    defaultLabel: 'Azul',
    dotClass: 'bg-sky-400',
    borderClass: 'border-l-4 border-l-sky-400',
    pillActiveClass: 'bg-sky-500/20 border-sky-400 text-sky-200',
    textClass: 'text-sky-300',
  },
  {
    id: 'violet',
    defaultLabel: 'Roxo',
    dotClass: 'bg-violet-400',
    borderClass: 'border-l-4 border-l-violet-400',
    pillActiveClass: 'bg-violet-500/20 border-violet-400 text-violet-200',
    textClass: 'text-violet-300',
  },
  {
    id: 'pink',
    defaultLabel: 'Rosa',
    dotClass: 'bg-pink-400',
    borderClass: 'border-l-4 border-l-pink-400',
    pillActiveClass: 'bg-pink-500/20 border-pink-400 text-pink-200',
    textClass: 'text-pink-300',
  },
];

export function getSheetColorMeta(colorId?: string): SheetColorMeta | null {
  if (!colorId) return null;
  return SHEET_COLOR_PALETTE.find((c) => c.id === colorId) || null;
}

export function getSheetColorLabel(
  colorId: string | undefined,
  customLabels?: Record<string, string>,
): string {
  if (!colorId) return '';
  const custom = customLabels?.[colorId]?.trim();
  if (custom) return custom;
  return getSheetColorMeta(colorId)?.defaultLabel || colorId;
}
