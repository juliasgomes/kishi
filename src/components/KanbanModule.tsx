import { useState, type DragEvent } from 'react';
import {
  Car,
  CheckCircle2,
  Circle,
  Clock,
  Link as LinkIcon,
  Plus,
  RefreshCw,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import type { KishiTask, TaskStatus } from '@/src/types/kishi';
import { getChannelColor, getFrontStyle } from '@/src/utils/channelColors';
import { getTaskScheduleLabel } from '@/src/utils/taskSchedule';

interface KanbanModuleProps {
  tasks: KishiTask[];
  onOpenNewTask: () => void;
  onOpenEditTask: (task: KishiTask) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, targetStatus: TaskStatus) => void;
}

const COLUMNS: Array<{
  id: TaskStatus;
  label: string;
  accent?: boolean;
}> = [
  { id: 'afazer', label: 'A Fazer' },
  { id: 'andamento', label: 'Em Andamento', accent: true },
  { id: 'rotina', label: 'Rotina' },
  { id: 'concluido', label: 'Concluído' },
];

export function KanbanModule({
  tasks,
  onOpenNewTask,
  onOpenEditTask,
  onDeleteTask,
  onMoveTask,
}: KanbanModuleProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [mobileColTab, setMobileColTab] = useState<TaskStatus>('afazer');

  function renderColIcon(id: TaskStatus) {
    switch (id) {
      case 'afazer':
        return <Circle className="w-3.5 h-3.5 text-[#A9B99D]" />;
      case 'andamento':
        return <Clock className="w-3.5 h-3.5 text-[#C5A66B]" />;
      case 'rotina':
        return <RefreshCw className="w-3.5 h-3.5 text-[#A9B99D]" />;
      case 'concluido':
        return <CheckCircle2 className="w-3.5 h-3.5 text-[#A9B99D]" />;
    }
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, taskId: string) {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragEnd() {
    setDraggedTaskId(null);
    setDragOverCol(null);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>, colId: TaskStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) setDragOverCol(colId);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, targetStatus: TaskStatus) {
    e.preventDefault();
    const taskId = draggedTaskId || e.dataTransfer.getData('text/plain');
    setDraggedTaskId(null);
    setDragOverCol(null);
    if (taskId) {
      onMoveTask(taskId, targetStatus);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#EDE9DE]">Quadro de Tarefas</h1>
          <p className="text-xs text-[#A9B99D] mt-0.5">
            Clique no card para editar ou segure e arraste entre as colunas.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenNewTask}
          className="btn-press px-3.5 py-2 rounded-xl bg-[#C5A66B] hover:bg-[#d5b880] text-[#0f1512] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Tarefa</span>
        </button>
      </div>

      <div className="md:hidden grid grid-cols-4 gap-1 p-1 bg-[#151d18] border border-[#777F89]/40 rounded-xl">
        {COLUMNS.map((col) => {
          const count = tasks.filter((t) => t.status === col.id).length;
          const active = mobileColTab === col.id;
          return (
            <button
              key={`mob-tab-${col.id}`}
              type="button"
              onClick={() => setMobileColTab(col.id)}
              className={`py-2 px-1.5 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer ${
                active
                  ? 'bg-[#0b100d] text-[#C5A66B] border border-[#777F89]/50'
                  : 'text-[#A9B99D]'
              }`}
            >
              <span className="truncate">
                {col.id === 'andamento' ? 'Andam.' : col.id === 'concluido' ? 'Feito' : col.label}
              </span>
              <span className="font-mono text-[10px] opacity-80 tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:overflow-x-auto pb-4 md:pb-6 pt-1">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const isOver = dragOverCol === col.id;
          const isMobileActive = mobileColTab === col.id;

          return (
            <div
              key={col.id}
              className={`${
                isMobileActive ? 'flex' : 'hidden md:flex'
              } w-full md:min-w-[290px] md:max-w-[330px] flex-1 min-h-[340px] md:min-h-[calc(100vh-15rem)] flex-shrink-0 bg-[#151d18] border border-[#777F89]/40 rounded-2xl p-3.5 flex-col gap-3`}
            >
              <div
                className={`flex justify-between items-center text-xs font-bold border-b border-[#777F89]/40 pb-2 ${
                  col.accent
                    ? 'text-[#C5A66B]'
                    : col.id === 'concluido'
                      ? 'text-[#A9B99D]'
                      : 'text-[#EDE9DE]'
                }`}
              >
                <span className="flex items-center gap-2">
                  {renderColIcon(col.id)}
                  <span>{col.label}</span>
                </span>
                <span className="text-[11px] font-mono tabular-nums text-[#A9B99D]">
                  {colTasks.length}
                </span>
              </div>

              <div
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverCol(null);
                  }
                }}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col gap-2.5 flex-1 p-1 rounded-xl transition-colors ${
                  isOver ? 'bg-[#A9B99D]/10 ring-1 ring-[#A9B99D]/60' : ''
                }`}
              >
                {colTasks.length === 0 ? (
                  <div className="flex-1 min-h-[120px] flex items-center justify-center text-[11px] text-[#777F89] border border-dashed border-[#777F89]/25 rounded-xl p-4 text-center">
                    Arraste tarefas para cá
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const isDragging = draggedTaskId === task.id;
                    const isRides = task.product.toLowerCase().includes('rides');
                    const isFood = task.product.toLowerCase().includes('food');
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onOpenEditTask(task)}
                        className={`interactive-card bg-[#0b100d] border border-[#777F89]/40 rounded-xl p-3.5 space-y-2 cursor-grab active:cursor-grabbing select-none ${
                          isDragging ? 'opacity-40 scale-95' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] gap-2">
                          <span
                            className={`font-mono font-bold inline-flex items-center gap-1 ${getFrontStyle(task.product).textClass}`}
                          >
                            {isRides && <Car className="w-3 h-3 shrink-0" />}
                            {isFood && <UtensilsCrossed className="w-3 h-3 shrink-0" />}
                            <span>
                              {task.product} · {getTaskScheduleLabel(task)}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTask(task.id);
                            }}
                            className="btn-press text-[#A9B99D] hover:text-rose-400 p-1 cursor-pointer"
                            title="Excluir tarefa"
                            aria-label={`Excluir tarefa ${task.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <h5 className="text-xs font-bold text-[#EDE9DE] leading-snug">
                          {task.title}
                        </h5>

                        {(task.channelName || task.tag) && (
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                            {task.channelName && (
                              <span
                                className={`font-semibold flex items-center gap-1 ${
                                  getChannelColor(task.channelName).textClass
                                }`}
                              >
                                <LinkIcon className="w-3 h-3 shrink-0" />
                                <span className="truncate">{task.channelName}</span>
                              </span>
                            )}
                            {task.tag && (
                              <span className="text-[#C5A66B] font-semibold">#{task.tag}</span>
                            )}
                          </div>
                        )}

                        {task.completedAt && (
                          <div className="text-[11px] text-[#A9B99D] font-mono flex items-center gap-1 tabular-nums">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>Concluído às {task.completedAt}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
