import { useState } from 'react';
import {
  ArrowRight,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  ListChecks,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import type {
  FolderKey,
  KishiActiveCampaign,
  KishiSheet,
  KishiTask,
  KishiTimeBank,
} from '@/src/types/kishi';
import { AnalyticsCharts } from '@/src/components/AnalyticsCharts';
import { DailyBriefingMural } from '@/src/components/DailyBriefingMural';
import { getChannelColor, getFrontStyle } from '@/src/utils/channelColors';

interface OverviewModuleProps {
  userName: string;
  tasks: KishiTask[];
  doneTodayCount: number;
  sheets: KishiSheet[];
  activeCampaigns: KishiActiveCampaign[];
  timeBank: KishiTimeBank;
  onOpenNewTask: () => void;
  onOpenEditTask: (task: KishiTask) => void;
  onCompleteTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onGoToFolder: (folder: FolderKey, channelName?: string) => void;
  onGoToCampaigns: () => void;
}

export function OverviewModule({
  userName,
  tasks,
  doneTodayCount,
  sheets,
  activeCampaigns,
  timeBank,
  onOpenNewTask,
  onOpenEditTask,
  onCompleteTask,
  onDeleteTask,
  onGoToFolder,
  onGoToCampaigns,
}: OverviewModuleProps) {
  const [expandedPreviewIds, setExpandedPreviewIds] = useState<Record<string, boolean>>({});
  const pendingTasks = tasks.filter((t) => t.status !== 'concluido');
  const inProgressCount = tasks.filter((t) => t.status === 'andamento').length;

  const ridesCampaigns = activeCampaigns.filter((c) => c.front === '99 Rides');
  const foodCampaigns = activeCampaigns.filter((c) => c.front === '99 Food');

  const ridesMediaPlan = sheets.find(
    (s) => s.category === '99 Rides' && s.name.toLowerCase().includes('plano'),
  );
  const foodMediaPlan = sheets.find(
    (s) => s.category === '99 Food' && s.name.toLowerCase().includes('plano'),
  );

  function renderCampaignSummaryBox(
    front: '99 Rides' | '99 Food',
    campaignsList: KishiActiveCampaign[],
    fallbackPlan?: KishiSheet,
  ) {
    const isRides = front === '99 Rides';
    const frontWaves = campaignsList.flatMap((c) => c.waves);
    const totalPending = frontWaves.filter((w) => w.status === 'nao_extraido').length;
    const totalExtracted = frontWaves.filter((w) => w.status === 'extraido').length;

    return (
      <div
        className={`bg-[#0f1512]/75 border border-[#777F89]/40 border-t-2 ${
          isRides ? 'border-t-[#C5A66B]' : 'border-t-orange-400'
        } rounded-xl p-4 space-y-3 flex flex-col`}
      >
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#777F89]/35">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                isRides
                  ? 'bg-[#C5A66B]/15 border border-[#C5A66B]/30 text-[#C5A66B]'
                  : 'bg-orange-500/15 border border-orange-500/30 text-orange-300'
              }`}
            >
              {isRides ? <Car className="w-4 h-4" /> : <UtensilsCrossed className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h4
                className={`text-xs font-bold truncate ${
                  isRides ? 'text-[#C5A66B]' : 'text-orange-300'
                }`}
              >
                {front}
              </h4>
              <div className="flex items-center gap-2.5 text-[11px] font-mono tabular-nums mt-0.5">
                <span className="inline-flex items-center gap-1 text-rose-300 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" />
                  <span>{totalPending}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                  <span>{totalExtracted}</span>
                </span>
              </div>
            </div>
          </div>

          {fallbackPlan && (
            <a
              href={fallbackPlan.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-press px-2.5 py-1.5 rounded-lg bg-[#0b100d] hover:bg-[#1b251f] text-[#A9B99D] hover:text-[#EDE9DE] text-[11px] font-semibold border border-[#777F89]/40 flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>Plano Geral</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          )}
        </div>

        {campaignsList.length === 0 ? (
          <div className="text-center py-5 px-3 text-[#A9B99D] text-xs border border-dashed border-[#777F89]/35 rounded-xl">
            Nenhuma campanha vinculada em {front}.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
            {campaignsList.map((campaign) => {
              const notExtracted = campaign.waves.filter((w) => w.status === 'nao_extraido').length;
              const extracted = campaign.waves.filter((w) => w.status === 'extraido').length;
              const isOpen = Boolean(expandedPreviewIds[campaign.id]);

              return (
                <div
                  key={campaign.id}
                  className="rounded-xl bg-[#0b100d] border border-[#777F89]/35 overflow-hidden"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setExpandedPreviewIds((prev) => ({
                        ...prev,
                        [campaign.id]: !prev[campaign.id],
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedPreviewIds((prev) => ({
                          ...prev,
                          [campaign.id]: !prev[campaign.id],
                        }));
                      }
                    }}
                    className="p-2.5 flex items-center justify-between gap-2.5 hover:bg-[#0f1512]/70 transition cursor-pointer select-none"
                  >
                    <div className="min-w-0 flex items-center gap-2 flex-1">
                      <span className="text-[#A9B99D] shrink-0">
                        {isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 text-[#C5A66B]" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <span
                        className="text-xs font-bold text-[#EDE9DE] truncate"
                        title={campaign.name}
                      >
                        {campaign.name}
                      </span>

                      <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums shrink-0 ml-1">
                        <span
                          className="inline-flex items-center gap-1 text-rose-300 font-bold"
                          title={`${notExtracted} não extraído(s)`}
                        >
                          <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" />
                          <span>{notExtracted}</span>
                        </span>
                        <span
                          className="inline-flex items-center gap-1 text-emerald-300 font-bold"
                          title={`${extracted} extraído(s)`}
                        >
                          <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                          <span>{extracted}</span>
                        </span>
                      </div>
                    </div>

                    {campaign.sheetUrl && (
                      <a
                        href={campaign.sheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#A9B99D] hover:text-[#C5A66B] shrink-0 p-1"
                        title="Abrir planilha vinculada"
                        aria-label={`Abrir planilha de ${campaign.name}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {isOpen && (
                    <div className="px-3 pb-2.5 pt-1.5 border-t border-[#777F89]/25 space-y-1 bg-[#0f1512]/40">
                      {campaign.waves.length === 0 ? (
                        <div className="text-[11px] text-[#A9B99D] py-1">
                          Nenhum plano cadastrado nesta campanha.
                        </div>
                      ) : (
                        campaign.waves.map((wave) => {
                          const isPending = wave.status === 'nao_extraido';
                          return (
                            <div
                              key={wave.id}
                              onClick={onGoToCampaigns}
                              className="flex items-center justify-between gap-2 text-[11px] py-1 px-2 rounded-lg hover:bg-[#0b100d] cursor-pointer"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span
                                  className={`h-2 w-2 rounded-full shrink-0 ${
                                    isPending ? 'bg-rose-400' : 'bg-emerald-400'
                                  }`}
                                />
                                <span className="text-[#EDE9DE] truncate" title={wave.planTitle}>
                                  {wave.planTitle}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-mono shrink-0 ${
                                  isPending ? 'text-rose-300' : 'text-emerald-300'
                                }`}
                              >
                                {isPending ? 'Não Extraído' : 'Extraído'}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Mural Inteligente + Banco de Horas */}
      <DailyBriefingMural
        userName={userName}
        tasks={tasks}
        doneTodayCount={doneTodayCount}
        activeCampaigns={activeCampaigns}
        timeBank={timeBank}
        onGoToCampaigns={onGoToCampaigns}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="interactive-card bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#A9B99D]">Restam Fazer</span>
            <div className="text-2xl font-extrabold text-[#EDE9DE] mt-0.5 tabular-nums font-mono">
              {pendingTasks.length}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#0f1512] flex items-center justify-center text-[#A9B99D]">
            <ListChecks className="w-4 h-4" />
          </div>
        </div>

        <div className="interactive-card bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#A9B99D]">Em Andamento</span>
            <div className="text-2xl font-extrabold text-[#C5A66B] mt-0.5 tabular-nums font-mono">
              {inProgressCount}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#0f1512] flex items-center justify-center text-[#C5A66B]">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="interactive-card bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#A9B99D]">Concluídas Hoje</span>
            <div className="text-2xl font-extrabold text-[#A9B99D] mt-0.5 tabular-nums font-mono">
              {doneTodayCount}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#0f1512] flex items-center justify-center text-[#A9B99D]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Checklist do Dia */}
      <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#EDE9DE]">O Que Resta Fazer Hoje</h3>
            <p className="text-xs text-[#A9B99D] mt-0.5">
              Clique em uma tarefa para abrir a pasta 99 correspondente, marque o checkbox para concluir ou edite no lápis.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-mono text-[#C5A66B] tabular-nums whitespace-nowrap">
              {pendingTasks.length} pendências
            </span>
            <button
              type="button"
              onClick={onOpenNewTask}
              className="btn-press px-3.5 py-2 bg-[#C5A66B] hover:bg-[#d5b880] text-[#0f1512] rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>

        {pendingTasks.length === 0 ? (
          <div className="text-center py-8 text-[#A9B99D] text-xs border border-dashed border-[#777F89]/40 rounded-xl">
            Nenhuma tarefa pendente no momento. Use o botão{' '}
            <strong className="text-[#EDE9DE]">Nova Tarefa</strong> acima para adicionar sua primeira demanda.
          </div>
        ) : (
          <div className="space-y-2">
            {pendingTasks.map((task) => {
              const isFood = task.product.toLowerCase().includes('food');
              const isRides = task.product.toLowerCase().includes('rides');
              const targetFolder: FolderKey = isFood ? 'food' : 'rides';
              const statusLabel =
                task.status === 'andamento'
                  ? 'Em Andamento'
                  : task.status === 'rotina'
                    ? 'Rotina'
                    : 'A Fazer';

              return (
                <div
                  key={task.id}
                  onClick={() => onGoToFolder(targetFolder, task.channelName)}
                  className="interactive-card p-3.5 rounded-xl bg-[#0f1512]/70 border border-[#777F89]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 cursor-pointer"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={false}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => onCompleteTask(task.id)}
                      className="h-4 w-4 mt-0.5 sm:mt-0 rounded bg-[#0b100d] border-[#777F89]/60 accent-[#C5A66B] cursor-pointer shrink-0"
                      title="Marcar como concluída"
                      aria-label={`Concluir tarefa ${task.title}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#A9B99D] flex-wrap">
                        <span
                          className={`${getFrontStyle(task.product).textClass} font-semibold inline-flex items-center gap-1`}
                        >
                          {isRides && <Car className="w-3 h-3 shrink-0" />}
                          {isFood && <UtensilsCrossed className="w-3 h-3 shrink-0" />}
                          <span>{task.product}</span>
                        </span>
                        {task.subBrand && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{task.subBrand}</span>
                          </>
                        )}
                        {task.channelName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className={`${getChannelColor(task.channelName).textClass} font-semibold`}>
                              {task.channelName}
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{task.frequency}</span>
                        {task.tag && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#C5A66B] font-semibold">#{task.tag}</span>
                          </>
                        )}
                      </div>
                      <h5 className="text-xs font-semibold text-[#EDE9DE] mt-0.5 sm:truncate" title={task.title}>
                        {task.title}
                      </h5>
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-end gap-2 shrink-0 pl-7 sm:pl-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span
                      className={`text-[11px] font-medium whitespace-nowrap ${
                        task.status === 'andamento' ? 'text-[#C5A66B]' : 'text-[#A9B99D]'
                      }`}
                    >
                      {statusLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenEditTask(task)}
                      className="btn-press h-8 w-8 rounded-lg bg-[#0b100d] hover:bg-[#1b251f] text-[#A9B99D] hover:text-[#EDE9DE] flex items-center justify-center cursor-pointer"
                      title="Editar Tarefa"
                      aria-label={`Editar tarefa ${task.title}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      className="btn-press h-8 w-8 rounded-lg bg-[#0b100d] hover:bg-rose-950/60 text-[#A9B99D] hover:text-rose-400 flex items-center justify-center cursor-pointer"
                      title="Excluir Tarefa"
                      aria-label={`Excluir tarefa ${task.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resumo de Planos (conectado à aba Campanhas Ativas) */}
      <div className="bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#EDE9DE] flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#C5A66B]" />
              <span>Campanhas &amp; Planos de Mídia</span>
            </h3>
            <p className="text-xs text-[#A9B99D] mt-0.5">
              Quantidade de planos Não Extraídos (vermelho) e Extraídos (verde) por campanha.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToCampaigns}
            className="btn-press px-3 py-1.5 rounded-xl bg-[#1b251f] hover:bg-[#222e27] text-[#EDE9DE] text-xs font-semibold border border-[#777F89]/60 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <span>Abrir Campanhas Ativas</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#C5A66B]" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {renderCampaignSummaryBox('99 Rides', ridesCampaigns, ridesMediaPlan)}
          {renderCampaignSummaryBox('99 Food', foodCampaigns, foodMediaPlan)}
        </div>
      </div>

      {/* Gráficos */}
      <AnalyticsCharts tasks={tasks} />
    </section>
  );
}
