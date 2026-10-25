import { z } from "zod";

// The `data` column of public.entries, one schema per entry type.
// Everything is optional except the one number that makes the entry useful,
// because photo reading and imports are allowed to be partial.

const num = z.number().finite();

export const WeightData = z.object({
  kg: num.positive().max(400),
  body_fat_pct: num.min(2).max(70).nullish(),
});

export const MealData = z.object({
  name: z.string().max(120),
  items: z.array(z.object({ name: z.string(), portion: z.string().nullish() })).max(30).default([]),
  kcal: num.min(0).max(5000).nullish(),
  protein_g: num.min(0).max(400).nullish(),
  carbs_g: num.min(0).max(800).nullish(),
  fat_g: num.min(0).max(400).nullish(),
  fiber_g: num.min(0).max(150).nullish(),
  veg_fruit_servings: num.min(0).max(20).nullish(),
  processed: z.enum(["low", "medium", "high"]).nullish(),
  tip: z.string().max(400).nullish(),
});

export const WorkoutData = z.object({
  activity: z.string().max(60), // "run", "strength", "walk", ...
  app: z.string().max(40).nullish(), // "Nike Run Club", "Hevy", ...
  duration_min: num.min(0).max(1440).nullish(),
  distance_km: num.min(0).max(500).nullish(),
  kcal: num.min(0).max(10000).nullish(),
  avg_hr: num.min(30).max(240).nullish(),
  volume_kg: num.min(0).max(200000).nullish(), // strength: total weight lifted
  exercises: z.array(z.string()).max(40).nullish(),
});

export const SleepData = z.object({
  hours: num.min(0).max(24),
  deep_hours: num.min(0).max(24).nullish(),
  rem_hours: num.min(0).max(24).nullish(),
  resting_hr: num.min(25).max(200).nullish(),
  hrv_ms: num.min(0).max(400).nullish(),
});

// 1–5 scales. Stress: 1 calm … 5 very stressed. Energy and rested: 1 low … 5 high.
const scale = z.number().int().min(1).max(5);
export const CheckinData = z.object({
  stress: scale.nullish(),
  energy: scale.nullish(),
  rested: scale.nullish(),
  note: z.string().max(280).nullish(),
});

export const WaterData = z.object({ ml: num.positive().max(3000) });

// mmHg. Pulse is beats per minute.
export const BloodPressureData = z.object({
  systolic: num.min(60).max(260),
  diastolic: num.min(30).max(160),
  pulse: num.min(30).max(220).nullish(),
});

export const ENTRY_SCHEMAS = {
  weight: WeightData,
  meal: MealData,
  workout: WorkoutData,
  sleep: SleepData,
  checkin: CheckinData,
  water: WaterData,
  blood_pressure: BloodPressureData,
} as const;

export type EntryType = keyof typeof ENTRY_SCHEMAS;
export const ENTRY_TYPES = Object.keys(ENTRY_SCHEMAS) as EntryType[];

export type EntryDataMap = { [K in EntryType]: z.infer<(typeof ENTRY_SCHEMAS)[K]> };

export type Entry<T extends EntryType = EntryType> = {
  id: string;
  person_id: string;
  type: T;
  occurred_at: string;
  data: EntryDataMap[T];
  source: "photo" | "manual" | "shortcut";
  external_id?: string | null;
};

export type Person = {
  id: string;
  name: string;
  kind: "adult";
  birth_year: number | null;
  height_cm: number | null;
  goal_kg: number | null;
  kcal_target: number | null;
  protein_target: number | null;
  water_target_ml: number;
};

export function parseEntryData<T extends EntryType>(type: T, data: unknown): EntryDataMap[T] {
  return ENTRY_SCHEMAS[type].parse(data) as EntryDataMap[T];
}
