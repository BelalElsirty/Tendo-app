import { addDays, weekStart } from './dates';
import { isDueOn, isWeekly, weeklyTarget } from './schedule';
import type { ClosedItem, Commitment, DateKey, DayRecord, DaySummary, Entry, ItemOutcome } from './types';

export const NEW_ENTRY: Entry = { state: 'pending', progress: 0, optional: false };

export function emptyDay(date: DateKey): DayRecord {
  return {
    date, entries: {}, mood: null, moodEdited: false, checkinDone: false, priorityId: null,
    recovery: false, closed: false, summary: null, editedAfterClose: false,
  };
}

export function entryOf(day: DayRecord | undefined, id: string): Entry {
  return day?.entries[id] ?? NEW_ENTRY;
}

export function pointsFor(weight: number): number {
  return Math.round(weight * 10);
}

/** 0–1 credit for one entry. Amount and duration are always proportional (PRD decision 11). */
export function creditFor(c: Commitment, e: Entry): number {
  if (e.state === 'done') return 1;
  if ((c.track === 'amount' || c.track === 'duration') && c.target) {
    return Math.min(1, Math.max(0, e.progress / c.target));
  }
  return 0;
}

/** Completions this week (Mon–`date`) for a weekly-target commitment. */
export function weeklyCount(c: Commitment, days: Record<DateKey, DayRecord>, date: DateKey): number {
  let n = 0;
  for (let d = weekStart(date); d <= date; d = addDays(d, 1)) {
    if (entryOf(days[d], c.id).state === 'done') n++;
  }
  return n;
}

export interface ScoredItem {
  commitment: Commitment;
  entry: Entry;
  points: number;
  credit: number;
  earned: number;
}

export interface DayScore {
  items: ScoredItem[];
  skipped: Commitment[];
  earned: number;
  possible: number;
  /** `null` when nothing is due — show "—", never 100% (PRD decision 17). */
  score: number | null;
}

/**
 * The commitments that appear on a given day: due by schedule and lifecycle.
 * Weekly-target items stay visible all week until their count is met.
 */
export function plannedOn(commitments: Commitment[], date: DateKey): Commitment[] {
  return commitments
    .filter(c => isDueOn(c, date))
    .sort((a, b) => a.order - b.order);
}

export function scoreDay(commitments: Commitment[], day: DayRecord | undefined, date: DateKey): DayScore {
  const items: ScoredItem[] = [];
  const skipped: Commitment[] = [];
  for (const c of plannedOn(commitments, date)) {
    if (isWeekly(c, date)) continue;
    const entry = entryOf(day, c.id);
    if (entry.state === 'skipped') { skipped.push(c); continue; }
    if (entry.optional) continue;
    const points = pointsFor(c.weight);
    const credit = creditFor(c, entry);
    items.push({ commitment: c, entry, points, credit, earned: points * credit });
  }
  const possible = items.reduce((a, i) => a + i.points, 0);
  const earned = items.reduce((a, i) => a + i.earned, 0);
  return {
    items, skipped, earned, possible,
    score: possible ? Math.round((earned / possible) * 100) : null,
  };
}

/** Points shown in the breakdown: whole numbers stay whole, partials keep one decimal so totals reconcile. */
export function formatPoints(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function outcomeOf(credit: number): ItemOutcome {
  return credit >= 1 ? 'completed' : credit > 0 ? 'partial' : 'missed';
}

export function summarize(ds: DayScore, recovery: boolean, threshold: number): DaySummary {
  const items: ClosedItem[] = ds.items.map(i => ({
    id: i.commitment.id, name: i.commitment.name, points: i.points, credit: i.credit, outcome: outcomeOf(i.credit),
  }));
  const status = recovery ? 'recovery' : ds.possible === 0 ? 'empty' : 'scored';
  const score = status === 'scored' ? ds.score : null;
  return {
    status, score, earned: ds.earned, possible: ds.possible, items,
    skippedIds: ds.skipped.map(c => c.id),
    success: score === null ? null : score >= threshold,
  };
}

export { weeklyTarget };
