import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Hourglass,
  ListChecks,
  Megaphone,
  Sparkles,
} from 'lucide-react';
import { ChatDotAntSvg } from '@/src/components/KishiIcons';
import type {
  KishiActiveCampaign,
  KishiTask,
  KishiTimeBank,
} from '@/src/types/kishi';
import { estimateWorkspaceTime } from '@/src/utils/timeEstimator';
import { isTaskDueToday } from '@/src/utils/taskSchedule';
import {
  computeWorkHoursStats,
  formatDuration,
  getBrasiliaTimeParts,
} from '@/src/utils/workHours';

interface DailyBriefingMuralProps {
  userName: string;
  tasks: KishiTask[];
  doneTodayCount: number;
  activeCampaigns: KishiActiveCampaign[];
  timeBank: KishiTimeBank;
  onGoToCampaigns: () => void;
}

const MURAL_COLLAPSED_KEY = 'kishi_mural_collapsed_v1';

function getGreetingByBrasiliaHour(now: Date): string {
  const { hours } = getBrasiliaTimeParts(now);
  if (hours >= 5 && hours < 12) return 'Bom dia';
  if (hours >= 12 && hours < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function DailyBriefingMural({
  userName,
  tasks,
  doneTodayCount,
  activeCampaigns,
  timeBank,
  onGoToCampaigns,
}: DailyBriefingMuralProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(MURAL_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [nowTick, setNowTick] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(new Date());
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MURAL_COLLAPSED_KEY, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  const workStats = useMemo(
    () => computeWorkHoursStats(timeBank, nowTick),
    [timeBank, nowTick],
  );

  const summary = useMemo(() => {
    const pendingTasks = tasks.filter((t) => isTaskDueToday(t));
    const inProgressTasks = pendingTasks.filter((t) => t.status === 'andamento');
    const dailyTasks = pendingTasks.filter((t) => t.frequency === 'Diária');
    const scheduledTasks = pendingTasks.filter(
      (t) =>
        t.frequency === 'Semanal' ||
        t.frequency === 'Pontual' ||
        t.frequency === 'Mensal',
    );

    const allWaves = activeCampaigns.flatMap((c) => c.waves);
    const unextractedWaves = allWaves.filter((w) => w.status === 'nao_extraido');
    const foodPendingWaves = activeCampaigns
      .filter((c) => c.front === '99 Food')
      .flatMap((c) => c.waves)
      .filter((w) => w.status === 'nao_extraido').length;
    const ridesPendingWaves = activeCampaigns
      .filter((c) => c.front === '99 Rides')
      .flatMap((c) => c.waves)
      .filter((w) => w.status === 'nao_extraido').length;
    const campaignsWithPending = activeCampaigns.filter((c) =>
      c.waves.some((w) => w.status === 'nao_extraido'),
    ).length;

    const pendingCampaignTodos = activeCampaigns.flatMap((c) =>
      c.todos.filter((td) => !td.done),
    );

    const estimate = estimateWorkspaceTime({
      tasks,
      activeCampaigns,
      timeBank,
    });

    const balanceMinutes = workStats.totalAvailableMinutes - estimate.totalEstimatedMinutes;

    const topPriorityNames = [
      ...inProgressTasks.slice(0, 2).map((t) => t.title),
      ...pendingTasks
        .filter((t) => t.status !== 'andamento')
        .slice(0, Math.max(0, 2 - inProgressTasks.length))
        .map((t) => t.title),
    ];

    return {
      pendingTasksCount: pendingTasks.length,
      inProgressCount: inProgressTasks.length,
      dailyCount: dailyTasks.length,
      scheduledCount: scheduledTasks.length,
      unextractedCount: unextractedWaves.length,
      foodPendingWaves,
      ridesPendingWaves,
      campaignsWithPending,
      pendingTodosCount: pendingCampaignTodos.length,
      tasksMinutes: estimate.tasksMinutes,
      wavesMinutes: estimate.wavesMinutes,
      todosMinutes: estimate.todosMinutes,
      totalEstimatedMinutes: estimate.totalEstimatedMinutes,
      balanceMinutes,
      topPriorityNames,
    };
  }, [tasks, activeCampaigns, timeBank, workStats.totalAvailableMinutes]);

  const greeting = getGreetingByBrasiliaHour(nowTick);
  const displayName = userName || 'Júlia';
  const fitsInBank = summary.balanceMinutes >= 0;

  const automatedBriefingText = useMemo(() => {
    const parts: string[] = [];

    if (
      summary.pendingTasksCount === 0 &&
      summary.unextractedCount === 0 &&
      summary.pendingTodosCount === 0
    ) {
      parts.push(
        `Tudo em dia por aqui, ${displayName}! Nenhuma tarefa pendente nem item não extraído no momento${
          doneTodayCount > 0 ? ` (${doneTodayCount} tarefa(s) concluída(s) hoje)` : ''
        }.`,
      );
    } else {
      if (summary.pendingTasksCount > 0) {
        const agendaDetails: string[] = [];
        if (summary.inProgressCount > 0) {
          agendaDetails.push(`${summary.inProgressCount} em andamento`);
        }
        if (summary.dailyCount > 0) agendaDetails.push(`${summary.dailyCount} diária(s)`);
        if (summary.scheduledCount > 0) {
          agendaDetails.push(`${summary.scheduledCount} pontual/semanal`);
        }
        parts.push(
          `Você tem ${summary.pendingTasksCount} tarefa(s) para hoje${
            agendaDetails.length > 0 ? ` (${agendaDetails.join(', ')})` : ''
          }.`,
        );
      } else {
        parts.push('Suas tarefas do checklist do dia estão zeradas.');
      }

      if (summary.unextractedCount > 0) {
        parts.push(
          `Em Campanhas Ativas, restam ${summary.unextractedCount} item(ns) não extraído(s) em ${summary.campaignsWithPending} campanha(s) (${summary.foodPendingWaves} em 99 Food e ${summary.ridesPendingWaves} em 99 Rides).`,
        );
      }

      if (summary.pendingTodosCount > 0) {
        parts.push(
          `Há também ${summary.pendingTodosCount} pendência(s) na lista de campanhas.`,
        );
      }
    }

    if (workStats.status === 'before') {
      parts.push(
        `Agora são ${workStats.brasiliaTimeFormatted}. Seu expediente começa às ${timeBank.workStart} (${formatDuration(
          workStats.totalAvailableMinutes,
        )} disponíveis hoje).`,
      );
    } else if (workStats.status === 'after') {
      parts.push(
        `Agora são ${workStats.brasiliaTimeFormatted}. Expediente encerrado às ${timeBank.workEnd}${
          timeBank.extraBankMinutes !== 0
            ? ` (saldo extra de ${formatDuration(timeBank.extraBankMinutes)})`
            : ''
        }.`,
      );
    } else {
      parts.push(
        `Agora são ${workStats.brasiliaTimeFormatted}: você está há ${formatDuration(
          workStats.workedMinutes,
        )} no trabalho e ainda tem ${formatDuration(
          workStats.totalAvailableMinutes,
        )} até as ${timeBank.workEnd}.`,
      );
    }

    if (summary.totalEstimatedMinutes > 0) {
      if (fitsInBank) {
        parts.push(
          `Tempo estimado das demandas: ${formatDuration(
            summary.totalEstimatedMinutes,
          )} — bate com o seu expediente com folga de ${formatDuration(
            summary.balanceMinutes,
          )}.`,
        );
      } else {
        parts.push(
          `Tempo estimado das demandas: ${formatDuration(
            summary.totalEstimatedMinutes,
          )} — ultrapassa o tempo restante em ${formatDuration(
            summary.balanceMinutes,
          )}.`,
        );
      }
    }

    return parts.join(' ');
  }, [
    summary,
    displayName,
    doneTodayCount,
    workStats,
    timeBank.workStart,
    timeBank.workEnd,
    timeBank.extraBankMinutes,
    fitsInBank,
  ]);

  async function handleGenerateAiBriefing() {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const response = await fetch('/api/dot-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            userName: displayName,
            greeting,
            brasiliaTime: workStats.brasiliaTimeFormatted,
            doneTodayCount,
            pendingTasksCount: summary.pendingTasksCount,
            inProgressCount: summary.inProgressCount,
            dailyCount: summary.dailyCount,
            scheduledCount: summary.scheduledCount,
            unextractedCount: summary.unextractedCount,
            foodPendingWaves: summary.foodPendingWaves,
            ridesPendingWaves: summary.ridesPendingWaves,
            campaignsWithPending: summary.campaignsWithPending,
            pendingTodosCount: summary.pendingTodosCount,
            estimatedTotal: formatDuration(summary.totalEstimatedMinutes),
            estimatedTasks: formatDuration(summary.tasksMinutes),
            estimatedExtractions: formatDuration(summary.wavesMinutes),
            workSchedule: `${timeBank.workStart} - ${timeBank.workEnd}`,
            workedToday: formatDuration(workStats.workedMinutes),
            remainingWorkTime: formatDuration(workStats.totalAvailableMinutes),
            balance: fitsInBank
              ? `folga de ${formatDuration(summary.balanceMinutes)}`
              : `excede em ${formatDuration(summary.balanceMinutes)}`,
          },
        }),
      });
      const data = (await response.json()) as { ok?: boolean; summary?: string };
      if (response.ok && data.ok && data.summary) {
        setAiSummary(data.summary);
      } else {
        setAiSummary(null);
      }
    } catch {
      setAiSummary(null);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="bg-gradient-to-br from-[#151d18] via-[#131a16] to-[#0f1512] border border-[#C5A66B]/35 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-[#0b100d] border border-[#C5A66B]/45 flex items-center justify-center shrink-0 shadow-sm">
            <ChatDotAntSvg className="w-5 h-5 text-[#C5A66B]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs sm:text-sm font-extrabold text-[#EDE9DE]">
                {greeting}, {displayName}!
              </span>
              <span
                className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#C5A66B] tabular-nums"
                title="Relógio de Brasília"
              >
                <Clock className="w-3.5 h-3.5 text-[#C5A66B]" />
                <span>{workStats.brasiliaTimeFormatted}</span>
              </span>
            </div>
            {collapsed && (
              <p className="text-[11px] text-[#A9B99D] mt-0.5 truncate">
                {summary.pendingTasksCount} tarefa(s) · {summary.unextractedCount} não extraído(s) · Estimado: {formatDuration(summary.totalEstimatedMinutes)} · Restam no trabalho: {formatDuration(workStats.totalAvailableMinutes)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {!collapsed && (
            <button
              type="button"
              onClick={() => void handleGenerateAiBriefing()}
              disabled={aiLoading}
              className="btn-press px-2.5 py-1.5 rounded-xl bg-[#0b100d] hover:bg-[#1b251f] disabled:opacity-60 text-[#EDE9DE] text-[11px] font-semibold border border-[#777F89]/50 flex items-center gap-1.5 cursor-pointer"
              title="Gerar leitura inteligente"
            >
              <Sparkles className={`w-3.5 h-3.5 text-[#C5A66B] ${aiLoading ? 'animate-pulse' : ''}`} />
              <span>{aiLoading ? 'Analisando...' : aiSummary ? 'Atualizar IA' : 'Resumo IA'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleCollapsed}
            className="btn-press h-8 w-8 rounded-xl bg-[#0b100d] hover:bg-[#1b251f] border border-[#777F89]/50 text-[#A9B99D] hover:text-[#EDE9DE] flex items-center justify-center cursor-pointer"
            title={collapsed ? 'Expandir resumo' : 'Recolher resumo'}
            aria-label={collapsed ? 'Expandir resumo' : 'Recolher resumo'}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Texto contextual */}
          <div className="p-3.5 rounded-xl bg-[#0b100d]/85 border border-[#777F89]/40 text-xs text-[#EDE9DE] leading-relaxed space-y-2">
            <p>{aiSummary || automatedBriefingText}</p>

            {summary.topPriorityNames.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-[#A9B99D]">
                <span className="font-semibold text-[#C5A66B]">Em foco agora:</span>
                {summary.topPriorityNames.map((title, idx) => (
                  <span
                    key={`${title}-${idx}`}
                    className="px-2 py-0.5 rounded-md bg-[#151d18] border border-[#777F89]/35 text-[#EDE9DE] truncate max-w-[240px]"
                  >
                    {title}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Grid compacto de indicadores (2 colunas no mobile, 4 no desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-[#0b100d] border border-[#777F89]/35 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#A9B99D]">
                <span>Tarefas Hoje</span>
                <ListChecks className="w-3.5 h-3.5 text-[#C5A66B]" />
              </div>
              <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-[#EDE9DE]">
                {summary.pendingTasksCount}
              </div>
            </div>

            <button
              type="button"
              onClick={onGoToCampaigns}
              className="p-3 rounded-xl bg-[#0b100d] hover:bg-[#1b251f]/70 border border-rose-500/35 space-y-1 text-left transition cursor-pointer"
            >
              <div className="flex items-center justify-between text-[11px] text-rose-300 font-semibold">
                <span>Não Extraídos</span>
                <Megaphone className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-rose-300">
                {summary.unextractedCount}
              </div>
            </button>

            <div className="p-3 rounded-xl bg-[#0b100d] border border-[#777F89]/35 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#A9B99D]">
                <span>Tempo Estimado</span>
                <Hourglass className="w-3.5 h-3.5 text-[#C5A66B]" />
              </div>
              <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-[#C5A66B]">
                {formatDuration(summary.totalEstimatedMinutes)}
              </div>
            </div>

            <div
              className={`p-3 rounded-xl bg-[#0b100d] border space-y-1 ${
                fitsInBank ? 'border-emerald-500/35' : 'border-amber-500/45'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-[#A9B99D]">
                <span>Resta no Trabalho</span>
                {fitsInBank ? (
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                )}
              </div>
              <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-[#EDE9DE]">
                {formatDuration(workStats.totalAvailableMinutes)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
