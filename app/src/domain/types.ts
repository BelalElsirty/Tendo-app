// Core Tendo domain types. Pure data — no React, no storage.

/** Calendar date of a Tendo day, `YYYY-MM-DD`. Never a timestamp. */
export type DateKey = string;

export const CATEGORIES = ['Body', 'Mind', 'Focus', 'Craft', 'Chores', 'Other'] as const;
export type Category = (typeof CATEGORIES)[number];

/** How a commitment is tracked (PRD §13). */
export type TrackType = 'simple' | 'amount' | 'duration' | 'weekly';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'any';

/** Weekday index, Monday = 0 … Sunday = 6. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type SchedulePattern =
  | { kind: 'daily' }
  | { kind: 'weekdays' }
  | { kind: 'weekends' }
  | { kind: 'days'; days: Weekday[] }
  | { kind: 'perWeek'; times: number }
  | { kind: 'interval'; every: number };

/**
 * One effective version of a commitment's schedule. Editing a schedule appends a
 * new version from the edit date onward; past days keep the version they had (PRD §12).
 */
export interface ScheduleVersion {
  pattern: SchedulePattern;
  effectiveFrom: DateKey;
  startDate: DateKey;
  endDate: DateKey | null;
}

export type Lifecycle = 'active' | 'paused' | 'archived';

export interface Commitment {
  id: string;
  name: string;
  category: Category;
  track: TrackType;
  /** Amount/duration target per day, or times per week for weekly. */
  target: number | null;
  /** Display unit for amount commitments (`L`, `pages`, custom…). Minutes for duration. */
  unit: string | null;
  schedules: ScheduleVersion[];
  timeOfDay: TimeOfDay;
  why: string | null;
  lifecycle: Lifecycle;
  /** Paused until this date (exclusive). `null` while paused means "until I resume". */
  pausedUntil: DateKey | null;
  createdOn: DateKey;
  /** Manual ordering on Today. */
  order: number;
  /** Adaptive weight, recalculated once per day at close (PRD §15). */
  weight: number;
  /** Set when the first progress/completion is logged; locks the track type. */
  firstRecordOn: DateKey | null;
}

export type EntryState = 'pending' | 'done' | 'skipped';

/** A user's record for one commitment on one Tendo day. */
export interface Entry {
  state: EntryState;
  /** Logged amount/minutes for measurable types; weekly completions count as 1. */
  progress: number;
  optional: boolean;
}

export const MOODS = ['Rough', 'Low', 'Okay', 'Good', 'Great'] as const;
export type Mood = (typeof MOODS)[number];

export type ItemOutcome = 'completed' | 'partial' | 'missed';

/** Immutable snapshot of one scored item, written when the day closes. */
export interface ClosedItem {
  id: string;
  name: string;
  points: number;
  credit: number;
  outcome: ItemOutcome;
}

export type DayStatus = 'scored' | 'empty' | 'recovery';

export interface DaySummary {
  status: DayStatus;
  score: number | null;
  earned: number;
  possible: number;
  items: ClosedItem[];
  skippedIds: string[];
  /** Whether the day met the success threshold in force when it closed. */
  success: boolean | null;
}

export interface DayRecord {
  date: DateKey;
  entries: Record<string, Entry>;
  mood: Mood | null;
  moodEdited: boolean;
  checkinDone: boolean;
  priorityId: string | null;
  recovery: boolean;
  closed: boolean;
  summary: DaySummary | null;
  editedAfterClose: boolean;
}

export const DAY_ENDS = ['11:00 PM', 'Midnight', '1:00 AM', '2:00 AM', '3:00 AM', 'Custom'] as const;
export type DayEnd = (typeof DAY_ENDS)[number];

export const THRESHOLDS = [70, 80, 90, 100] as const;
export type Threshold = (typeof THRESHOLDS)[number];

export type Tone = 'Gentle' | 'Balanced' | 'Push me';
