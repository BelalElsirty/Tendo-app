# Tendo-app

**Tendo — keep your way.** A mobile app for recurring personal commitments: one honest Discipline Score, streaks, and private accountability groups.

| Path | What it is |
| --- | --- |
| `app/` | The Expo / React Native app (iOS, Android, web preview). See `app/README.md`. |
| `docs/architecture.md` | Technical architecture and how the PRD rules are implemented. |
| `docs/build-plan.md` | Phase-by-phase plan and what Phase 1 contains. |
| `supabase/` | Database schema with row-level security, plus SQL rule checks. |
| `project/` | Claude Design handoff: prototype (`Tendo.dc.html`), PRD v1.1, design chat. See `project/HANDOFF.md`. |

## Run it

```bash
cd app
npm install
npx expo start   # scan the QR code with Expo Go on your phone
```
