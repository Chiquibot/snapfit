# 2. Supabase for data and auth, Vercel for hosting, scheduled jobs in Supabase

Date: 2026-10-18 · Status: accepted

## Context
The app needs a database, sign-in, a place to run server code that holds the Claude API key, and an hourly job for water reminders. Everything should fit free tiers.

## Decision
- **Supabase (free plan):** Postgres, magic-link sign-in, row level security. Schema changes live in `supabase/migrations` and are applied with `supabase db push`.
- **Vercel (Hobby plan):** hosts the Next.js app and API routes. It deploys `main` to production and builds a preview link for every pull request.
- **Scheduled jobs:** Vercel's free plan runs cron jobs at most once a day, so the hourly water job is a Supabase `pg_cron` schedule that calls `/api/reminders/water` with a shared secret.

## Consequences
- One Postgres database is the single source of truth. Access rules are enforced by the database, not only by app code.
- Free Supabase projects pause after about a week without activity. Daily use (and the hourly job) keeps it awake.
- Supabase's built-in email sender is rate limited to a few emails an hour, which is fine for one family's magic links.
