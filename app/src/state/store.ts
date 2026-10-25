import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { closeDays } from '../domain/close';
import { addDays, dayEndOffset, tendoDate, toKey } from '../domain/dates';
import { emptyDay, entryOf } from '../domain/score';
import { currentSchedule, isWeekly } from '../domain/schedule';
import type {
  Category, Commitment, DateKey, DayEnd, DayRecord, Entry, Mood, SchedulePattern, Threshold, TimeOfDay, Tone, TrackType,
} from '../domain/types';
import type { Provider } from '../services/auth';
import type { ThemeName } from '../theme/tokens';

/** Where the user is in the account lifecycle; the root layout routes on this. */
export type Stage = 'signedOut' | 'verify' | 'username' | 'onboarding' | 'ready';

export interface Account {
  name: string;
  username: string;
  email: string;
  provider: Provider;
  ageConfirmed: boolean;
  usernameChangedOn: DateKey | null;
  startedOn: DateKey;
}

export interface Settings {
  dayEnd: DayEnd;
  dayEndCustom: string;
  threshold: Threshold;
  theme: ThemeName;
  tone: Tone;
  notificationsAsked: boolean;
  notificationsGranted: boolean;
  manyDismissed: boolean;
  heavyDismissedOn: DateKey | null;
}

export interface CommitmentDraft {
  name: string;
  category: Category;
  track: TrackType;
  target: number | null;
  unit: string | null;
  pattern: SchedulePattern;
  startDate: DateKey;
  endDate: DateKey | null;
  timeOfDay: TimeOfDay;
  why: string;
}

interface Data {
  stage: Stage;
  account: Account | null;
  pendingEmail: string;
  settings: Settings;
  commitments: Commitment[];
  days: Record<DateKey, DayRecord>;
  today: DateKey;
}

interface Actions {
  /** Recomputes the Tendo date and closes any finished days. Safe to call often. */
  rollover(now?: Date): void;

  startRegistration(input: { name: string; username: string; email: string; provider: Provider; ageConfirmed: boolean }): void;
  confirmEmail(): void;
  signedIn(input: { email: string; name: string; provider: Provider }): void;
  setUsername(username: string, ageConfirmed?: boolean): void;
  completeOnboarding(input: { commitments: CommitmentDraft[]; dayEnd: DayEnd; dayEndCustom: string; threshold: Threshold }): void;
  signOut(): void;
  deleteAccount(): void;

  setMood(mood: Mood | null): void;
  finishCheckin(priorityId: string | null): void;
  setPriority(id: string | null): void;
  setDone(id: string, done: boolean): void;
  setSkipped(id: string, skipped: boolean): void;
  setOptional(id: string, optional: boolean): void;
  setProgress(id: string, value: number): void;

  addCommitment(d: CommitmentDraft): string;
  updateCommitment(id: string, d: CommitmentDraft): void;
  pause(id: string, until: DateKey | null): void;
  resume(id: string): void;
  archive(id: string): void;
  restore(id: string): void;
  remove(id: string): void;

  updateSettings(patch: Partial<Settings>): void;
}

export type TendoState = Data & Actions;

export const DEFAULT_SETTINGS: Settings = {
  dayEnd: 'Midnight', dayEndCustom: '00:30', threshold: 80, theme: 'warm', tone: 'Balanced',
  notificationsAsked: false, notificationsGranted: false, manyDismissed: false, heavyDismissedOn: null,
};

const initial = (): Data => ({
  stage: 'signedOut', account: null, pendingEmail: '', settings: DEFAULT_SETTINGS,
  commitments: [], days: {}, today: toKey(new Date()),
});

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function fromDraft(d: CommitmentDraft, today: DateKey, order: number): Commitment {
  return {
    id: newId(), name: d.name.trim(), category: d.category, track: d.track,
    target: d.track === 'simple' ? null : d.target, unit: d.unit,
    schedules: [{ pattern: d.pattern, effectiveFrom: today, startDate: d.startDate, endDate: d.endDate }],
    timeOfDay: d.timeOfDay, why: d.why.trim() || null, lifecycle: 'active', pausedUntil: null,
    createdOn: today, order, weight: 1, firstRecordOn: null,
  };
}

const samePattern = (a: SchedulePattern, b: SchedulePattern) => JSON.stringify(a) === JSON.stringify(b);

