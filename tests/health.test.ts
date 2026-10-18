import { describe, expect, it } from "vitest";
import { HealthPayload, healthToEntries } from "@/lib/health";

describe("Apple Health import", () => {
  it("turns a Shortcut payload into sleep and workout rows with stable ids", () => {
    const payload = HealthPayload.parse({
      date: "2026-10-18",
      sleep_hours: "6.75", // Shortcuts often sends numbers as text
      resting_hr: 64,
      workouts: [{ start: "2026-10-17T18:05:00+08:00", activity: "Running", app: "Nike Run Club", duration_min: 31.5, distance_km: 5.02 }],
    });
    const rows = healthToEntries(payload);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ type: "sleep", external_id: "health:sleep:2026-10-18", data: { hours: 6.75, resting_hr: 64 } });
    expect(rows[1]).toMatchObject({
      type: "workout",
      occurred_at: "2026-10-17T10:05:00.000Z",
      external_id: "health:workout:2026-10-17T10:05:00.000Z",
      data: { activity: "running", app: "Nike Run Club", distance_km: 5.02 },
    });
  });

  it("rejects a bad date and skips unparseable workout times", () => {
    expect(HealthPayload.safeParse({ date: "18/10/2026" }).success).toBe(false);
    const rows = healthToEntries(HealthPayload.parse({ date: "2026-10-18", workouts: [{ start: "not a date" }] }));
    expect(rows).toEqual([]);
  });
});
