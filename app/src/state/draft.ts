import { create } from 'zustand';
import { cadencePattern, currentSchedule, patternCadence, type Cadence } from '../domain/schedule';
import type { Category, Commitment, DateKey, SchedulePattern, TimeOfDay, TrackType } from '../domain/types';
import type { CommitmentDraft } from './store';

/** Default target and stepper increment per tracking type / unit. */
export const TRACK_DEFAULTS: Record<Exclude<TrackType, 'simple'>, number> = { amount: 2, duration: 60, weekly: 3 };
const UNIT_STEP: Record<string, number> = { L: 0.5, ml: 250, glasses: 1, steps: 1000, pages: 5, km: 1, reps: 5 };

export function targetStep(track: TrackType, unit: string): number {
  if (track === 'duration') return 15;
  if (track === 'weekly') return 1;
  return UNIT_STEP[unit] ?? 1;
}

export interface DraftState {
  editId: string | null;
  name: string;
  track: TrackType;
  target: number;
  unit: string;
  customUnit: string;
  category: Category;
  cadence: Cadence;
  pattern: SchedulePattern;
  startDate: DateKey;
  endDate: DateKey | null;
  timeOfDay: TimeOfDay;
  why: string;
  set(patch: Partial<DraftState>): void;
  reset(today: DateKey): void;
  load(c: Commitment): void;
}

const blank = (today: DateKey) => ({
  editId: null, name: '', track: 'simple' as TrackType, target: 2, unit: 'L', customUnit: '', category: 'Body' as Category,
  cadence: 'Every day' as Cadence, pattern: { kind: 'daily' } as SchedulePattern, startDate: today, endDate: null,
  timeOfDay: 'any' as TimeOfDay, why: '',
});

export const useDraft = create<DraftState>(set => ({
  ...blank(''),
  set: patch => set(patch),
  reset: today => set(blank(today)),
  load: c => {
    const sch = currentSchedule(c);
    const known = c.unit && Object.keys(UNIT_STEP).includes(c.unit);
    set({
      editId: c.id, name: c.name, track: c.track, category: c.category, timeOfDay: c.timeOfDay, why: c.why ?? '',
      target: c.target ?? (c.track === 'simple' ? 2 : TRACK_DEFAULTS[c.track]),
      unit: c.track === 'amount' ? (known ? c.unit! : 'Custom') : 'L',
      customUnit: c.track === 'amount' && !known ? c.unit ?? '' : '',
      pattern: sch.pattern, cadence: patternCadence(sch.pattern), startDate: sch.startDate, endDate: sch.endDate,
    });
  },
}));

/** Applies a cadence pill. Custom keeps whatever the schedule screen set. */
export function cadencePatch(c: Cadence, current: SchedulePattern): Partial<DraftState> {
  return { cadence: c, pattern: cadencePattern(c) ?? current };
}

export function toCommitmentDraft(d: DraftState): CommitmentDraft {
  const unit = d.track === 'amount' ? (d.unit === 'Custom' ? d.customUnit.trim() || 'units' : d.unit) : d.track === 'duration' ? 'min' : null;
  // "Times per week" tracking owns the schedule: it is always an N-per-week pattern.
  const pattern: SchedulePattern = d.track === 'weekly' ? { kind: 'perWeek', times: d.target } : d.pattern;
  return {
    name: d.name, category: d.category, track: d.track, target: d.track === 'simple' ? null : d.target, unit,
    pattern, startDate: d.startDate, endDate: d.endDate, timeOfDay: d.timeOfDay, why: d.why,
  };
}
