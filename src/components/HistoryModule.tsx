import { useMemo, useState } from 'react';
import { CalendarCheck, Check, RotateCcw, Trash2 } from 'lucide-react';
import type { KishiHistoryItem } from '@/src/types/kishi';

interface HistoryModuleProps {
  history: KishiHistoryItem[];
  onRestore: (historyId: string) => void;
  onRemove: (historyId: string) => void;
}

export function HistoryModule({ history, onRestore, onRemove }: HistoryModuleProps) {
  const [filterQuery, setFilterQuery] = useState('');

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

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#EDE9DE]">Histórico Permanente</h1>
        <p className="text-xs text-[#A9B99D] mt-0.5">
          Todas as demandas concluídas arquivadas por data. Você pode restaurar qualquer tarefa de volta para o dia ativo.
        </p>
      </div>

      <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-5 space-y-4">
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
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Check className="w-3.5 h-3.5 text-[#A9B99D] shrink-0" />
                        <span className="text-[#EDE9DE] font-medium truncate">{item.title}</span>
                        <span className="text-[11px] font-mono text-[#A9B99D] shrink-0">
                          {item.product} · {item.channelName || 'Geral'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                        <span className="text-[11px] font-mono text-[#C5A66B] font-semibold tabular-nums">
                          {item.time}
                        </span>
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
