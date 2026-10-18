# Setup guide

This takes about an hour the first time. Every service here has a free plan that covers one family. The only paid part is Claude API usage, which is cents to a few dollars a month (see `docs/adr/0005-claude-models-and-cost.md`).

What you'll set up, in order:

1. Supabase: database and sign-in
2. Claude API key
3. Push notification keys
4. Vercel: hosting
5. Supabase sign-in links
6. Hourly water reminder job
7. Install on your iPhone
8. Apple Health Shortcut (optional, see `docs/SHORTCUT.md`)

Keep a private note open while you go. You'll collect about eight values, and they go into Vercel in step 4. **Never put them in the repo.** `.env.local` is already ignored by git.

---

## 1. Supabase: database and sign-in

1. Sign up at [supabase.com](https://supabase.com) with your GitHub account.
2. **New project** → name it `snapfit`, pick the region closest to you (for the Philippines, Singapore), and save the database password in your password manager.
3. When it's ready, open **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (secret: server only)
4. Create the tables. From the repo folder on your computer:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>   # the ref is in the project URL
   npx supabase db push
   ```

   No terminal handy? Open **SQL Editor** in Supabase, paste the contents of `supabase/migrations/20261018000000_init.sql`, and run it once.

5. Check **Table Editor**: you should see `people`, `entries`, `settings`, `push_subscriptions`, `ingest_tokens` and `ai_usage`, each marked "RLS enabled".

## 2. Claude API key

1. Go to [console.anthropic.com](https://console.anthropic.com) and sign in.
2. **Billing** → add a small amount of prepaid credit. $5 lasts months at this usage.
3. **Limits** → set a monthly spend limit (for example $5). This is your hard ceiling.
4. **API Keys** → **Create Key** → name it `snapfit-vercel` → copy it into `ANTHROPIC_API_KEY`.

## 3. Push notification keys

These let the server send water reminders to your phone. Generate them once:

```bash
npx web-push generate-vapid-keys
```

- Public Key → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Private Key → `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` → `mailto:` followed by your email

Also make up a long random string for `CRON_SECRET`, for example from `openssl rand -hex 32`.

## 4. Vercel: hosting

1. Sign up at [vercel.com](https://vercel.com) with GitHub (Hobby plan).
2. **Add New → Project** → import `Chiquibot/snapfit`. Vercel detects Next.js automatically.
3. Before deploying, open **Environment Variables** and add every value from `.env.example`:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from step 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from step 1 |
   | `ANTHROPIC_API_KEY` | from step 2 |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | from step 3 |
   | `VAPID_PRIVATE_KEY` | from step 3 |
   | `VAPID_SUBJECT` | from step 3 |
   | `CRON_SECRET` | from step 3 |

4. **Deploy**. You get a URL like `https://snapfit-xyz.vercel.app`. That's your app.

From now on, every push to `main` deploys to that URL, and every pull request gets its own preview link that Vercel posts on the PR.

## 5. Supabase sign-in links

Tell Supabase where magic links should send you back to.

**Authentication → URL Configuration:**

- **Site URL:** `https://snapfit-xyz.vercel.app`
- **Redirect URLs:** add `https://snapfit-xyz.vercel.app/auth/callback`, `https://*-chiquibot.vercel.app/auth/callback` (preview deploys) and `http://localhost:3000/auth/callback` (local dev)

**Authentication → Emails → Magic Link** template: add the 6-digit code so you can sign in inside the Home Screen app (which doesn't share Safari's sign-in). Replace the body with:

```html
<h2>Sign in to Snapfit</h2>
<p>Your code: <strong>{{ .Token }}</strong></p>
<p>Or tap: <a href="{{ .ConfirmationURL }}">Sign in</a></p>
```

Open your app URL, enter your email, and type the code from the email (or tap the link). You're in. Signing up automatically creates "Me" and "My kid"; rename them in Settings.

## 6. Hourly water reminder job

Supabase runs this schedule. Vercel's free plan only allows daily jobs.

1. **Database → Extensions** → enable `pg_cron` and `pg_net`.
2. **SQL Editor** → run this, with your URL and `CRON_SECRET` filled in:

   ```sql
   select cron.schedule(
     'snapfit-water-reminders',
     '0 * * * *',  -- every hour, on the hour
     $$
     select net.http_post(
       url     := 'https://snapfit-xyz.vercel.app/api/reminders/water',
       headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET', 'Content-Type', 'application/json'),
       body    := '{}'::jsonb
     );
     $$
   );
   ```

3. Check it's scheduled: `select jobname, schedule from cron.job;`. Check recent runs: `select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;`.

The job does nothing for you until you turn on notifications in step 7.

## 7. Install on your iPhone

1. Open your app URL in **Safari**.
2. Tap **Share → Add to Home Screen → Add**.
3. Open **Snapfit from the Home Screen** (not Safari) and sign in again with the 6-digit code. Home Screen apps keep their own sign-in.
4. **Settings** → set your time zone (tap "Use this phone's time zone"), height, goal and targets → **Save**.
5. **Water reminders → Turn on notifications** → Allow. Then **Send a test**.

## 8. Apple Health Shortcut (optional)

Follow `docs/SHORTCUT.md`. It sends last night's sleep, resting heart rate and HRV, plus Nike Run Club and Hevy workouts, every morning without you opening the app.

---

## Local development

```bash
cp .env.example .env.local   # fill in the same values (the same Supabase project is fine to start)
npm install
npm run dev                  # http://localhost:3000
```

Checks that run on every pull request (`.github/workflows/ci.yml`):

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

To test on your phone before merging, open a pull request and use the Vercel preview link it posts.

## Troubleshooting

| Problem | Fix |
|---|---|
| Magic link opens Safari instead of the app | Expected on iPhone. Type the 6-digit code from the email into the Home Screen app instead. If the email has no code, redo the template change in step 5. |
| "Email rate limit exceeded" | Supabase's free email sender allows a few emails an hour. Wait, or add your own SMTP under Authentication → Emails. |
| Photo reading says the API key is wrong | Check `ANTHROPIC_API_KEY` in Vercel, then redeploy (env changes need a new deploy). |
| No water notifications | The app must be opened from the Home Screen. Check Settings → Send a test, then `cron.job_run_details` in Supabase. |
| App shows old content after a deploy | Close the app fully (swipe up) and reopen it. |
