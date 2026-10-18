import { z } from "zod";

// What Claude returns for each kind of photo. These are deliberately loose
// (nullable fields) because the user reviews and fixes every value before saving.

export const ScanKind = z.enum(["weight", "meal", "workout", "sleep"]);
export type ScanKind = z.infer<typeof ScanKind>;

export const WeightScan = z.object({
  readable: z.boolean(),
  weight: z.number().nullable(),
  unit: z.enum(["kg", "lb"]).nullable(),
  body_fat_pct: z.number().nullable(),
  note: z.string(),
});

export const MealScan = z.object({
  is_food: z.boolean(),
  name: z.string(),
  items: z.array(z.object({ name: z.string(), portion: z.string() })),
  kcal: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  fiber_g: z.number(),
  veg_fruit_servings: z.number(),
  processed: z.enum(["low", "medium", "high"]),
  tip: z.string(),
});

export const WorkoutScan = z.object({
  readable: z.boolean(),
  app: z.string().nullable(),
  activity: z.string(),
  date: z.string().nullable(), // YYYY-MM-DD
  duration_min: z.number().nullable(),
  distance_km: z.number().nullable(),
  kcal: z.number().nullable(),
  avg_hr: z.number().nullable(),
  volume_kg: z.number().nullable(),
  exercises: z.array(z.string()),
});

export const SleepScan = z.object({
  readable: z.boolean(),
  date: z.string().nullable(), // the morning the sleep ended, YYYY-MM-DD
  hours: z.number().nullable(),
  deep_hours: z.number().nullable(),
  rem_hours: z.number().nullable(),
  resting_hr: z.number().nullable(),
  hrv_ms: z.number().nullable(),
});

export const SCAN_SCHEMAS = { weight: WeightScan, meal: MealScan, workout: WorkoutScan, sleep: SleepScan } as const;
export type ScanResult = { [K in ScanKind]: z.infer<(typeof SCAN_SCHEMAS)[K]> };

export function scanPrompt(kind: ScanKind, opts: { child: boolean }): string {
  switch (kind) {
    case "weight":
      return [
        "The image should be a photo of a bathroom scale's display.",
        "Read the main weight number. Read body fat % only if it is clearly labeled.",
        "If you can't read the display, set readable to false and explain briefly in note.",
      ].join(" ");
    case "meal":
      return [
        `The image should be a photo of a meal${opts.child ? " eaten by a child" : ""}.`,
        "List each food with the portion you can see, then estimate nutrition for everything on the plate.",
        "Use typical home portions when unsure. If the image is not food, set is_food to false and use zeros.",
        "Write a short dish name in name.",
        opts.child
          ? "In tip, give one kind, practical idea to make this meal better for a growing child. Never suggest dieting, smaller portions or cutting calories."
          : "In tip, give one practical idea to make this meal better for an adult losing fat while keeping energy up.",
      ].join(" ");
    case "workout":
      return [
        "The image should be a screenshot of a workout summary from an app such as Nike Run Club, Hevy or Apple Fitness.",
        "Read what is shown. Convert miles to km and lb to kg. Convert times like 32:15 to decimal minutes.",
        "For strength workouts, put total volume in volume_kg and list exercise names.",
        "Use null for anything not shown. If it is not a workout, set readable to false.",
      ].join(" ");
    case "sleep":
      return [
        "The image should be a screenshot of a sleep summary from an app or watch (for example Apple Health or a sleep tracker).",
        "Read total time asleep in decimal hours, and deep sleep, REM, resting heart rate and HRV if shown.",
        "Use null for anything not shown. If it is not a sleep summary, set readable to false.",
      ].join(" ");
  }
}
