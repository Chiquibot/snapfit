# 5. Use the cheapest Claude model that does each job, and log every call's cost

Date: 2026-10-18 · Status: accepted

## Context
Reading photos and writing coaching need an AI model. The goal is a running cost of cents per month.

## Decision
- Scale photos, workout and sleep screenshots: `claude-haiku-5-5` at low effort. These are numbers on a screen.
- Meal photos: `claude-haiku-5-5` at medium effort by default. Switch to `claude-sonnet-5-5` with the `MEAL_MODEL` env var if estimates are poor.
- Weekly coach: `claude-sonnet-5-5`, with the API's server-side fallback turned on so a policy decline retries on a fallback model.
- Responses use structured outputs (a Zod schema), so the app gets typed JSON back instead of parsing free text.
- Every call writes its token counts and estimated cost to `ai_usage`. The settings page shows the month's total.

## Consequences
- Typical cost is around $0.0005 per photo on Haiku and $0.01 on Sonnet. A family's month is cents to a few dollars.
- The Claude Console spend limit is the hard ceiling. The app's own number is an estimate based on the price table in `src/lib/cost.ts`.