export const useTendo = create<TendoState>()(
  persist(
    (set, get) => {
      const patchEntry = (id: string, patch: (e: Entry, c: Commitment | undefined) => Partial<Entry>) => set(s => {
        const day = s.days[s.today] ?? emptyDay(s.today);
        const c = s.commitments.find(x => x.id === id);
        const next = { ...entryOf(day, id), ...patch(entryOf(day, id), c) };
        const records = next.state === 'done' || next.progress > 0;
        return {
          days: { ...s.days, [s.today]: { ...day, entries: { ...day.entries, [id]: next } } },
          commitments: records && c && !c.firstRecordOn
            ? s.commitments.map(x => (x.id === id ? { ...x, firstRecordOn: s.today } : x))
            : s.commitments,
        };
      });
      const patchDay = (patch: Partial<DayRecord>) => set(s => ({
        days: { ...s.days, [s.today]: { ...(s.days[s.today] ?? emptyDay(s.today)), ...patch } },
      }));
      const patchCommitment = (id: string, patch: Partial<Commitment>) => set(s => ({
        commitments: s.commitments.map(c => (c.id === id ? { ...c, ...patch } : c)),
      }));

      return {
        ...initial(),

        rollover(now = new Date()) {
          const s = get();
          const today = tendoDate(now, dayEndOffset(s.settings.dayEnd, s.settings.dayEndCustom));
          if (!s.account || s.stage !== 'ready') {
            if (today !== s.today) set({ today });
            return;
          }
          // Days only ever move forward; a clock or timezone change never reopens a closed day.
          const effective = today > s.today ? today : s.today;
          const res = closeDays({
            commitments: s.commitments, days: s.days, since: s.account.startedOn, today: effective, threshold: s.settings.threshold,
          });
          if (res.closed.length || effective !== s.today) set({ today: effective, commitments: res.commitments, days: res.days });
          // Paused-until dates reactivate on their morning.
          const due = get().commitments.filter(c => c.lifecycle === 'paused' && c.pausedUntil && c.pausedUntil <= effective);
          if (due.length) set(st => ({ commitments: st.commitments.map(c => (due.includes(c) ? { ...c, lifecycle: 'active', pausedUntil: null } : c)) }));
        },

        startRegistration({ name, username, email, provider, ageConfirmed }) {
          set({
            stage: provider === 'email' ? 'verify' : 'username',
            pendingEmail: email,
            account: { name, username, email, provider, ageConfirmed, usernameChangedOn: null, startedOn: get().today },
          });
        },
        confirmEmail() {
          set(s => ({ stage: s.account?.username ? 'onboarding' : 'username' }));
        },
        signedIn({ email, name, provider }) {
          const s = get();
          // A returning user on this device keeps their data; a new device starts fresh until sync exists.
          if (s.account && s.account.email && s.account.email === email) {
            set({ stage: !s.account.username ? 'username' : s.commitments.length ? 'ready' : 'onboarding' });
            return;
          }
          set({
            ...initial(),
            today: s.today,
            stage: 'username',
            account: { name, username: '', email, provider, ageConfirmed: false, usernameChangedOn: null, startedOn: s.today },
          });
        },
        setUsername(username, ageConfirmed) {
          set(s => {
            if (!s.account) return {};
            const editing = s.stage === 'ready';
            return {
              account: {
                ...s.account, username,
                ageConfirmed: ageConfirmed ?? s.account.ageConfirmed,
                usernameChangedOn: editing ? s.today : s.account.usernameChangedOn,
              },
              stage: editing ? 'ready' : 'onboarding',
            };
          });
        },
        completeOnboarding({ commitments, dayEnd, dayEndCustom, threshold }) {
          set(s => {
            const today = tendoDate(new Date(), dayEndOffset(dayEnd, dayEndCustom));
            return {
              stage: 'ready',
              today,
              account: s.account ? { ...s.account, startedOn: today } : s.account,
              settings: { ...s.settings, dayEnd, dayEndCustom, threshold },
              commitments: commitments.map((d, i) => fromDraft({ ...d, startDate: today }, today, i)),
            };
          });
        },
        signOut() {
          set({ stage: 'signedOut' });
        },
        deleteAccount() {
          set({ ...initial() });
        },

        setMood(mood) {
          const day = get().days[get().today];
          patchDay({ mood, moodEdited: !!day?.mood && day.mood !== mood ? true : day?.moodEdited ?? false });
        },
        finishCheckin(priorityId) {
          patchDay({ checkinDone: true, priorityId });
        },
        setPriority(priorityId) {
          patchDay({ priorityId });
        },
        setDone(id, done) {
          patchEntry(id, (e, c) => ({
            state: done ? 'done' : 'pending',
            // Undoing a measured item clears the logged amount so the score drops back honestly.
            progress: done ? (c?.target && !isWeekly(c, get().today) ? Math.max(e.progress, c.target) : e.progress) : 0,
          }));
        },
        setSkipped(id, skipped) {
          patchEntry(id, () => ({ state: skipped ? 'skipped' : 'pending' }));
        },
        setOptional(id, optional) {
          patchEntry(id, () => ({ optional }));
        },
        setProgress(id, value) {
          patchEntry(id, (_e, c) => {
            const v = Math.max(0, value);
            return { progress: v, state: c?.target && v >= c.target ? 'done' : 'pending' };
          });
        },

        addCommitment(d) {
          const s = get();
          const c = fromDraft(d, s.today, Math.max(0, ...s.commitments.map(x => x.order)) + 1);
          set({ commitments: [...s.commitments, c] });
          return c.id;
        },
        updateCommitment(id, d) {
          const s = get();
          const c = s.commitments.find(x => x.id === id);
          if (!c) return;
          const cur = currentSchedule(c);
          const scheduleChanged = !samePattern(cur.pattern, d.pattern) || cur.startDate !== d.startDate || cur.endDate !== d.endDate;
          // Schedule edits start a new version today; earlier days keep theirs.
          const schedules = !scheduleChanged ? c.schedules
            : cur.effectiveFrom === s.today
              ? [...c.schedules.slice(0, -1), { ...cur, pattern: d.pattern, startDate: d.startDate, endDate: d.endDate }]
              : [...c.schedules, { pattern: d.pattern, effectiveFrom: s.today, startDate: d.startDate, endDate: d.endDate }];
          const typeLocked = !!c.firstRecordOn;
          patchCommitment(id, {
            name: d.name.trim(), category: d.category, timeOfDay: d.timeOfDay, why: d.why.trim() || null, schedules,
            ...(typeLocked ? {} : { track: d.track, target: d.track === 'simple' ? null : d.target, unit: d.unit }),
          });
        },
        pause(id, until) {
          patchCommitment(id, { lifecycle: 'paused', pausedUntil: until });
          set(s => (s.days[s.today]?.priorityId === id ? { days: { ...s.days, [s.today]: { ...s.days[s.today], priorityId: null } } } : {}));
        },
        resume(id) {
          patchCommitment(id, { lifecycle: 'active', pausedUntil: null });
        },
        archive(id) {
          patchCommitment(id, { lifecycle: 'archived', pausedUntil: null });
        },
        restore(id) {
          patchCommitment(id, { lifecycle: 'active' });
        },
        remove(id) {
          set(s => {
            const days: Record<DateKey, DayRecord> = {};
            for (const [k, d] of Object.entries(s.days)) {
              const { [id]: _drop, ...entries } = d.entries;
              days[k] = {
                ...d, entries,
                priorityId: d.priorityId === id ? null : d.priorityId,
                // Permanent delete removes the commitment from history too (confirmed by the user first).
                summary: d.summary ? { ...d.summary, items: d.summary.items.filter(i => i.id !== id), skippedIds: d.summary.skippedIds.filter(x => x !== id) } : null,
              };
            }
            return { commitments: s.commitments.filter(c => c.id !== id), days };
          });
        },

        updateSettings(patch) {
          set(s => ({ settings: { ...s.settings, ...patch } }));
          if ('dayEnd' in patch || 'dayEndCustom' in patch) get().rollover();
        },
      };
    },
    {
      name: 'tendo-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: s => ({
        stage: s.stage, account: s.account, pendingEmail: s.pendingEmail, settings: s.settings,
        commitments: s.commitments, days: s.days, today: s.today,
      }),
    },
  ),
);

export const yesterdayOf = (k: DateKey) => addDays(k, -1);
