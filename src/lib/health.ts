import { z } from "zod";

// Payload the iPhone Shortcut sends to /api/ingest/health once a day.
// See docs/SHORTCUT.md for how the Shortcut builds it from Apple Health.

const n = z.coerce.number().finite();

export const HealthPayload = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // the day the data belongs to
  person: z.enum(["adult", "child"]).default("adult"),
  sleep_hours: n.min(0).max(24).optional(),
  resting_hr: n.min(25).max(200).optional(),
  hrv_ms: n.min(0).max(400).optional(),
  steps: n.min(0).max(200000).optional(),
  workouts: z
    .array(
      z.object({
        start: z.string(), // ISO date-time from Health
        activity: z.string().default("workout"),
        app: z.string().optional(), // e.g. "Nike Run Club", "Hevy"
        duration_min: n.min(0).max(1440).optional(),
        distance_km: n.min(0).max(500).optional(),
        kcal: n.min(0).max(10000).optional(),
      }),
    )
    .max(20)
    .default([]),
});
export type HealthPayload = z.infer<typeof HealthPayload>;

export type NewEntry = {
  type: "sleep" | "workout";
  occurred_at: string;
  data: Record<string, unknown>;
  external_id: string;
};

/** Turn one day of Apple Health data into entry rows, each with a stable id for dedupe. */
export function healthToEntries(p: HealthPayload): NewEntry[] {
  const rows: NewEntry[] = [];
  if (p.sleep_hours !== undefined && p.sleep_hours > 0) {
    rows.push({
      type: "sleep",
      // Noon UTC stays on the same calendar day for almost every time zone.
      occurred_at: `${p.date}T12:00:00Z`,
      data: {
        hours: Math.round(p.sleep_hours * 100) / 100,
        resting_hr: p.resting_hr ?? null,
        hrv_ms: p.hrv_ms ?? null,
      },
      external_id: `health:sleep:${p.date}`,
    });
  }
  for (const w of p.workouts) {
    const start = new Date(w.start);
    if (Number.isNaN(start.getTime())) continue;
    rows.push({
      type: "workout",
      occurred_at: start.toISOString(),
      data: {
        activity: w.activity.toLowerCase(),
        app: w.app ?? null,
        duration_min: w.duration_min ?? null,
        distance_km: w.distance_km ?? null,
        kcal: w.kcal ?? null,
      },
      external_id: `health:workout:${start.toISOString()}`,
    });
  }
  return rows;
}
