# Privacy

Snapfit holds personal health data, so it collects as little as possible.

**What's stored**, in your own Supabase project:
- Numbers you confirm: weight, meal estimates, workouts, sleep, check-in scores, water.
- The names, birth years and targets you enter in Settings.
- A count of AI calls and their estimated cost.

**What's not stored:**
- **Photos.** They're sent to Claude to be read, then dropped. See `docs/adr/0004-photos-are-not-stored.md`.
- Passwords. Sign-in uses one-time email codes.

**Who can see it:**
- Only your account, enforced by the database's row level security.
- Anthropic processes each photo and coach request to answer it, under the [Claude API's commercial terms](https://www.anthropic.com/legal/commercial-terms). API inputs aren't used to train models by default.
- Supabase and Vercel host the data and app under their own terms.

**The repo is public, the data isn't.** The repo has code only, with no data, keys or photos.

**Deleting everything:** delete your user under Supabase **Authentication → Users**. Every table cascades from the user, so all rows go with it.
