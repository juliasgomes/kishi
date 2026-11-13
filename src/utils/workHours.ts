import type { KishiTimeBank } from '@/src/types/kishi';

export interface BrasiliaTimeParts {
  year: number;
  month: number;
  day: number;
  weekdayIndex: number;
  hours: number;
  minutes: number;
  seconds: number;
  formattedHHMM: string;
  formattedDate: string;
  formattedDateHeader: string;
  totalMinutes: number;
}

export interface WorkHoursStats {
  status: 'before' | 'working' | 'after';
  netShiftMinutes: number;
  workedMinutes: number;
  remainingShiftMinutes: number;
  totalAvailableMinutes: number;
  brasiliaTimeFormatted: string;
}

const WEEKDAYS_PT = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const WEEKDAY_EN_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getBrasiliaTimeParts(now: Date = new Date()): BrasiliaTimeParts {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(now);
    const map: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== 'literal') {
        map[part.type] = part.value;
      }
    }

    const year = Number.parseInt(map.year || String(now.getFullYear()), 10);
    const month = Number.parseInt(map.month || String(now.getMonth() + 1), 10);
    const day = Number.parseInt(map.day || String(now.getDate()), 10);
    const rawHour = Number.parseInt(map.hour || '0', 10);
    const hours = rawHour === 24 ? 0 : rawHour;
    const minutes = Number.parseInt(map.minute || '0', 10);
    const seconds = Number.parseInt(map.second || '0', 10);
    const weekdayIndex = WEEKDAY_EN_TO_INDEX[map.weekday || ''] ?? now.getDay();

    const formattedHHMM = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const formattedDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    const formattedDateHeader = `${WEEKDAYS_PT[weekdayIndex]}, ${formattedDate}`;

    return {
      year,
      month,
      day,
      weekdayIndex,
      hours,
      minutes,
      seconds,
      formattedHHMM,
      formattedDate,
      formattedDateHeader,
      totalMinutes: hours * 60 + minutes,
    };
  } catch {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const formattedHHMM = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      weekdayIndex: now.getDay(),
      hours,
      minutes,
      seconds: now.getSeconds(),
      formattedHHMM,
      formattedDate,
      formattedDateHeader: `${WEEKDAYS_PT[now.getDay()]}, ${formattedDate}`,
      totalMinutes: hours * 60 + minutes,
    };
  }
}

function parseTimeToMinutes(hhmm: string, fallbackMinutes: number): number {
  const match = (hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallbackMinutes;
  const h = Math.max(0, Math.min(23, Number.parseInt(match[1], 10)));
  const m = Math.max(0, Math.min(59, Number.parseInt(match[2], 10)));
  return h * 60 + m;
}

export function formatDuration(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? '-' : '';
  const abs = Math.max(0, Math.round(Math.abs(totalMinutes)));
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  if (hours === 0) return `${sign}${mins}min`;
  if (mins === 0) return `${sign}${hours}h`;
  return `${sign}${hours}h ${String(mins).padStart(2, '0')}min`;
}

export function computeWorkHoursStats(
  timeBank: KishiTimeBank,
  now: Date = new Date(),
): WorkHoursStats {
  const brt = getBrasiliaTimeParts(now);

  const startMin = parseTimeToMinutes(timeBank.workStart, 9 * 60);
  let endMin = parseTimeToMinutes(timeBank.workEnd, 18 * 60);
  if (endMin <= startMin) {
    endMin += 24 * 60;
  }

  const totalSpan = endMin - startMin;
  const breakMin = Math.max(0, Math.min(totalSpan, timeBank.breakMinutes || 0));
  const netShiftMinutes = Math.max(0, totalSpan - breakMin);

  let nowMin = brt.totalMinutes;
  if (endMin > 24 * 60 && nowMin < startMin) {
    nowMin += 24 * 60;
  }

  let status: WorkHoursStats['status'] = 'working';
  let workedMinutes = 0;
  let remainingShiftMinutes = 0;

  if (nowMin < startMin) {
    status = 'before';
    workedMinutes = 0;
    remainingShiftMinutes = netShiftMinutes;
  } else if (nowMin >= endMin) {
    status = 'after';
    workedMinutes = netShiftMinutes;
    remainingShiftMinutes = 0;
  } else {
    status = 'working';
    const rawElapsed = nowMin - startMin;
    const rawRemaining = endMin - nowMin;

    if (breakMin === 0) {
      workedMinutes = rawElapsed;
      remainingShiftMinutes = rawRemaining;
    } else {
      const breakCenter = startMin + Math.floor(totalSpan / 2);
      const breakStart = breakCenter - Math.floor(breakMin / 2);
      const breakEnd = breakStart + breakMin;

      if (nowMin <= breakStart) {
        workedMinutes = rawElapsed;
        remainingShiftMinutes = Math.max(0, rawRemaining - breakMin);
      } else if (nowMin >= breakEnd) {
        workedMinutes = Math.max(0, rawElapsed - breakMin);
        remainingShiftMinutes = rawRemaining;
      } else {
        workedMinutes = Math.max(0, breakStart - startMin);
        remainingShiftMinutes = Math.max(0, endMin - breakEnd);
      }
    }
  }

  const extra = timeBank.extraBankMinutes || 0;
  const totalAvailableMinutes = Math.max(0, remainingShiftMinutes + extra);

  return {
    status,
    netShiftMinutes,
    workedMinutes,
    remainingShiftMinutes,
    totalAvailableMinutes,
    brasiliaTimeFormatted: brt.formattedHHMM,
  };
}
