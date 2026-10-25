import { addDays, weekStart } from './dates';
import { isActiveOn, isScheduledOn, isWeekly, weeklyTarget } from './schedule';
import { entryOf, weeklyCount } from './score';
import type { Commitment, DateKey, DayRecord } from './types';

const LOOKBACK = 400;

/**
 * Consecutive scheduled occurrences kept. Skip and optional preserve without incrementing;
 * today only counts once it is done, and an unfinished today never breaks the run (PRD §16).
 */
export function commitmentStreak(c: Commitment, days: Record<DateKey, DayRecord>, today: DateKey): number {
  if (isWeekly(c, today)) return weeklyStreak(c, days, today);
  let streak = 0;
  for (let i = 0; i < LOOKBACK; i++) {
    const d = addDays(today, -i);
    if (d < c.createdOn) break;
    if (!isActiveOn(c, d) || !isScheduledOn(c, d)) continue;
    const rec = days[d];
    if (rec?.recovery) continue;
    const e = entryOf(rec, c.id);
    if (e.state === 'skipped' || e.optional) continue;
    const item = rec?.summary?.items.find(x => x.id === c.id);
    const kept = item ? item.outcome === 'completed' : e.state === 'done' || (c.target != null && e.progress >= c.target);
    if (kept) { streak++; continue; }
    if (d === today) continue;
    break;
  }
  return streak;
}

/** Weekly-target streaks count successful weeks; the current week counts once met. */
function weeklyStreak(c: Commitment, days: Record<DateKey, DayRecord>, today: DateKey): number {
  let streak = 0;
  let wk = weekStart(today);
  for (let i = 0; i < 60; i++) {
    const end = i === 0 ? today : addDays(wk, 6);
    if (end < c.createdOn) break;
    const met = weeklyCount(c, days, end) >= weeklyTarget(c, end);
    if (met) streak++;
    else if (i > 0) break;
    wk = addDays(wk, -7);
  }
  return streak;
}

export function bestCommitmentStreak(c: Commitment, days: Record<DateKey, DayRecord>, today: DateKey): number {
  let best = 0;
  let run = 0;
  for (let d = c.createdOn; d <= today; d = addDays(d, 1)) {
    if (!isActiveOn(c, d) || !isScheduledOn(c, d) || isWeekly(c, d)) continue;
    const rec = days[d];
    if (rec?.recovery) continue;
    const e = entryOf(rec, c.id);
    if (e.state === 'skipped' || e.optional) continue;
    const item = rec?.summary?.items.find(x => x.id === c.id);
    const kept = item ? item.outcome === 'completed' : e.state === 'done';
    if (kept) { run++; best = Math.max(best, run); } else if (d !== today) run = 0;
  }
  return Math.max(best, commitmentStreak(c, days, today));
}

/**
 * Personal streak: closed days at or above the success threshold. Recovery, travel and
 * empty days preserve it without incrementing; a scored day below threshold resets.
 */
export function personalStreak(days: Record<DateKey, DayRecord>, today: DateKey): { current: number; best: number } {
  const keys = Object.keys(days).filter(k => k < today && days[k].closed).sort();
  let run = 0;
  let best = 0;
  for (const k of keys) {
    const s = days[k].summary;
    if (!s || s.status !== 'scored') continue;
    if (s.success) { run++; best = Math.max(best, run); } else run = 0;
  }
  return { current: run, best };
}

/** Share of scheduled occurrences kept over the last `n` days (null when none). */
export function keptRate(c: Commitment, days: Record<DateKey, DayRecord>, today: DateKey, n: number): number | null {
  let occ = 0;
  let kept = 0;
  for (let i = 1; i <= n; i++) {
    const d = addDays(today, -i);
    if (d < c.createdOn) break;
    const item = days[d]?.summary?.items.find(x => x.id === c.id);
    if (!item) continue;
    occ++;
    if (item.outcome === 'completed') kept++;
  }
  return occ ? kept / occ : null;
}

export type DotState = 'kept' | 'missed' | 'skipped' | 'off' | 'today' | 'none';

/** Last 14 days for the detail grid, oldest first. */
export function recentDots(c: Commitment, days: Record<DateKey, DayRecord>, today: DateKey, n = 14): { date: DateKey; state: DotState }[] {
  const out: { date: DateKey; state: DotState }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const rec = days[d];
    const e = entryOf(rec, c.id);
    let state: DotState = 'none';
    if (d < c.createdOn) state = 'none';
    else if (d === today) state = e.state === 'done' ? 'kept' : e.state === 'skipped' ? 'skipped' : 'today';
    else if (e.state === 'skipped') state = 'skipped';
    else {
      const item = rec?.summary?.items.find(x => x.id === c.id);
      state = item ? (item.outcome === 'completed' ? 'kept' : 'missed') : e.state === 'done' ? 'kept' : 'off';
    }
    out.push({ date: d, state });
  }
  return out;
}
