import { addDays } from './dates';
import { emptyDay, scoreDay, summarize } from './score';
import type { Commitment, DateKey, DayRecord } from './types';

export const WEIGHT_WINDOW_DAYS = 30;
export const WEIGHT_MIN_OCCURRENCES = 5;
export const WEIGHT_CAP = 2;

/**
 * Adaptive weight = 1 + miss rate over the last 30 days, rounded to 0.1 and capped at ×2.0.
 * Commitments with fewer than 5 scored occurrences stay at ×1.0 (PRD §15).
 */
export function adaptiveWeight(id: string, days: Record<DateKey, DayRecord>, asOf: DateKey): number {
  let occurrences = 0;
  let kept = 0;
  for (let i = 0; i < WEIGHT_WINDOW_DAYS; i++) {
    const s = days[addDays(asOf, -i)]?.summary;
    const item = s?.items.find(x => x.id === id);
    if (!item) continue;
    occurrences++;
    if (item.outcome === 'completed') kept++;
  }
  if (occurrences < WEIGHT_MIN_OCCURRENCES) return 1;
  const w = Math.round((1 + (1 - kept / occurrences)) * 10) / 10;
  return Math.min(WEIGHT_CAP, w);
}

export interface CloseInput {
  commitments: Commitment[];
  days: Record<DateKey, DayRecord>;
  /** First Tendo day of the account; nothing before it is closed. */
  since: DateKey;
  today: DateKey;
  threshold: number;
}

/**
 * Closes every unclosed Tendo day before `today`, oldest first. Each close freezes the day's
 * summary, then updates weights so the next day is scored with them. Days the app never
 * opened are materialised so missed commitments are recorded honestly.
 */
export function closeDays(input: CloseInput): { commitments: Commitment[]; days: Record<DateKey, DayRecord>; closed: DateKey[] } {
  let commitments = input.commitments;
  const days = { ...input.days };
  const closed: DateKey[] = [];
  let d = input.since;
  // Skip forward past days already closed so long gaps stay cheap.
  while (d < input.today && days[d]?.closed) d = addDays(d, 1);
  for (; d < input.today; d = addDays(d, 1)) {
    const rec = days[d] ?? emptyDay(d);
    if (rec.closed) continue;
    const summary = summarize(scoreDay(commitments, rec, d), rec.recovery, input.threshold);
    days[d] = { ...rec, closed: true, summary };
    closed.push(d);
    commitments = commitments.map(c => ({ ...c, weight: adaptiveWeight(c.id, days, d) }));
  }
  return { commitments, days, closed };
}
