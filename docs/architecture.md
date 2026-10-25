# Tendo — Technical Architecture

Source of truth for product behaviour: `project/uploads/prd-v1.1.txt` (PRD v1.1, Engineering Ready) and the approved prototype `project/Tendo.dc.html`. Where they disagree, PRD v1.1 wins.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| App | Expo SDK 58, React Native 0.88, TypeScript (strict) | One codebase for iOS and Android (PRD platforms). Runs in Expo Go during development; EAS builds for the stores. |
| Navigation | Expo Router 58 (`src/app/`), `Stack.Protected` guards per account stage | File-based routes, typed links, deep links (`tendo://`). |
| State | Zustand + `persist` → AsyncStorage | Small, synchronous, offline-first. Local state is the source of truth on the device; sync reconciles later. |
| Animation | Reanimated 4 (fill sweep, score arc, row reordering) | UI-thread animation; honours Reduce Motion via `useReducedMotion`. |
| Graphics | react-native-svg | Score arc, Progress chart, tab icons. |
| Type | Montserrat 400/500/600/700 via `@expo-google-fonts/montserrat` | PRD decision 44. |
| Backend (Phase 2) | Supabase: Postgres + Auth + Row-Level Security + Edge Functions | Postgres fits the relational group/score model; RLS enforces privacy rules in the database, not just the client. |
| Purchases (Phase 4) | RevenueCat over StoreKit / Play Billing | Restore, entitlements, grace handling, platform copy. |
| Notifications (Phase 3) | expo-notifications (local reminders) + Expo push for social | Explainer before the OS prompt (PRD §25). |

## Layout

```
app/
  src/
    domain/        Pure TypeScript rules. No React, no storage. Unit-tested.
      types.ts       Commitment, ScheduleVersion, Entry, DayRecord, DaySummary…
      dates.ts       Tendo-day boundary (day end), DateKey arithmetic
      schedule.ts    Patterns, due logic, schedule versions
      score.ts       Discipline Score, credit, weekly counts
      close.ts       Day close + adaptive weights
      streaks.ts     Commitment / personal streaks, kept rates, 14-day dots
      tone.ts        Mood × tone → curated coach copy
      library.ts     Suggestions, onboarding starters, units
    state/
      store.ts       Persisted app store and all actions
      todayModel.ts  Derived "today" view model shared by screens
      draft.ts       Add/Edit commitment draft shared with Custom schedule
    services/      Boundaries that change implementation by phase (auth, notifications, haptics)
    theme/         Tokens for Warm dark and Pure black
    ui/            Kit components, sheets, rows, score arc, tab bar
    app/           Routes (Expo Router)
```

The domain layer is deliberately framework-free so the same functions can run in a Supabase Edge Function (day close, weight recalculation) and in the app, which keeps the headline score and the server's record identical.

## Key rules as implemented

- **Tendo day.** `tendoDate(now, offset)` shifts the clock by the user's day end (11 PM = −60 min, 3 AM = +180 min). Days only move forward on a device; a timezone change never reopens a closed day (PRD §32).
- **Closing.** `closeDays` runs on launch, every minute and on foreground. It closes every unclosed day before today, oldest first, materialising days the app never opened so misses are recorded honestly. Each close freezes a `DaySummary` snapshot (names, points, credit) — history never rewrites when a schedule changes.
- **Weights.** After each close: `1 + miss rate` over the last 30 days, rounded to 0.1, capped at ×2.0, only once a commitment has 5 scored occurrences.
- **Score.** `round(Σ points × credit / Σ points × 100)`. Skipped, optional and weekly-target items are out of the denominator. Nothing due → `—`, never 100%. The breakdown shows partial points to one decimal, so the total always reconciles with the headline.
- **Schedules.** Versioned: an edit appends a version effective today; past days resolve the version that applied then.
- **Weekly targets.** Any `perWeek` pattern (the "Times per week" type, or the "3× a week" cadence) is measured on the week and stays on Today until the week's count is met.
- **Hold to complete.** Hold length = `420 + weight × 480` ms. Haptic tick on start, success on completion. Screen readers get a `Complete` accessibility action; the detail screen has `Complete now` (PRD §33).
- **Ordering.** Unfinished first, completed below, preserving the user's order; a just-changed row holds its place for 520 ms, then animates (skipped under Reduce Motion).

## Sync model (Phase 2)

- Every local mutation is appended to an outbox (`{table, id, patch, clientUpdatedAt, deviceId}`) and applied optimistically.
- A sync worker pushes the outbox, then pulls rows changed since the last cursor. Personal rows are last-writer-wins per field, except where a row's `version` diverged on two devices, which surfaces the PRD's "This changed on another device" sheet.
- Day close is authoritative on the server (scheduled Edge Function per timezone bucket) but computed identically on device so the UI never waits.
- Social actions (friend requests, nudges, joins) queue offline with their expiry rules (nudges expire at the recipient's day end; invite codes after 48 h).

## Security and privacy

- RLS on every table. Personal commitments, entries, mood and reflections are owner-only, with no policy granting any other role read access.
- Group visibility is a function of membership plus the member's privacy settings; group scores read only shared-commitment tables.
- Blocking is enforced in RLS (`not exists blocks …`), so a blocked user cannot see, add, invite or nudge.
- Account deletion: an Edge Function deactivates immediately, purges primary rows within 7 days, anonymises shared-group history to "Former member".
- The Phase 1 `localAuth` service is a device-only stand-in that never stores passwords; it must be replaced before any public build.
