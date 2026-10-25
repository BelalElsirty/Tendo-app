# Tendo app

Expo SDK 58 · React Native · TypeScript. Design source: `../project/Tendo.dc.html`. Product source: `../project/uploads/prd-v1.1.txt`.

```bash
npm install
npx expo start      # scan the QR code with Expo Go, or press w for the web build
npm test            # domain engine tests (vitest)
npm run typecheck
```

Behind a proxy that blocks api.expo.dev, prefix Expo CLI commands with `EXPO_OFFLINE=1`.

- `src/domain` — scoring, schedules, day close, streaks, tone. Pure TypeScript; start here to understand the rules.
- `src/state` — persisted store (AsyncStorage) and derived view models.
- `src/app` — screens (Expo Router).
- `src/ui` — shared components built from the prototype's tokens.

Phase 1 runs entirely on the device. `src/services/auth.ts` is a local stand-in (accepts any six-digit code, stores no passwords) and is replaced by Supabase Auth in Phase 2 — see `../docs/build-plan.md`.
