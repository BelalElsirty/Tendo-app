import type { Cadence } from './schedule';
import type { Category, SchedulePattern, TimeOfDay } from './types';

/** Suggested commitments per category on Add commitment, with their recommended cadence. */
export const LIBRARY: Record<Category, [string, Cadence][]> = {
  Body: [
    ['Workout', '3× a week'], ['Run 5K', '3× a week'], ['Walk 10,000 steps', 'Every day'],
    ['Stretch', 'Every day'], ['Morning walk', 'Every day'], ['Cold plunge', 'Every day'],
    ['Drink water', 'Every day'], ['Sleep before 12', 'Every day'], ['Wake up early', 'Every day'],
    ['Eat healthy', 'Every day'], ['Mobility routine', '3× a week'],
  ],
  Mind: [
    ['Read 20 pages', 'Every day'], ['Meditate', 'Every day'], ['Journal', 'Every day'],
    ['Practice gratitude', 'Every day'], ['Read for 30 minutes', 'Every day'],
    ['Learn something new', 'Every day'], ['Reflect on the day', 'Every day'], ['Evening journal', 'Every day'],
  ],
  Focus: [
    ['No phone before 9am', 'Every day'], ['Study for 1 hour', 'Weekdays'], ['Deep work session', 'Weekdays'],
    ["Finish today's priority", 'Weekdays'], ['No social media during work', 'Weekdays'],
    ['Pomodoro session', 'Weekdays'], ['Plan tomorrow', 'Every day'], ['Focus for 90 minutes', 'Weekdays'],
  ],
  Craft: [
    ['Write 200 words', 'Every day'], ['Code for 1 hour', 'Weekdays'], ['Practice guitar', 'Every day'],
    ['Practice drawing', '3× a week'], ['Work on side project', '3× a week'], ['Learn a language', 'Every day'],
    ['Practice photography', '3× a week'], ['Study a technical topic', 'Weekdays'],
  ],
  Chores: [
    ['Make bed', 'Every day'], ['Brush teeth — morning', 'Every day'], ['Brush teeth — night', 'Every day'],
    ['Shower', 'Every day'], ['Skincare', 'Every day'], ['Tidy room', 'Every day'],
    ['Wash dishes', 'Every day'], ['Prepare clothes for tomorrow', 'Every day'], ['Quick room reset', 'Every day'],
    ['Clean kitchen', '3× a week'], ['Take out trash', '3× a week'], ['Tidy desk', 'Every day'],
    ['Do laundry', 'Custom'], ['Change bedsheets', 'Custom'], ['Clean bathroom', 'Custom'],
    ['Organize clothes', 'Custom'],
  ],
  Other: [],
};

/** Weekly chores suggested with "Custom" default to once a week; the user can change it. */
export const CUSTOM_SUGGESTION_PATTERN: SchedulePattern = { kind: 'perWeek', times: 1 };

export interface StarterSuggestion {
  key: string;
  name: string;
  category: Category;
  pattern: SchedulePattern;
  timeOfDay: TimeOfDay;
  meta: string;
  pickedByDefault: boolean;
}

/** Onboarding step 2 — a balanced whole day, not just self-improvement. */
export const STARTERS: StarterSuggestion[] = [
  { key: 's1', name: 'Make bed', category: 'Chores', pattern: { kind: 'daily' }, timeOfDay: 'morning', meta: 'Chores · every morning', pickedByDefault: true },
  { key: 's2', name: 'Workout', category: 'Body', pattern: { kind: 'days', days: [0, 2, 4] }, timeOfDay: 'afternoon', meta: 'Body · Mon, Wed, Fri', pickedByDefault: true },
  { key: 's3', name: 'Read 20 pages', category: 'Mind', pattern: { kind: 'daily' }, timeOfDay: 'evening', meta: 'Mind · every day', pickedByDefault: true },
  { key: 's4', name: 'No phone before 9am', category: 'Focus', pattern: { kind: 'daily' }, timeOfDay: 'morning', meta: 'Focus · every morning', pickedByDefault: false },
  { key: 's5', name: 'Brush teeth before bed', category: 'Chores', pattern: { kind: 'daily' }, timeOfDay: 'evening', meta: 'Chores · every night', pickedByDefault: true },
];

export const INTENT_CHIPS = ['Get stronger', 'Write every day', 'Off my phone', 'Sleep on time'];

export const AMOUNT_UNITS = ['L', 'ml', 'glasses', 'steps', 'pages', 'km', 'Custom'];

export const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', any: 'Any time',
};
