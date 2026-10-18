# 1. Ship as an installable web app (PWA), not a native iOS app

Date: 2026-10-18 · Status: accepted

## Context
The app is for one family, used on an iPhone, and should cost as close to nothing as possible. A native iOS app needs an Apple Developer account ($99/year) to stay installed, plus App Store review or TestFlight. It would be able to read Apple Health directly.

## Decision
Build a Next.js web app with a web manifest and service worker, installed with Safari → Share → Add to Home Screen. It opens full screen with its own icon. Web push works for Home Screen web apps since iOS 16.4, which covers water reminders. The camera is reached through `<input type="file" capture>`.

## Consequences
- No Apple fee and no app review. Every merge to `main` is live within a minute.
- A web app can't read HealthKit. Apple Health data comes in through an iPhone Shortcut that posts to `/api/ingest/health` once a day (see `docs/SHORTCUT.md`). Workout and sleep screenshots are the fallback.
- If HealthKit access becomes essential, an Expo (React Native) app can reuse the same Supabase backend and API routes.
