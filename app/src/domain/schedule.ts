import { daysBetween, weekday, weekStart } from './dates';
import type { Commitment, DateKey, SchedulePattern, ScheduleVersion, Weekday } from './types';

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** The four cadence pills on Add commitment; Custom opens the schedule screen. */
export const CADENCES = ['Every day', 'Weekdays', '3× a week', 'Custom'] as const;
export type Cadence = (typeof CADENCES)[number];

export function cadencePattern(c: Cadence): SchedulePattern | null {
  switch (c) {
    case 'Every day': return { kind: 'daily' };
    case 'Weekdays': return { kind: 'weekdays' };
    case '3× a week': return { kind: 'perWeek', times: 3 };
    case 'Custom': return null;
  }
}

export function patternCadence(p: SchedulePattern): Cadence {
  if (p.kind === 'daily') return 'Every day';
  if (p.kind === 'weekdays') return 'Weekdays';
  if (p.kind === 'perWeek' && p.times === 3) return '3× a week';
  return 'Custom';
}

/** Lower-case label used in meta lines: `every day`, `Mon, Wed, Fri`, `3× a week`. */
export function patternLabel(p: SchedulePattern): string {
  switch (p.kind) {
    case 'daily': return 'every day';
    case 'weekdays': return 'weekdays';
    case 'weekends': return 'weekends';
    case 'days': return p.days.length ? [...p.days].sort().map(d => WEEKDAY_SHORT[d]).join(', ') : 'no days';
    case 'perWeek': return p.times + '× a week';
    case 'interval': return 'every ' + p.every + ' days';
  }
}

/** Weekly-target commitments are measured on the week, never in the daily score (PRD §13). */
export function isWeeklyPattern(p: SchedulePattern): boolean {
  return p.kind === 'perWeek';
}

export function scheduleOn(c: Commitment, date: DateKey): ScheduleVersion | null {
  let found: ScheduleVersion | null = null;
  for (const v of c.schedules) if (v.effectiveFrom <= date) found = v;
  return found ?? c.schedules[0] ?? null;
}

export function currentSchedule(c: Commitment): ScheduleVersion {
  return c.schedules[c.schedules.length - 1];
}

function patternHits(p: SchedulePattern, date: DateKey, start: DateKey): boolean {
  const wd: Weekday = weekday(date);
  switch (p.kind) {
    case 'daily': return true;
    case 'weekdays': return wd < 5;
    case 'weekends': return wd >= 5;
    case 'days': return p.days.includes(wd);
    case 'perWeek': return true;
    case 'interval': return daysBetween(start, date) % p.every === 0;
  }
}

/** Is the commitment's lifecycle letting it appear on `date`? */
export function isActiveOn(c: Commitment, date: DateKey): boolean {
  if (date < c.createdOn) return false;
  if (c.lifecycle === 'archived') return false;
  if (c.lifecycle === 'paused') return c.pausedUntil !== null && date >= c.pausedUntil;
  return true;
}

/** Scheduled by pattern and date range, ignoring pause/archive. */
export function isScheduledOn(c: Commitment, date: DateKey): boolean {
  const v = scheduleOn(c, date);
  if (!v) return false;
  if (date < v.startDate) return false;
  if (v.endDate && date > v.endDate) return false;
  return patternHits(v.pattern, date, v.startDate);
}

export function isDueOn(c: Commitment, date: DateKey): boolean {
  return isActiveOn(c, date) && isScheduledOn(c, date);
}

export function isWeekly(c: Commitment, date: DateKey): boolean {
  const v = scheduleOn(c, date);
  return !!v && isWeeklyPattern(v.pattern);
}

export function weeklyTarget(c: Commitment, date: DateKey): number {
  const v = scheduleOn(c, date);
  return v && v.pattern.kind === 'perWeek' ? v.pattern.times : 1;
}

export { weekStart };

export function scheduleSummary(p: SchedulePattern, timeLabel: string, start: string, end: string | null): string {
  const when = p.kind === 'days'
    ? 'Due ' + (p.days.length ? patternLabel(p) : 'no days yet')
    : p.kind === 'perWeek'
      ? 'Due ' + p.times + (p.times === 1 ? ' time' : ' times') + ' a week, any days'
      : 'Due ' + patternLabel(p);
  return when + ' · ' + timeLabel.toLowerCase() + ', starting ' + start + (end ? ' until ' + end : '') + '.';
}
