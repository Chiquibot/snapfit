# 4. Photos are read, then thrown away

Date: 2026-10-18 · Status: accepted

## Context
The app sees photos of meals, scales, and screenshots. Supabase's free plan includes 1 GB of file storage.

## Decision
The phone resizes each photo to 1024 px on the long edge before upload. `/api/scan` sends it to Claude, returns the numbers, and doesn't save the image anywhere. Only the numbers the user confirms are stored.

## Consequences
- No photo is stored by this app. Less to protect and nothing to leak.
- Storage stays near zero, so the free plan lasts for years.
- Progress photos (body pictures over time) would need a private storage bucket with its own access rules. That is a separate, opt-in feature if it's ever built.
