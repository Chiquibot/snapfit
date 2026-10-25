import type { Entry, EntryType } from "./entries";
import { addDays, localDay } from "./dates";

type AnyEntry = Entry<EntryType>;

const ofType = <T extends EntryType>(entries: AnyEntry[], type: T) =>
  entries.filter((e): e is Entry<T> => e.type === type);

export type DaySummary = {
  kcal: number;
  protein_g: number;
  veg_fruit_servings: number;
  meals: number;
  water_ml: number;
  workout_min: number;
  distance_km: number;
};

export function summarizeDay(entries: AnyEntry[], day: string, timeZone: string): DaySummary {
  const today = entries.filter((e) => localDay(e.occurred_at, timeZone) === day);
  const meals = ofType(today, "meal");
  const workouts = ofType(today, "workout");
  const sum = (xs: (number | null | undefined)[]) => xs.reduce<number>((a, x) => a + (x ?? 0), 0);
  return {
    kcal: Math.round(sum(meals.map((m) => m.data.kcal))),
    protein_g: Math.round(sum(meals.map((m) => m.data.protein_g))),
    veg_fruit_servings: sum(meals.map((m) => m.data.veg_fruit_servings)),
    meals: meals.length,
    water_ml: sum(ofType(today, "water").map((w) => w.data.ml)),
    workout_min: Math.round(sum(workouts.map((w) => w.data.duration_min))),
    distance_km: Math.round(sum(workouts.map((w) => w.data.distance_km)) * 100) / 100,
  };
}

/** Consecutive days (ending today, or yesterday if nothing yet today) with at least one entry. */
export function streak(entries: AnyEntry[], today: string, timeZone: string): number {
  const days = new Set(entries.filter((e) => e.type !== "water").map((e) => localDay(e.occurred_at, timeZone)));
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export type WeightPoint = { at: string; kg: number; avg7: number };

/**
 * Weigh-ins oldest first, each with the average of up to the last 7 weigh-ins.
 * The average smooths out day-to-day water swings so the real trend shows.
 */
export function weightTrend(entries: AnyEntry[]): WeightPoint[] {
  const ws = ofType(entries, "weight")
    .slice()
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  return ws.map((w, i) => {
    const window = ws.slice(Math.max(0, i - 6), i + 1);
    const avg = window.reduce((a, x) => a + x.data.kg, 0) / window.length;
    return { at: w.occurred_at, kg: w.data.kg, avg7: Math.round(avg * 10) / 10 };
  });
}

/** Weekly change in the 7-weigh-in average, in kg per week. Null until there are two weeks of data. */
export function weeklyRate(trend: WeightPoint[]): number | null {
  if (trend.length < 2) return null;
  const first = trend[0];
  const last = trend[trend.length - 1];
  const days = (Date.parse(last.at) - Date.parse(first.at)) / 86_400_000;
  if (days < 14) return null;
  return Math.round(((last.avg7 - first.avg7) / days) * 7 * 100) / 100;
}

/** Average sleep hours and check-in scores over the last `days` days. */
export function wellbeing(entries: AnyEntry[], today: string, timeZone: string, days = 7) {
  const from = addDays(today, -(days - 1));
  const inRange = entries.filter((e) => {
    const d = localDay(e.occurred_at, timeZone);
    return d >= from && d <= today;
  });
  const avg = (xs: (number | null | undefined)[]) => {
    const v = xs.filter((x): x is number => typeof x === "number");
    return v.length ? Math.round((v.reduce((a, x) => a + x, 0) / v.length) * 10) / 10 : null;
  };
  const sleeps = ofType(inRange, "sleep");
  const bps = ofType(inRange, "blood_pressure");
  const checkins = ofType(inRange, "checkin");
  return {
    sleep_hours: avg(sleeps.map((s) => s.data.hours)),
    stress: avg(checkins.map((c) => c.data.stress)),
    energy: avg(checkins.map((c) => c.data.energy)),
    rested: avg(checkins.map((c) => c.data.rested)),
    bp: bps.length
      ? { systolic: Math.round(avg(bps.map((b) => b.data.systolic))!), diastolic: Math.round(avg(bps.map((b) => b.data.diastolic))!), readings: bps.length }
      : null,
  };
}
