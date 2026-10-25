# Tendo — Build Plan

Built against PRD v1.1 (Appendix B priorities) and the approved prototype. Each phase ends shippable to TestFlight / internal testing.

## Phase 1 — Core personal loop (this branch)

Done, running on device-local storage:

- Welcome, Register (name, username rules, email, password strength, 16+), Verify (6-digit), Sign in, Forgot password, Username setup/change (30-day cooldown), Terms/Privacy placeholders.
- Onboarding: goal → balanced starters → day end (11 PM – 3 AM + Custom) and success threshold → notification explainer before the OS prompt.
- Daily check-in: mood (or Skip, private) → optional priority. One mood change per day from Today.
- Today: score arc with "Too new to rate · day N of 5", "—" when nothing is due, curated coach line (tone × mood, one step max), priority card, Morning/Afternoon/Evening/Any time sections with progress when the list is long, unfinished-first ordering with settle animation, hold-to-complete weighted by adaptive weight, amount/duration bars, weekly-target counts, heavy-day suggestion at 8+, all-done state and close-out recap.
- Actions: Complete/undo, Skip today, Optional today, Priority, Pause (until I resume / until date), Resume, Archive/Restore, Edit, Delete with confirmation (Archive offered first).
- Log progress sheet: quick adds scaled to the target, exact value, Done, proportional-credit note.
- Score breakdown that reconciles exactly with the headline; adaptive-weight explanation.
- Commitment detail: weight, streak, kept %, best streak, this month, momentum 7/30/all, why, weight reason, 14-day grid with a text legend, Complete now, More, Schedule.
- Add/Edit commitment: name, duplicate warning, track type (locked after first record), target + units incl. custom, six categories with suggestions (View more), cadence, time of day, why, weight card, "Keep your list meaningful" at 15.
- Custom schedule: every day / weekdays / weekends / specific days / X per week (1–7) / every X days (2–30), time of day, native start/end pickers, plain-language summary. Edits are versioned; past days keep their schedule.
- Manage: search, Active/Paused/Archived, category filters.
- Progress tab: 30-day chart from closed days (text equivalent for screen readers), today / 30-day average / best / streaks.
- You tab: profile, week average, streak, day end, success threshold, Warm dark / Pure black, tone, legal links, sign out, delete account (type DELETE).
- Engine: Tendo-day boundary, day close with frozen snapshots, adaptive weights, commitment and personal streaks, weekly targets — 22 unit tests.
- Supabase schema with RLS and rule triggers, verified on Postgres 16 (`supabase/tests/rules.sql`).

Not in Phase 1, by design: Groups tab shows the PRD's no-groups state with an honest "not switched on yet" note.

## Phase 2 — Accounts and sync

- Supabase project; replace `localAuth` with Supabase Auth (email OTP verification, Apple, Google), re-auth for deletion.
- Outbox + pull sync for profiles, commitments, schedules, days, entries; conflict sheet ("This changed on another device").
- Server day close (Edge Function, per timezone bucket) using the shared `src/domain` code.
- Offline banner and queued-action copy; restrained skeletons on first remote load; "Couldn't refresh" state.
- Privacy & Data hub, export request, account deletion function (7-day purge, anonymised group history).

## Phase 3 — Social (P0 social rows)

- Friends: search by username/display name, requests, accept/decline, friend profile (allowed stats only), remove, block, report.
- Groups: create (name, goal, invites / 6-char code, 48 h expiry), join, 12-member cap, roles (owner/admin/member), group settings, ownership transfer, mute, leave, report.
- Shared commitments with audience label, acceptance before they reach Today, "Count for both / Keep separate".
- Group score and leaderboard (Today / This Week / This Month, ties share rank, new members unranked for 3 days), preset nudges (1 per sender per recipient per day), activity.
- Social privacy settings UI; notification preferences; reminders with editable times (expo-notifications).

## Phase 4 — P1 depth and Pro

- History with "Edited after day ended" corrections (12-hour window), Weekly Review (Sunday, last 8), Commitment Packs (32, search, duplicates), Travel Mode, Recovery Day (2/quarter), one-day reschedule (≤30 days, conflict prompts), "Anything different today?".
- Tendo Pro via RevenueCat: upgrade sheet at the third group, Pro screen with transparent pricing ($2.99 / $24.99 launch hypothesis, no trial), Subscription screen, restore, 7-day downgrade grace with choose-two flow.

## Phase 5 — P2 and launch polish

- Focus timer (25/45/60/custom 5–180, auto-log, early-exit prompt), group weekly recap, preset challenge view, Why-I-do-this reminders on Today, About Tendo, accessibility audit pass (VoiceOver/TalkBack, Dynamic Type), store assets and legal copy after review.

## Running

```bash
cd app
npm install
npx expo start          # Expo Go on a phone, or press w for web
npm test                # domain unit tests
npm run typecheck
```

Database rules (needs a local Postgres):

```bash
psql -f supabase/tests/stub-auth.sql      # only outside Supabase: stubs auth.users / auth.uid()
psql -f supabase/migrations/20261025000000_init.sql
psql -f supabase/tests/rules.sql          # prints ALL_RULES_OK
```
