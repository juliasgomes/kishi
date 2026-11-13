import { useMemo, useState } from 'react';
import { CalendarCheck, Check, ClipboardCopy, RotateCcw, Trash2 } from 'lucide-react';
import { SumerianGlyphWhisper } from '@/src/components/KishiIcons';
import type {
  KishiActiveCampaign,
  KishiHistoryItem,
  KishiTask,
} from '@/src/types/kishi';
import { isTaskDueToday } from '@/src/utils/taskSchedule';

interface HistoryModuleProps {
  history: KishiHistoryItem[];
  tasks: KishiTask[];
  activeCampaigns: KishiActiveCampaign[];
  onRestore: (historyId: string) => void;
  onRemove: (historyId: string) => void;
  onCopied?: (message: string) => void;
}

function parseBRDateToLocalTime(dateStr: string): number | null {
  const match = dateStr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  return new Date(year, month - 1, day).getTime();
}

export function HistoryModule({
  history,
  tasks,
  activeCampaigns,
  onRestore,
  onRemove,
  onCopied,
}: HistoryModuleProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [copiedJustNow, setCopiedJustNow] = useState(false);

  const filtered = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.dateStr.includes(q) ||
        String(h.product || '').toLowerCase().includes(q) ||
        String(h.channelName || '').toLowerCase().includes(q),
    );
  }, [history, filterQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, KishiHistoryItem[]>();
    filtered.forEach((item) => {
      const existing = map.get(item.dateStr);
      if (existing) {
        existing.push(item);
      } else {
        map.set(item.dateStr, [item]);
      }
    });
    return Array.from(map.entries());
  }, [filtered]);

  async function handleCopyWeeklySummary() {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const weekItems = history.filter((item) => {
      const ts = parseBRDateToLocalTime(item.dateStr);
      if (ts === null) return false;
      return now - ts <= sevenDaysMs;
    });

    const foodDone = weekItems.filter((i) =>
      String(i.product || '').toLowerCase().includes('food'),
    ).length;
    const ridesDone = weekItems.filter((i) =>
      String(i.product || '').toLowerCase().includes('rides'),
    ).length;
    const generalDone = weekItems.length - foodDone - ridesDone;

    const pendingToday = tasks.filter((t) => isTaskDueToday(t));
    const foodWaves = activeCampaigns
      .filter((c) => c.front === '99 Food')
      .flatMap((c) => c.waves);
    const ridesWaves = activeCampaigns
      .filter((c) => c.front === '99 Rides')
      .flatMap((c) => c.waves);

    const lines: string[] = [
      `Resumo Semanal — KISHI (${new Date().toLocaleDateString('pt-BR')})`,
      '',
      `Entregas concluídas (últimos 7 dias): ${weekItems.length}`,
      `• 99 Rides: ${ridesDone} | 99 Food: ${foodDone}${generalDone > 0 ? ` | Geral: ${generalDone}` : ''}`,
    ];

    if (weekItems.length > 0) {
      lines.push('');
      lines.push('Principais entregas recentes:');
      weekItems.slice(0, 8).forEach((item) => {
        lines.push(`- [${item.dateStr}] ${item.title} (${item.product})`);
      });
    }

    lines.push('');
    lines.push(`Pendências abertas hoje: ${pendingToday.length}`);
    lines.push(
      `Campanhas 99 Food: ${foodWaves.filter((w) => w.status === 'extraido').length} extraído(s) / ${foodWaves.filter((w) => w.status === 'nao_extraido').length} pendente(s)`,
    );
    lines.push(
      `Campanhas 99 Rides: ${ridesWaves.filter((w) => w.status === 'extraido').length} extraído(s) / ${ridesWaves.filter((w) => w.status === 'nao_extraido').length} pendente(s)`,
    );

    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }

    setCopiedJustNow(true);
    onCopied?.('Resumo semanal copiado para a área de transferência!');
    window.setTimeout(() => setCopiedJustNow(false), 2200);
  }

  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#EDE9DE] flex items-center gap-2.5">
            <span>Histórico Permanente</span>
            <SumerianGlyphWhisper glyphs="𒌓 · 𒁾" className="text-[11px]" />
          </h1>
          <p className="text-xs text-[#A9B99D] mt-0.5">
            Demandas concluídas arquivadas por data. Você pode restaurar ou copiar o fechamento semanal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleCopyWeeklySummary()}
          className="btn-press px-3.5 py-2 rounded-xl bg-[#151d18] hover:bg-[#1b251f] text-[#EDE9DE] text-xs font-semibold border border-[#C5A66B]/45 flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          {copiedJustNow ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <ClipboardCopy className="w-3.5 h-3.5 text-[#C5A66B]" />
          )}
          <span>{copiedJustNow ? 'Resumo Copiado!' : 'Copiar Resumo da Semana'}</span>
        </button>
      </div>

      <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-[#A9B99D] tabular-nums">
            <strong className="text-[#EDE9DE] font-mono">{filtered.length}</strong> demandas arquivadas
          </span>
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filtrar por data (ex: 12/11/2026) ou tarefa..."
            className="bg-[#0b100d] border border-[#777F89]/60 rounded-xl px-3 py-2 text-xs text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B] w-full sm:w-72 transition"
          />
        </div>

        {grouped.length === 0 ? (
          <div className="p-8 text-center text-[#A9B99D] text-xs border border-dashed border-[#777F89]/40 rounded-xl">
            Nenhuma tarefa arquivada no histórico ainda. Quando você concluir tarefas do dia, elas serão registradas aqui.
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(([dateStr, items]) => (
              <div key={dateStr} className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <CalendarCheck className="w-3.5 h-3.5 text-[#C5A66B]" />
                  <span className="font-bold text-[#C5A66B] font-mono tabular-nums">{dateStr}</span>
                  <span className="text-[11px] text-[#A9B99D] font-mono tabular-nums">
                    ({items.length} concluídas)
                  </span>
                </div>

                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="interactive-card p-3 rounded-xl bg-[#0f1512]/70 border border-[#777F89]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                        <Check className="w-3.5 h-3.5 text-[#A9B99D] shrink-0 mt-0.5 sm:mt-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-[#EDE9DE] font-medium block sm:inline break-words">
                            {item.title}
                          </span>
                          <span className="text-[11px] font-mono text-[#A9B99D] sm:ml-2 block sm:inline">
                            {item.product} · {item.channelName || 'Geral'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-6 sm:pl-0">
                        <span className="text-[11px] font-mono text-[#C5A66B] font-semibold tabular-nums">
                          {item.time}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onRestore(item.id)}
                            className="btn-press px-2.5 py-1 bg-[#0b100d] hover:bg-[#1b251f] text-[#A9B99D] hover:text-[#EDE9DE] rounded-lg text-[11px] font-semibold border border-[#777F89]/40 flex items-center gap-1 whitespace-nowrap cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restaurar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            className="btn-press text-[#A9B99D] hover:text-rose-400 p-1 cursor-pointer"
                            title="Excluir este registro"
                            aria-label={`Excluir registro ${item.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
