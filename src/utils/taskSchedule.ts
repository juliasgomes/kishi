import type { KishiTask } from '@/src/types/kishi';
import { getBrasiliaTimeParts } from '@/src/utils/workHours';

export function getBrasiliaTodayISO(now: Date = new Date()): string {
  const brt = getBrasiliaTimeParts(now);
  return `${brt.year}-${String(brt.month).padStart(2, '0')}-${String(brt.day).padStart(2, '0')}`;
}

export function formatShortDateBR(isoDate?: string): string {
  if (!isoDate) return '';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  return `${match[3]}/${match[2]}`;
}

export function isMonthlyDayMatch(
  monthlyDay: number | undefined,
  year: number,
  month: number,
  day: number,
): boolean {
  if (!monthlyDay || monthlyDay < 1 || monthlyDay > 31) return false;
  const daysInMonth = new Date(year, month, 0).getDate();
  const effectiveDay = Math.min(monthlyDay, daysInMonth);
  return day === effectiveDay;
}

export function isTaskDueToday(task: KishiTask, now: Date = new Date()): boolean {
  if (task.status === 'concluido') return false;

  const brt = getBrasiliaTimeParts(now);
  const todayISO = `${brt.year}-${String(brt.month).padStart(2, '0')}-${String(brt.day).padStart(2, '0')}`;

  if (task.frequency === 'Mensal' && task.monthlyDay) {
    if (task.status === 'afazer' || task.status === 'andamento') return true;
    return isMonthlyDayMatch(task.monthlyDay, brt.year, brt.month, brt.day);
  }

  if (task.scheduledDate) {
    if (task.status === 'afazer' || task.status === 'andamento') return true;
    return todayISO >= task.scheduledDate;
  }

  return true;
}

export function isTaskScheduledForDate(
  task: KishiTask,
  isoDate: string,
  now: Date = new Date(),
): boolean {
  if (!isoDate) return isTaskDueToday(task, now);
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isTaskDueToday(task, now);

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);

  if (task.frequency === 'Diária') return true;
  if (task.frequency === 'Mensal' && task.monthlyDay) {
    return isMonthlyDayMatch(task.monthlyDay, year, month, day);
  }
  if (task.scheduledDate) {
    return task.scheduledDate === isoDate;
  }
  return isoDate === getBrasiliaTodayISO(now);
}

export function getTaskScheduleLabel(task: KishiTask): string {
  if (task.frequency === 'Mensal' && task.monthlyDay) {
    return `Todo dia ${task.monthlyDay}`;
  }
  if (task.scheduledDate) {
    return `Dia ${formatShortDateBR(task.scheduledDate)}`;
  }
  return task.frequency;
}
