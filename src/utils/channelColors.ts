export interface ColorAccentStyle {
  label: string;
  textClass: string;
  iconBgClass: string;
  cardBorderClass: string;
}

export function getFrontStyle(category: string): ColorAccentStyle {
  if (category === '99') {
    return {
      label: '99 · Rides & Food',
      textClass: 'text-sky-300',
      iconBgClass: 'bg-sky-500/15 text-sky-300 border border-sky-400/25',
      cardBorderClass: 'border-t-2 border-t-sky-400/80',
    };
  }
  if (category === '99 Rides') {
    return {
      label: '99 Rides',
      textClass: 'text-[#C5A66B]',
      iconBgClass: 'bg-[#C5A66B]/15 text-[#C5A66B] border border-[#C5A66B]/30',
      cardBorderClass: 'border-t-2 border-t-[#C5A66B]',
    };
  }
  if (category === '99 Food') {
    return {
      label: '99 Food',
      textClass: 'text-orange-300',
      iconBgClass: 'bg-orange-500/15 text-orange-300 border border-orange-400/25',
      cardBorderClass: 'border-t-2 border-t-orange-400/80',
    };
  }
  if (category === 'Canais Externos') {
    return {
      label: 'Canais Externos',
      textClass: 'text-emerald-300',
      iconBgClass: 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/25',
      cardBorderClass: 'border-t-2 border-t-emerald-400/80',
    };
  }
  if (category === 'Arquivo Carregado') {
    return {
      label: 'Arquivo Local',
      textClass: 'text-violet-300',
      iconBgClass: 'bg-violet-500/15 text-violet-300 border border-violet-400/25',
      cardBorderClass: 'border-t-2 border-t-violet-400/80',
    };
  }
  return {
    label: category || 'Geral',
    textClass: 'text-[#EDE9DE]',
    iconBgClass: 'bg-[#0b100d] text-[#EDE9DE] border border-[#777F89]/40',
    cardBorderClass: 'border-t-2 border-t-[#777F89]',
  };
}

const CHANNEL_PALETTE: Array<{
  textClass: string;
  iconBgClass: string;
  cardBorderClass: string;
}> = [
  {
    textClass: 'text-sky-300',
    iconBgClass: 'bg-sky-500/15 text-sky-300 border border-sky-400/30',
    cardBorderClass: 'border-t-2 border-t-sky-400/80',
  },
  {
    textClass: 'text-[#C5A66B]',
    iconBgClass: 'bg-[#C5A66B]/15 text-[#C5A66B] border border-[#C5A66B]/30',
    cardBorderClass: 'border-t-2 border-t-[#C5A66B]',
  },
  {
    textClass: 'text-emerald-300',
    iconBgClass: 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30',
    cardBorderClass: 'border-t-2 border-t-emerald-400/80',
  },
  {
    textClass: 'text-orange-300',
    iconBgClass: 'bg-orange-500/15 text-orange-300 border border-orange-400/30',
    cardBorderClass: 'border-t-2 border-t-orange-400/80',
  },
  {
    textClass: 'text-violet-300',
    iconBgClass: 'bg-violet-500/15 text-violet-300 border border-violet-400/30',
    cardBorderClass: 'border-t-2 border-t-violet-400/80',
  },
  {
    textClass: 'text-rose-300',
    iconBgClass: 'bg-rose-500/15 text-rose-300 border border-rose-400/30',
    cardBorderClass: 'border-t-2 border-t-rose-400/80',
  },
  {
    textClass: 'text-teal-300',
    iconBgClass: 'bg-teal-500/15 text-teal-300 border border-teal-400/30',
    cardBorderClass: 'border-t-2 border-t-teal-400/80',
  },
];

export function getChannelColor(channelName: string) {
  let hash = 0;
  const clean = (channelName || '').trim().toLowerCase();
  for (let i = 0; i < clean.length; i += 1) {
    hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  }
  return CHANNEL_PALETTE[hash % CHANNEL_PALETTE.length];
}
