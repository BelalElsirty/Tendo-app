import type { Commitment, DayRecord, Entry, SchedulePattern } from '../types';
import { emptyDay } from '../score';

let n = 0;
export function commitment(over: Partial<Commitment> & { pattern?: SchedulePattern } = {}): Commitment {
  const { pattern, ...rest } = over;
  const createdOn = rest.createdOn ?? '2026-09-01';
  return {
    id: 'c' + ++n, name: 'Thing ' + n, category: 'Body', track: 'simple', target: null, unit: null,
    schedules: [{ pattern: pattern ?? { kind: 'daily' }, effectiveFrom: createdOn, startDate: createdOn, endDate: null }],
    timeOfDay: 'any', why: null, lifecycle: 'active', pausedUntil: null, createdOn, order: n, weight: 1,
    firstRecordOn: null, ...rest,
  };
}

export function day(date: string, entries: Record<string, Partial<Entry>> = {}, over: Partial<DayRecord> = {}): DayRecord {
  const d = emptyDay(date);
  for (const [id, e] of Object.entries(entries)) d.entries[id] = { state: 'pending', progress: 0, optional: false, ...e };
  return { ...d, ...over };
}
