import { useMemo } from 'react';
import { addDays } from '../domain/dates';
import { creditFor, entryOf, plannedOn, pointsFor, scoreDay, weeklyCount, type DayScore } from '../domain/score';
import { isWeekly, weeklyTarget } from '../domain/schedule';
import { commitmentStreak, keptRate, personalStreak } from '../domain/streaks';
import { coachLine, leanFor } from '../domain/tone';
import type { Commitment, DateKey, DayRecord, Entry } from '../domain/types';
import { useTendo } from './store';

export const MIN_RATED_DAYS = 5;

export interface PlannedItem {
  c: Commitment;
  entry: Entry;
  weekly: boolean;
  weekCount: number;
  weekTarget: number;
  /** 0–1 visual progress (bar) for measurable/weekly items. */
  fraction: number;
  done: boolean;
  skipped: boolean;
  streak: number;
  kept: number | null;
  points: number;
}

export interface TodayModel {
  today: DateKey;
  day: DayRecord | undefined;
  planned: PlannedItem[];
  score: DayScore;
  /** Required items not yet at full credit. */
  left: number;
  closedDays: number;
  tooNew: boolean;
  average: number | null;
  delta: number | null;
  coach: string;
  streak: { current: number; best: number };
}

function closedScored(days: Record<DateKey, DayRecord>, today: DateKey, n: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= n; i++) {
    const s = days[addDays(today, -i)]?.summary;
    if (s?.status === 'scored' && s.score !== null) out.push(s.score);
  }
  return out;
}

export function buildTodayModel(commitments: Commitment[], days: Record<DateKey, DayRecord>, today: DateKey, tone: Parameters<typeof leanFor>[0]): TodayModel {
  const day = days[today];
  const planned: PlannedItem[] = plannedOn(commitments, today).map(c => {
    const entry = entryOf(day, c.id);
    const weekly = isWeekly(c, today);
    const weekCount = weekly ? weeklyCount(c, days, today) : 0;
    const weekTarget = weekly ? weeklyTarget(c, today) : 0;
    const credit = creditFor(c, entry);
    return {
      c, entry, weekly, weekCount, weekTarget,
      fraction: weekly ? Math.min(1, weekCount / weekTarget) : credit,
      done: entry.state === 'done', skipped: entry.state === 'skipped',
      streak: commitmentStreak(c, days, today),
      kept: keptRate(c, days, today, 30),
      points: pointsFor(c.weight),
    };
  })
    // A weekly target already met on earlier days drops off Today for the rest of the week.
    .filter(i => !i.weekly || i.done || i.weekCount < i.weekTarget);
  const score = scoreDay(commitments, day, today);
  const left = score.items.filter(i => i.credit < 1).length;
  const closedDays = Object.values(days).filter(d => d.closed).length;
  const tooNew = closedDays < MIN_RATED_DAYS;
  const history = closedScored(days, today, 30);
  const average = history.length ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) : null;
  const delta = score.score !== null && average !== null ? score.score - average : null;
  const coach = coachLine({
    lean: leanFor(tone, day?.mood ?? null), planned: planned.length, due: score.items.length, left, recovery: !!day?.recovery,
  });
  return { today, day, planned, score, left, closedDays, tooNew, average, delta, coach, streak: personalStreak(days, today) };
}

export function useTodayModel(): TodayModel {
  const commitments = useTendo(s => s.commitments);
  const days = useTendo(s => s.days);
  const today = useTendo(s => s.today);
  const tone = useTendo(s => s.settings.tone);
  return useMemo(() => buildTodayModel(commitments, days, today, tone), [commitments, days, today, tone]);
}

export function scoreHeadline(m: TodayModel): { text: string; sub: string; fraction: number } {
  if (m.day?.recovery) return { text: '—', sub: 'Recovery day · no score today', fraction: 0 };
  if (m.score.score === null) return { text: '—', sub: 'Nothing due today', fraction: 0 };
  if (m.tooNew) return { text: '—', sub: 'Too new to rate · day ' + Math.min(MIN_RATED_DAYS, m.closedDays + 1) + ' of ' + MIN_RATED_DAYS, fraction: m.score.score / 100 };
  const sub = m.delta === null ? 'Your first rated day' : (m.delta >= 0 ? '+' + m.delta : String(m.delta)) + ' vs your 30-day average';
  return { text: String(m.score.score), sub, fraction: m.score.score / 100 };
}

/** Day number since the account started, as shown in the header ("DAY 46"). */
export function useDayNumber(): number {
  const start = useTendo(s => s.account?.startedOn);
  const today = useTendo(s => s.today);
  if (!start) return 1;
  let n = 1;
  for (let d = start; d < today; d = addDays(d, 1)) n++;
  return n;
}
