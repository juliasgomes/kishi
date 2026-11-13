import { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  ExternalLink,
  FileSpreadsheet,
  Filter,
  ListChecks,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import type { KishiActiveCampaign, KishiWavePlan } from '@/src/types/kishi';
import { parseWaveDateTimestamp } from '@/src/utils/sheetParser';
import { getWaveDueState } from '@/src/utils/taskSchedule';

type WaveSortMode =
  | 'sheet'
  | 'nao_extraido_first'
  | 'extraido_first'
  | 'date_asc'
  | 'date_desc';

interface CampaignsModuleProps {
  campaigns: KishiActiveCampaign[];
  expandedIds: Record<string, boolean>;
  syncingCampaignIds: Record<string, boolean>;
  onToggleExpand: (campaignId: string) => void;
  onSetExpandAll: (expand: boolean) => void;
  onOpenNewCampaign: (defaultFront?: '99 Rides' | '99 Food') => void;
  onOpenEditCampaign: (campaign: KishiActiveCampaign) => void;
  onDeleteCampaign: (campaignId: string) => void;
  onSyncCampaignNow: (campaign: KishiActiveCampaign) => void;
  onSyncAllNow: () => void;
  onOpenAddWave: (campaignId: string) => void;
  onOpenEditWave: (campaignId: string, wave: KishiWavePlan) => void;
  onToggleWaveStatus: (campaignId: string, waveId: string) => void;
  onDeleteWave: (campaignId: string, waveId: string) => void;
  onPushWaveToToday: (campaign: KishiActiveCampaign, wave: KishiWavePlan) => void;
  onAddTodo: (campaignId: string, text: string, waveRef?: string) => void;
  onToggleTodo: (campaignId: string, todoId: string) => void;
  onDeleteTodo: (campaignId: string, todoId: string) => void;
  onPushTodoToToday: (campaign: KishiActiveCampaign, todoText: string, waveRef?: string) => void;
}

export function CampaignsModule({
  campaigns,
  expandedIds,
  syncingCampaignIds,
  onToggleExpand,
  onSetExpandAll,
  onOpenNewCampaign,
  onOpenEditCampaign,
  onDeleteCampaign,
  onSyncCampaignNow,
  onSyncAllNow,
  onOpenAddWave,
  onOpenEditWave,
  onToggleWaveStatus,
  onDeleteWave,
  onPushWaveToToday,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onPushTodoToToday,
}: CampaignsModuleProps) {
  const [frontTab, setFrontTab] = useState<'all' | '99 Food' | '99 Rides'>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'nao_extraido' | 'extraido'>('all');
  const [sortBy, setSortBy] = useState<WaveSortMode>('sheet');
  const [searchText, setSearchText] = useState('');

  const [todoDrafts, setTodoDrafts] = useState<Record<string, string>>({});
  const [todoWaveRefs, setTodoWaveRefs] = useState<Record<string, string>>({});

  const foodCampaigns = campaigns.filter((c) => c.front === '99 Food');
  const ridesCampaigns = campaigns.filter((c) => c.front === '99 Rides');
  const campaignDropdownOptions =
    frontTab === '99 Food'
      ? foodCampaigns
      : frontTab === '99 Rides'
        ? ridesCampaigns
        : campaigns;

  const linkedCount = campaigns.filter((c) => Boolean(c.sheetUrl)).length;
  const isAnySyncing = Object.values(syncingCampaignIds).some(Boolean);

  const kpiCampaigns =
    frontTab === 'all' ? campaigns : campaigns.filter((c) => c.front === frontTab);
  const kpiWaves = kpiCampaigns.flatMap((c) => c.waves);
  const totalNotExtracted = kpiWaves.filter((w) => w.status === 'nao_extraido').length;
  const totalExtracted = kpiWaves.filter((w) => w.status === 'extraido').length;

  const foodPending = foodCampaigns
    .flatMap((c) => c.waves)
    .filter((w) => w.status === 'nao_extraido').length;
  const ridesPending = ridesCampaigns
    .flatMap((c) => c.waves)
    .filter((w) => w.status === 'nao_extraido').length;

  const q = searchText.trim().toLowerCase();

  function handleSelectFrontTab(nextTab: 'all' | '99 Food' | '99 Rides') {
    setFrontTab(nextTab);
    if (nextTab !== 'all' && campaignFilter !== 'all') {
      const selected = campaigns.find((c) => c.id === campaignFilter);
      if (selected && selected.front !== nextTab) {
        setCampaignFilter('all');
      }
    }
  }

  function matchesFilters(c: KishiActiveCampaign): boolean {
    if (frontTab !== 'all' && c.front !== frontTab) return false;
    if (campaignFilter !== 'all' && c.id !== campaignFilter) return false;

    const matchingWaves = c.waves.filter((w) => {
      if (statusFilter !== 'all' && w.status !== statusFilter) return false;
      if (q) {
        return (
          w.waveName.toLowerCase().includes(q) ||
          w.planTitle.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (statusFilter !== 'all' && matchingWaves.length === 0) return false;
    if (q) {
      const matchesCampOrTodos =
        c.name.toLowerCase().includes(q) ||
        c.todos.some((t) => t.text.toLowerCase().includes(q));
      if (!matchesCampOrTodos && matchingWaves.length === 0) return false;
    }

    return true;
  }

  const filteredCampaigns = campaigns.filter(matchesFilters);
  const filteredFood = filteredCampaigns.filter((c) => c.front === '99 Food');
  const filteredRides = filteredCampaigns.filter((c) => c.front === '99 Rides');

  const allExpanded =
    filteredCampaigns.length > 0 && filteredCampaigns.every((c) => Boolean(expandedIds[c.id]));

  function submitQuickTodo(campaignId: string) {
    const text = (todoDrafts[campaignId] || '').trim();
    if (!text) return;
    const waveRef = (todoWaveRefs[campaignId] || '').trim() || undefined;
    onAddTodo(campaignId, text, waveRef);
    setTodoDrafts((prev) => ({ ...prev, [campaignId]: '' }));
    setTodoWaveRefs((prev) => ({ ...prev, [campaignId]: '' }));
  }

  function sortWaves(list: KishiWavePlan[]): KishiWavePlan[] {
    if (sortBy === 'sheet') return list;
    const copy = [...list];
    if (sortBy === 'nao_extraido_first') {
      return copy.sort((a, b) => {
        if (a.status === b.status) return 0;
        return a.status === 'nao_extraido' ? -1 : 1;
      });
    }
    if (sortBy === 'extraido_first') {
      return copy.sort((a, b) => {
        if (a.status === b.status) return 0;
        return a.status === 'extraido' ? -1 : 1;
      });
    }
    if (sortBy === 'date_asc' || sortBy === 'date_desc') {
      return copy.sort((a, b) => {
        const tsA = parseWaveDateTimestamp(a.startDate || a.endDate);
        const tsB = parseWaveDateTimestamp(b.startDate || b.endDate);
        if (tsA === null && tsB === null) return 0;
        if (tsA === null) return 1;
        if (tsB === null) return -1;
        return sortBy === 'date_asc' ? tsA - tsB : tsB - tsA;
      });
    }
    return copy;
  }

  function renderCampaignCard(camp: KishiActiveCampaign) {
    const isRides = camp.front === '99 Rides';
    const isExpanded = Boolean(expandedIds[camp.id]) || q.length > 0;
    const isSyncing = Boolean(syncingCampaignIds[camp.id]);
    const campPending = camp.waves.filter((w) => w.status === 'nao_extraido').length;
    const campDone = camp.waves.filter((w) => w.status === 'extraido').length;
    const overdueCount = camp.waves.filter(
      (w) => getWaveDueState(w.startDate, w.endDate, w.status) === 'overdue',
    ).length;
    const dueTodayCount = camp.waves.filter(
      (w) => getWaveDueState(w.startDate, w.endDate, w.status) === 'due_today',
    ).length;
    const pendingTodos = camp.todos.filter((t) => !t.done).length;

    const visibleWaves = sortWaves(
      camp.waves.filter((w) => {
        if (statusFilter !== 'all' && w.status !== statusFilter) return false;
        if (q) {
          const waveMatch =
            w.waveName.toLowerCase().includes(q) || w.planTitle.toLowerCase().includes(q);
          const campMatch = camp.name.toLowerCase().includes(q);
          return waveMatch || campMatch;
        }
        return true;
      }),
    );

    return (
      <div
        key={camp.id}
        className={`bg-[#151d18] border border-[#777F89]/40 border-l-4 ${
          isRides ? 'border-l-[#C5A66B]' : 'border-l-orange-400'
        } rounded-2xl overflow-hidden transition`}
      >
        {/* Barra recolhível / cabeçalho da campanha */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onToggleExpand(camp.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleExpand(camp.id);
            }
          }}
          className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3 hover:bg-[#1b251f]/40 transition cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <span className="h-7 w-7 rounded-lg bg-[#0b100d] border border-[#777F89]/40 flex items-center justify-center text-[#A9B99D] shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-[#C5A66B]" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </span>

            <div
              className={`h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center shrink-0 ${
                isRides
                  ? 'bg-[#C5A66B]/15 border border-[#C5A66B]/30 text-[#C5A66B]'
                  : 'bg-orange-500/15 border border-orange-500/30 text-orange-300'
              }`}
            >
              {isRides ? <Car className="w-4 h-4" /> : <UtensilsCrossed className="w-4 h-4" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <h3 className="text-xs sm:text-sm font-extrabold text-[#EDE9DE] truncate">
                  {camp.name}
                </h3>
                <div className="flex items-center gap-2.5 text-[11px] font-mono tabular-nums shrink-0">
                  <span
                    className="inline-flex items-center gap-1.5 text-rose-300 font-bold"
                    title={`${campPending} Não Extraído(s)`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shrink-0" />
                    <span>{campPending}</span>
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 text-emerald-300 font-bold"
                    title={`${campDone} Extraído(s)`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>{campDone}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono mt-0.5 flex-wrap text-[#A9B99D]">
                <span>{camp.waves.length} plano(s)</span>
                <span className="text-[#777F89]">·</span>
                <span>{pendingTodos} tarefa(s)</span>
                {overdueCount > 0 && (
                  <>
                    <span className="text-[#777F89]">·</span>
                    <span className="text-rose-300 font-semibold">
                      {overdueCount} atrasado(s)
                    </span>
                  </>
                )}
                {dueTodayCount > 0 && (
                  <>
                    <span className="text-[#777F89]">·</span>
                    <span className="text-amber-300 font-semibold">
                      {dueTodayCount} vence hoje
                    </span>
                  </>
                )}
                {camp.lastSyncedAt && (
                  <>
                    <span className="text-[#777F89] hidden sm:inline">·</span>
                    <span className="hidden sm:inline">Sync: {camp.lastSyncedAt}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Ações rápidas sem abrir */}
          <div
            className="flex items-center gap-1.5 flex-wrap shrink-0 lg:pl-0"
            onClick={(e) => e.stopPropagation()}
          >
            {camp.sheetUrl && (
              <>
                <button
                  type="button"
                  onClick={() => onSyncCampaignNow(camp)}
                  disabled={isSyncing}
                  className="btn-press px-2.5 py-1.5 rounded-xl bg-[#0b100d] hover:bg-[#1b251f] disabled:opacity-60 text-[#EDE9DE] text-[11px] font-semibold border border-[#777F89]/50 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  title="Sincronizar agora com o Google Sheets"
                >
                  <RefreshCw className={`w-3 h-3 text-[#C5A66B] ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                </button>

                <a
                  href={camp.sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-press px-2.5 py-1.5 rounded-xl bg-[#0b100d] hover:bg-[#1b251f] text-[#EDE9DE] text-[11px] font-semibold border border-[#777F89]/50 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#C5A66B]" />
                  <span>Planilha</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </>
            )}

            <button
              type="button"
              onClick={() => onOpenEditCampaign(camp)}
              className="btn-press h-8 w-8 rounded-xl bg-[#0b100d] hover:bg-[#1b251f] text-[#A9B99D] hover:text-[#EDE9DE] flex items-center justify-center cursor-pointer"
              title="Editar campanha / link da planilha"
              aria-label={`Editar ${camp.name}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onDeleteCampaign(camp.id)}
              className="btn-press h-8 w-8 rounded-xl bg-[#0b100d] hover:bg-rose-950/60 text-[#A9B99D] hover:text-rose-400 flex items-center justify-center cursor-pointer"
              title="Excluir campanha"
              aria-label={`Excluir ${camp.name}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Conteúdo expandido da campanha */}
        {isExpanded && (
          <div className="px-5 pb-5 pt-3 border-t border-[#777F89]/30 space-y-5 bg-[#0f1512]/30">
            {camp.notes && (
              <p className="text-xs text-[#A9B99D] bg-[#0b100d]/70 border border-[#777F89]/30 rounded-xl px-3.5 py-2.5">
                {camp.notes}
              </p>
            )}

            {/* Área 1: Waves / Planos de Mídia */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#EDE9DE] flex items-center gap-1.5">
                  <FileSpreadsheet
                    className={`w-3.5 h-3.5 ${isRides ? 'text-[#C5A66B]' : 'text-orange-300'}`}
                  />
                  <span>Planos de Mídia &amp; Waves ({visibleWaves.length})</span>
                </span>
                <button
                  type="button"
                  onClick={() => onOpenAddWave(camp.id)}
                  className="btn-press text-[11px] text-[#C5A66B] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Wave manual</span>
                </button>
              </div>

              {visibleWaves.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#0b100d]/70 border border-dashed border-[#777F89]/35 text-center text-xs text-[#A9B99D]">
                  Nenhum plano para este filtro. Clique em{' '}
                  <strong className="text-[#EDE9DE]">Editar</strong> para vincular uma planilha ou em{' '}
                  <strong className="text-[#EDE9DE]">Adicionar Wave manual</strong>.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {visibleWaves.map((wave) => {
                    const isPending = wave.status === 'nao_extraido';
                    const dueState = getWaveDueState(wave.startDate, wave.endDate, wave.status);
                    return (
                      <div
                        key={wave.id}
                        className={`p-3 rounded-xl bg-[#0b100d] border transition flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3 ${
                          dueState === 'overdue'
                            ? 'border-rose-500/65 hover:border-rose-400'
                            : dueState === 'due_today'
                              ? 'border-amber-500/55 hover:border-amber-400'
                              : isPending
                                ? 'border-rose-500/35 hover:border-rose-400/60'
                                : 'border-[#777F89]/35 hover:border-emerald-400/50'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => onToggleWaveStatus(camp.id, wave.id)}
                            title="Clique para alternar entre Não Extraído (vermelho) e Extraído (verde)"
                            className={`btn-press px-2.5 py-1 rounded-lg text-[11px] font-bold border whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 mt-0.5 ${
                              isPending
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25'
                                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isPending ? 'bg-rose-400' : 'bg-emerald-400'
                              }`}
                            />
                            <span>{isPending ? 'Não Extraído' : 'Extraído'}</span>
                          </button>

                          <div className="min-w-0 flex-1">
                            {wave.waveName && wave.waveName !== wave.planTitle && (
                              <div className="text-[11px] font-mono text-[#A9B99D] truncate">
                                {wave.waveName}
                              </div>
                            )}
                            {wave.planUrl ? (
                              <a
                                href={wave.planUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-[#EDE9DE] hover:text-[#C5A66B] transition-colors inline-flex items-center gap-1.5 max-w-full mt-0.5"
                                title={wave.planTitle}
                              >
                                <span className="truncate">{wave.planTitle}</span>
                                <ExternalLink className="w-3 h-3 shrink-0 opacity-80" />
                              </a>
                            ) : (
                              <div
                                className="text-xs font-bold text-[#EDE9DE] truncate mt-0.5"
                                title={wave.planTitle}
                              >
                                {wave.planTitle}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between lg:justify-end gap-2.5 sm:gap-3 shrink-0">
                          <div className="flex items-center gap-2 sm:gap-3 text-[11px] font-mono text-[#A9B99D] tabular-nums flex-wrap">
                            {(wave.startDate || wave.endDate) && (
                              <span
                                className={`flex items-center gap-1 ${
                                  dueState === 'overdue'
                                    ? 'text-rose-300 font-semibold'
                                    : dueState === 'due_today'
                                      ? 'text-amber-300 font-semibold'
                                      : ''
                                }`}
                              >
                                <Calendar className="w-3 h-3 opacity-75 shrink-0" />
                                <span>
                                  {wave.startDate || '—'} → {wave.endDate || '—'}
                                  {dueState === 'overdue'
                                    ? ' · Atrasado'
                                    : dueState === 'due_today'
                                      ? ' · Vence hoje'
                                      : ''}
                                </span>
                              </span>
                            )}
                            {wave.totalValue && (
                              <span className="text-[#EDE9DE] font-semibold">
                                {wave.totalValue}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onPushWaveToToday(camp, wave)}
                              className="btn-press px-2 h-7 rounded-lg bg-[#151d18] hover:bg-[#1b251f] text-[#C5A66B] text-[11px] font-semibold whitespace-nowrap cursor-pointer"
                              title="Enviar atualização deste plano para Tarefas do Dia"
                            >
                              + Dia
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenEditWave(camp.id, wave)}
                              className="btn-press h-7 w-7 rounded-lg bg-[#151d18] hover:bg-[#1b251f] text-[#A9B99D] hover:text-[#EDE9DE] flex items-center justify-center cursor-pointer"
                              title="Editar wave / plano"
                              aria-label={`Editar ${wave.planTitle}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteWave(camp.id, wave.id)}
                              className="btn-press h-7 w-7 rounded-lg bg-[#151d18] hover:bg-rose-950/60 text-[#A9B99D] hover:text-rose-400 flex items-center justify-center cursor-pointer"
                              title="Excluir wave / plano"
                              aria-label={`Excluir ${wave.planTitle}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Área 2: O que tenho que fazer dentro desta campanha */}
            <div className="bg-[#0b100d]/80 border border-[#777F89]/35 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#EDE9DE] flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5 text-[#C5A66B]" />
                  <span>O que fazer nesta campanha</span>
                </span>
                <span className="text-[11px] font-mono text-[#A9B99D] tabular-nums">
                  {pendingTodos} pendente(s)
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={todoDrafts[camp.id] || ''}
                  onChange={(e) =>
                    setTodoDrafts((prev) => ({ ...prev, [camp.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitQuickTodo(camp.id);
                  }}
                  placeholder="Ex: Atualizar aba do Wave 5, validar verba ou conferir extração..."
                  className="flex-1 bg-[#151d18] border border-[#777F89]/60 rounded-xl px-3 py-2 text-xs text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
                />

                {camp.waves.length > 0 && (
                  <select
                    value={todoWaveRefs[camp.id] || ''}
                    onChange={(e) =>
                      setTodoWaveRefs((prev) => ({ ...prev, [camp.id]: e.target.value }))
                    }
                    className="bg-[#151d18] border border-[#777F89]/60 rounded-xl px-2.5 py-2 text-xs text-[#EDE9DE] focus:outline-none focus:border-[#C5A66B] sm:max-w-[190px]"
                    aria-label="Associar a um wave (opcional)"
                  >
                    <option value="">Wave: Geral da campanha</option>
                    {camp.waves.map((w) => (
                      <option key={w.id} value={w.waveName}>
                        {w.waveName}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => submitQuickTodo(camp.id)}
                  disabled={!(todoDrafts[camp.id] || '').trim()}
                  className="btn-press px-3.5 py-2 rounded-xl bg-[#C5A66B] hover:bg-[#d5b880] disabled:opacity-50 text-[#0f1512] text-xs font-bold flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>

              {camp.todos.length > 0 && (
                <div className="space-y-1.5 text-xs">
                  {camp.todos.map((todo) => (
                    <div
                      key={todo.id}
                      className="p-2.5 rounded-lg bg-[#151d18] border border-[#777F89]/35 flex items-center justify-between gap-3"
                    >
                      <label className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={todo.done}
                          onChange={() => onToggleTodo(camp.id, todo.id)}
                          className="h-3.5 w-3.5 rounded bg-[#0b100d] border-[#777F89]/60 accent-[#C5A66B] cursor-pointer shrink-0"
                        />
                        <span
                          className={`${
                            todo.done ? 'line-through text-[#A9B99D]' : 'text-[#EDE9DE]'
                          } truncate`}
                        >
                          {todo.text}
                        </span>
                        {todo.waveRef && (
                          <span className="text-[10px] font-mono text-[#C5A66B] shrink-0">
                            · {todo.waveRef}
                          </span>
                        )}
                      </label>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onPushTodoToToday(camp, todo.text, todo.waveRef)}
                          className="btn-press text-[#C5A66B] hover:underline font-semibold text-[11px] whitespace-nowrap cursor-pointer"
                          title="Enviar para Tarefas do Dia"
                        >
                          + Jogar no Dia
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTodo(camp.id, todo.id)}
                          className="btn-press text-[#A9B99D] hover:text-rose-400 p-1 cursor-pointer"
                          title="Excluir tarefa"
                          aria-label={`Excluir ${todo.text}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#EDE9DE] flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#C5A66B]" />
            <span>Campanhas Ativas &amp; Waves</span>
          </h1>
          <p className="text-xs text-[#A9B99D] mt-0.5">
            Separe suas campanhas entre 99 Food e 99 Rides, sincronize suas planilhas e abra só a campanha que quiser conferir.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {linkedCount > 0 && (
            <button
              type="button"
              onClick={onSyncAllNow}
              disabled={isAnySyncing}
              className="btn-press px-3.5 py-2 rounded-xl bg-[#151d18] hover:bg-[#1b251f] disabled:opacity-60 text-[#EDE9DE] text-xs font-semibold border border-[#777F89]/60 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#C5A66B] ${isAnySyncing ? 'animate-spin' : ''}`}
              />
              <span>{isAnySyncing ? 'Sincronizando...' : 'Sincronizar Planilhas'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenNewCampaign(frontTab === '99 Rides' ? '99 Rides' : '99 Food')}
            className="btn-press px-4 py-2 rounded-xl bg-[#C5A66B] hover:bg-[#d5b880] text-[#0f1512] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Campanha / Planilha</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="interactive-card bg-[#151d18] border border-rose-500/35 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-rose-300 block truncate">
              Não Extraído{frontTab !== 'all' ? ` · ${frontTab}` : ''}
            </span>
            <div className="text-lg sm:text-2xl font-extrabold text-rose-300 mt-0.5 tabular-nums font-mono">
              {totalNotExtracted}
            </div>
          </div>
          <div className="hidden sm:flex h-10 w-10 rounded-xl bg-rose-500/15 border border-rose-500/30 items-center justify-center text-rose-300 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="interactive-card bg-[#151d18] border border-emerald-500/35 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-300 block truncate">
              Extraído{frontTab !== 'all' ? ` · ${frontTab}` : ''}
            </span>
            <div className="text-lg sm:text-2xl font-extrabold text-emerald-300 mt-0.5 tabular-nums font-mono">
              {totalExtracted}
            </div>
          </div>
          <div className="hidden sm:flex h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 items-center justify-center text-emerald-300 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="interactive-card bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#A9B99D] block truncate">
              {frontTab === 'all' ? 'Campanhas' : frontTab}
            </span>
            <div className="text-lg sm:text-2xl font-extrabold text-[#C5A66B] mt-0.5 tabular-nums font-mono">
              {kpiCampaigns.length}
            </div>
          </div>
          <div className="hidden sm:flex h-10 w-10 rounded-xl bg-[#0f1512] items-center justify-center text-[#C5A66B] shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Divisão por Frente (Todas / 99 Food / 99 Rides) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleSelectFrontTab('all')}
            className={`btn-press px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-2 ${
              frontTab === 'all'
                ? 'bg-[#C5A66B] text-[#0f1512] border-[#C5A66B]'
                : 'bg-[#151d18] text-[#EDE9DE] border-[#777F89]/50 hover:bg-[#1b251f]'
            }`}
          >
            <span>Todas</span>
            <span className="font-mono opacity-80">({campaigns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectFrontTab('99 Food')}
            className={`btn-press px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-2 ${
              frontTab === '99 Food'
                ? 'bg-orange-500/20 text-orange-300 border-orange-400'
                : 'bg-[#151d18] text-[#EDE9DE] border-[#777F89]/50 hover:bg-[#1b251f]'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-orange-300" />
            <span>99 Food</span>
            <span className="font-mono opacity-80">({foodCampaigns.length})</span>
            {foodPending > 0 && (
              <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded-md">
                {foodPending}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectFrontTab('99 Rides')}
            className={`btn-press px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-2 ${
              frontTab === '99 Rides'
                ? 'bg-[#C5A66B]/20 text-[#C5A66B] border-[#C5A66B]'
                : 'bg-[#151d18] text-[#EDE9DE] border-[#777F89]/50 hover:bg-[#1b251f]'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-[#C5A66B]" />
            <span>99 Rides</span>
            <span className="font-mono opacity-80">({ridesCampaigns.length})</span>
            {ridesPending > 0 && (
              <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded-md">
                {ridesPending}
              </span>
            )}
          </button>
        </div>

        {filteredCampaigns.length > 0 && (
          <button
            type="button"
            onClick={() => onSetExpandAll(!allExpanded)}
            className="btn-press px-3 py-1.5 rounded-xl bg-[#151d18] hover:bg-[#1b251f] text-[#A9B99D] hover:text-[#EDE9DE] text-xs font-semibold border border-[#777F89]/40 flex items-center gap-1.5 self-start lg:self-auto cursor-pointer"
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp className="w-3.5 h-3.5 text-[#C5A66B]" />
                <span>Recolher todas</span>
              </>
            ) : (
              <>
                <ChevronsUpDown className="w-3.5 h-3.5 text-[#C5A66B]" />
                <span>Expandir todas</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Barra de Filtros Secundários */}
      <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[#A9B99D] flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5 text-[#C5A66B]" />
            <span>Filtros:</span>
          </span>

          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="bg-[#0b100d] border border-[#777F89]/60 text-xs text-[#EDE9DE] rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#C5A66B] max-w-[240px]"
            aria-label="Filtrar por campanha"
          >
            <option value="all">
              {frontTab === 'all' ? 'Campanha: Todas' : `Campanha (${frontTab}): Todas`}
            </option>
            {campaignDropdownOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {frontTab === 'all' ? `${c.name} (${c.front})` : c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | 'nao_extraido' | 'extraido')
            }
            className="bg-[#0b100d] border border-[#777F89]/60 text-xs text-[#EDE9DE] rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#C5A66B]"
            aria-label="Filtrar por status"
          >
            <option value="all">Status: Todos</option>
            <option value="nao_extraido">Não Extraído (Vermelho)</option>
            <option value="extraido">Extraído (Verde)</option>
          </select>

          <div className="flex items-center gap-1.5 bg-[#0b100d] border border-[#777F89]/60 rounded-xl px-2.5 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#C5A66B] shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as WaveSortMode)}
              className="bg-transparent text-xs text-[#EDE9DE] focus:outline-none cursor-pointer"
              aria-label="Ordenar planos"
            >
              <option value="sheet" className="bg-[#0b100d]">
                Ordem: Planilha
              </option>
              <option value="nao_extraido_first" className="bg-[#0b100d]">
                Não Extraídos primeiro
              </option>
              <option value="extraido_first" className="bg-[#0b100d]">
                Concluídos (Extraídos) primeiro
              </option>
              <option value="date_asc" className="bg-[#0b100d]">
                Data: mais antiga primeiro
              </option>
              <option value="date_desc" className="bg-[#0b100d]">
                Data: mais recente primeiro
              </option>
            </select>
          </div>
        </div>

        <div className="relative w-full lg:w-64">
          <Search className="w-3.5 h-3.5 text-[#A9B99D] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar campanha, wave ou plano..."
            className="w-full bg-[#0b100d] border border-[#777F89]/60 rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#EDE9DE] placeholder-[#777F89] focus:outline-none focus:border-[#C5A66B]"
          />
        </div>
      </div>

      {/* Listagem Dividida entre 99 Food e 99 Rides */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-[#151d18] border border-dashed border-[#777F89]/50 rounded-2xl p-10 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-[#0b100d] border border-[#777F89]/40 text-[#C5A66B] flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-sm font-bold text-[#EDE9DE]">
              {campaigns.length === 0
                ? 'Nenhuma campanha cadastrada ainda'
                : 'Nenhuma campanha encontrada para este filtro'}
            </h3>
            <p className="text-xs text-[#A9B99D] leading-relaxed">
              {campaigns.length === 0
                ? 'Clique em "Nova Campanha / Planilha" para criar uma campanha e já vincular sua planilha do Google Sheets.'
                : 'Tente limpar os filtros acima para visualizar suas campanhas.'}
            </p>
          </div>
        </div>
      ) : frontTab === 'all' ? (
        <div className="space-y-7">
          {/* Bloco 99 Food */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-orange-500/25">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-300">
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                </span>
                <h2 className="text-sm font-extrabold text-orange-300">
                  99 Food ({filteredFood.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onOpenNewCampaign('99 Food')}
                className="btn-press text-xs font-semibold text-orange-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova em Food</span>
              </button>
            </div>

            {filteredFood.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#151d18]/60 border border-dashed border-[#777F89]/35 text-xs text-[#A9B99D] text-center">
                Nenhuma campanha de 99 Food exibida para os filtros atuais.
              </div>
            ) : (
              <div className="space-y-2.5">{filteredFood.map(renderCampaignCard)}</div>
            )}
          </div>

          {/* Bloco 99 Rides */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#C5A66B]/25">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-lg bg-[#C5A66B]/15 border border-[#C5A66B]/30 flex items-center justify-center text-[#C5A66B]">
                  <Car className="w-3.5 h-3.5" />
                </span>
                <h2 className="text-sm font-extrabold text-[#C5A66B]">
                  99 Rides ({filteredRides.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onOpenNewCampaign('99 Rides')}
                className="btn-press text-xs font-semibold text-[#C5A66B] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova em Rides</span>
              </button>
            </div>

            {filteredRides.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#151d18]/60 border border-dashed border-[#777F89]/35 text-xs text-[#A9B99D] text-center">
                Nenhuma campanha de 99 Rides exibida para os filtros atuais.
              </div>
            ) : (
              <div className="space-y-2.5">{filteredRides.map(renderCampaignCard)}</div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">{filteredCampaigns.map(renderCampaignCard)}</div>
      )}
    </section>
  );
}
