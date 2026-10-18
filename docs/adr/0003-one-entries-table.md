# 3. One `entries` table with a JSONB payload, validated with Zod

Date: 2026-10-18 · Status: accepted

## Context
The app logs six kinds of things (weight, meal, workout, sleep, check-in, water), and new kinds will come. Each has different fields.

## Decision
Store every log in `public.entries` with a `type`, an `occurred_at` time, and a `data` JSONB column. Each type has a Zod schema in `src/lib/entries.ts` that defines and validates its `data`. Imports set `external_id`, and a unique constraint on `(owner, source, external_id)` makes re-imports update instead of duplicate.

## Consequences
- Adding a new entry type means adding a Zod schema and widening one `check` constraint, not a new table.
- One query loads a person's whole timeline for the dashboard and the coach.
- The database doesn't check fields inside `data`; the app does. If reporting needs grow, frequently queried fields can be promoted to generated columns.
