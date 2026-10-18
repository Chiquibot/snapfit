import { describe, expect, it } from "vitest";
import type { Entry, EntryType } from "@/lib/entries";
import { streak, summarizeDay, weeklyRate, weightTrend, wellbeing } from "@/lib/stats";

let id = 0;
const e = <T extends EntryType>(type: T, occurred_at: string, data: Record<string, unknown>) =>
  ({ id: String(++id), person_id: "p", type, occurred_at, data, source: "manual" }) as unknown as Entry<EntryType>;

const tz = "Asia/Manila"; // UTC+8, no daylight saving

describe("summarizeDay", () => {
  it("adds up meals, water and workouts for the local day only", () => {
    const entries = [
      e("meal", "2026-10-18T00:30:00Z", { name: "Breakfast", kcal: 450, protein_g: 30, veg_fruit_servings: 1 }), // 08:30 local
      e("meal", "2026-10-18T05:00:00Z", { name: "Lunch", kcal: 700, protein_g: 40, veg_fruit_servings: 2 }),
      e("meal", "2026-10-17T15:00:00Z", { name: "Late snack", kcal: 300 }), // 23:00 local on the 17th
      e("water", "2026-10-18T02:00:00Z", { ml: 500 }),
      e("workout", "2026-10-18T10:00:00Z", { activity: "run", duration_min: 32, distance_km: 5.1 }),
    ];
    expect(summarizeDay(entries, "2026-10-18", tz)).toEqual({
      kcal: 1150,
      protein_g: 70,
      veg_fruit_servings: 3,
      meals: 2,
      water_ml: 500,
      workout_min: 32,
      distance_km: 5.1,
    });
  });
});

describe("streak", () => {
  it("counts consecutive logged days and ignores water-only days", () => {
    const entries = [
      e("weight", "2026-10-18T00:00:00Z", { kg: 95 }),
      e("meal", "2026-10-17T04:00:00Z", { name: "x" }),
      e("meal", "2026-10-16T04:00:00Z", { name: "x" }),
      e("water", "2026-10-15T04:00:00Z", { ml: 250 }),
      e("meal", "2026-10-14T04:00:00Z", { name: "x" }),
    ];
    expect(streak(entries, "2026-10-18", tz)).toBe(3);
  });

  it("still counts yesterday's streak before anything is logged today", () => {
    expect(streak([e("meal", "2026-10-17T04:00:00Z", { name: "x" })], "2026-10-18", tz)).toBe(1);
  });
});

describe("weightTrend and weeklyRate", () => {
  it("smooths with a 7-weigh-in average and reports kg per week", () => {
    const entries = Array.from({ length: 15 }, (_, i) =>
      e("weight", new Date(Date.UTC(2026, 9, 1 + i)).toISOString(), { kg: 100 - i * 0.1 }),
    );
    const trend = weightTrend(entries);
    expect(trend).toHaveLength(15);
    expect(trend[0].avg7).toBe(100);
    expect(trend[14].avg7).toBe(98.9); // average of 99.2 … 98.6
    expect(weeklyRate(trend)).toBeCloseTo(-0.55, 1);
  });

  it("returns no rate until there are two weeks of data", () => {
    const trend = weightTrend([e("weight", "2026-10-01T00:00:00Z", { kg: 100 }), e("weight", "2026-10-05T00:00:00Z", { kg: 99 })]);
    expect(weeklyRate(trend)).toBeNull();
  });
});

describe("wellbeing", () => {
  it("averages sleep and check-ins over the last 7 days", () => {
    const entries = [
      e("sleep", "2026-10-18T00:00:00Z", { hours: 6 }),
      e("sleep", "2026-10-17T00:00:00Z", { hours: 7 }),
      e("sleep", "2026-10-01T00:00:00Z", { hours: 3 }), // too old
      e("checkin", "2026-10-18T01:00:00Z", { stress: 4, energy: 2 }),
      e("checkin", "2026-10-17T12:00:00Z", { stress: 2 }),
    ];
    expect(wellbeing(entries, "2026-10-18", tz)).toEqual({ sleep_hours: 6.5, stress: 3, energy: 2, rested: null });
  });
});
