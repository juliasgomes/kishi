import { AlertTriangle } from 'lucide-react';
import type { DuplicateLinkMatch } from '@/src/utils/urlDuplicates';

interface DuplicateLinkNoticeProps {
  matches: DuplicateLinkMatch[];
}

export function DuplicateLinkNotice({ matches }: DuplicateLinkNoticeProps) {
  if (matches.length === 0) return null;

  const hasExact = matches.some((m) => m.matchType === 'exact');

  return (
    <div
      role="alert"
      className="mt-2 p-2.5 rounded-xl bg-amber-950/40 border border-amber-400/50 text-[11px] text-amber-100 space-y-1.5"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
        <span className="font-bold text-amber-200 leading-snug">
          {hasExact
            ? 'Este link já está salvo no seu workspace:'
            : 'Esta mesma planilha do Google Sheets já está salva (em outra aba):'}
        </span>
      </div>
      <ul className="space-y-1 pl-5 list-disc text-amber-100/95">
        {matches.slice(0, 4).map((match, idx) => (
          <li key={`${match.label}-${idx}`} className="leading-snug break-words">
            <strong className="text-white">{match.label}</strong>{' '}
            <span className="text-amber-300/90 font-mono">({match.location})</span>
          </li>
        ))}
      </ul>
      {matches.length > 4 && (
        <p className="pl-5 text-[10px] text-amber-300/80">
          + {matches.length - 4} outro(s) registro(s) com o mesmo link.
        </p>
      )}
    </div>
  );
}
