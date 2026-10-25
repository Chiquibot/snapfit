import { z } from "zod";

// Payload the iPhone Shortcut sends to /api/ingest/health once a day.
// Every field except `date` is optional: the Shortcut sends whatever your
// devices put into Apple Health, and anything missing can be logged by
// photo or typed in. See docs/SHORTCUT.md.

const n = z.coerce.number().finite();

export const HealthPayload = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // the day the data belongs to
  sleep_hours: n.min(0).max(24).optional(),
  resting_hr: n.min(25).max(200).optional(),
  hrv_ms: n.min(0).max(400).optional(),
  steps: n.min(0).max(200000).optional(),
  weight_kg: n.min(20).max(400).optional(), // e.g. from a smart scale
  body_fat_pct: n.min(2).max(70).optional(),
  blood_pressure: z
    .array(
      z.object({
        at: z.string().optional(), // ISO date-time of the reading
        systolic: n.min(60).max(260),
        diastolic: n.min(30).max(160),
        pulse: n.min(30).max(220).optional(),
      }),
    )
    .max(10)
    .default([]),
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
  type: "sleep" | "workout" | "weight" | "blood_pressure";
  occurred_at: string;
  data: Record<string, unknown>;
  external_id: string;
};

/** Turn one day of Apple Health data into entry rows, each with a stable id for dedupe. */
export function healthToEntries(p: HealthPayload): NewEntry[] {
  // Noon UTC stays on the same calendar day for almost every time zone.
  const noon = `${p.date}T12:00:00Z`;
  const rows: NewEntry[] = [];
  if (p.sleep_hours !== undefined && p.sleep_hours > 0) {
    rows.push({
      type: "sleep",
      occurred_at: noon,
      data: {
        hours: Math.round(p.sleep_hours * 100) / 100,
        resting_hr: p.resting_hr ?? null,
        hrv_ms: p.hrv_ms ?? null,
      },
      external_id: `health:sleep:${p.date}`,
    });
  }
  if (p.weight_kg !== undefined) {
    rows.push({
      type: "weight",
      occurred_at: noon,
      data: { kg: Math.round(p.weight_kg * 10) / 10, body_fat_pct: p.body_fat_pct ?? null },
      external_id: `health:weight:${p.date}`,
    });
  }
  p.blood_pressure.forEach((bp, i) => {
    const at = bp.at ? new Date(bp.at) : null;
    const valid = at && !Number.isNaN(at.getTime());
    rows.push({
      type: "blood_pressure",
      occurred_at: valid ? at.toISOString() : noon,
      data: { systolic: bp.systolic, diastolic: bp.diastolic, pulse: bp.pulse ?? null },
      external_id: valid ? `health:bp:${at.toISOString()}` : `health:bp:${p.date}:${i}`,
    });
  });
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
