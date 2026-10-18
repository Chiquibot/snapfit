# Snapfit

Snap-to-log family fitness tracker. Next.js 16 (App Router) web app installed on iPhone as a PWA, Supabase (Postgres + auth + RLS), Claude API for reading photos and coaching, deployed on Vercel.

## Commands
- `npm run dev` — local app on :3000 (needs `.env.local`, see `.env.example`)
- `npm run lint && npm run typecheck && npm test && npm run build` — same checks as CI
- `npx supabase db push` — apply migrations to the linked project

## Conventions
- Schema changes go in a new file in `supabase/migrations/` (never edit an applied migration). Every new table gets RLS policies and explicit grants.
- Entry `data` shapes live in `src/lib/entries.ts` (Zod). Add the type there and to the `entries.type` check constraint.
- Pure logic goes in `src/lib/` with a test in `tests/`. Components stay thin.
- Server-only modules import `"server-only"`. The service-role client (`src/lib/supabase/admin.ts`) is only for the Shortcut import and the reminder job, always filtered by owner.
- Claude calls go through `src/lib/claude.ts`, which logs cost to `ai_usage`. Models are set by env vars (`SCAN_MODEL`, `MEAL_MODEL`, `COACH_MODEL`).
- Kid profiles: no calorie targets, no weight-loss language anywhere in UI or prompts.
- Photos are never stored.
- Next 16 uses `src/proxy.ts` (not `middleware.ts`).
