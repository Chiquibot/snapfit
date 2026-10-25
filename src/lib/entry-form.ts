import type { ScanKind } from "./scan";
import { fromDisplay, LB_PER_KG } from "./units";

// The editable form behind every log button. The same form is used whether
// the numbers came from a photo or are typed in by hand.

export type Fields = Record<string, string>;
export type FieldDef = { k: string; label: string; type?: "number" | "text" | "date"; full?: boolean };
type Units = "kg" | "lb";

export type FormEntry = {
  type: ScanKind;
  data: Record<string, unknown>;
  occurred_at?: string;
  source: "photo" | "manual";
};

export function formFields(kind: ScanKind, units: Units): FieldDef[] {
  switch (kind) {
    case "weight":
      return [
        { k: "weight", label: `Weight (${units})` },
        { k: "body_fat_pct", label: "Body fat % (optional)" },
      ];
    case "meal":
      return [
        { k: "name", label: "What it was", type: "text", full: true },
        { k: "kcal", label: "Calories" },
        { k: "protein_g", label: "Protein (g)" },
        { k: "carbs_g", label: "Carbs (g)" },
        { k: "fat_g", label: "Fat (g)" },
        { k: "fiber_g", label: "Fiber (g)" },
        { k: "veg_fruit_servings", label: "Veg & fruit servings" },
      ];
    case "workout":
      return [
        { k: "activity", label: "Activity", type: "text" },
        { k: "date", label: "Date", type: "date" },
        { k: "duration_min", label: "Time (min)" },
        { k: "distance_km", label: "Distance (km)" },
        { k: "kcal", label: "Calories" },
        { k: "volume_kg", label: "Volume lifted (kg)" },
      ];
    case "sleep":
      return [
        { k: "hours", label: "Hours asleep" },
        { k: "date", label: "Morning of", type: "date" },
        { k: "deep_hours", label: "Deep sleep (h)" },
        { k: "resting_hr", label: "Resting heart rate" },
      ];
    case "blood_pressure":
      return [
        { k: "systolic", label: "Top number (SYS)" },
        { k: "diastolic", label: "Bottom number (DIA)" },
        { k: "pulse", label: "Pulse (optional)" },
      ];
  }
}

/** Starting values for typing an entry in by hand. */
export function blankFields(kind: ScanKind, today: string): Fields {
  if (kind === "workout") return { activity: "run", date: today };
  if (kind === "sleep") return { date: today };
  return {};
}

const s = (v: unknown) => (v === null || v === undefined ? "" : String(Math.round(Number(v) * 10) / 10));

/** Map Claude's reading of a photo into form fields, plus any note to show. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the shape depends on kind and was validated server-side
export function scanToFields(kind: ScanKind, r: any, units: Units, today: string): { fields: Fields; items?: string; tip?: string; error?: string } {
  switch (kind) {
    case "weight": {
      let w = r.weight as number | null;
      if (w != null && r.unit && r.unit !== units) w = r.unit === "lb" ? w / LB_PER_KG : w * LB_PER_KG;
      return { fields: { weight: s(w), body_fat_pct: s(r.body_fat_pct) }, error: r.readable ? undefined : r.note || "Couldn't read the display." };
    }
    case "meal":
      return {
        fields: {
          name: r.name ?? "",
          kcal: s(r.kcal),
          protein_g: s(r.protein_g),
          carbs_g: s(r.carbs_g),
          fat_g: s(r.fat_g),
          fiber_g: s(r.fiber_g),
          veg_fruit_servings: s(r.veg_fruit_servings),
        },
        items: (r.items ?? []).map((i: { name: string; portion: string }) => `${i.name} (${i.portion})`).join(", "),
        tip: r.tip,
        error: r.is_food ? undefined : "That doesn't look like food.",
      };
    case "workout":
      return {
        fields: {
          activity: r.activity ?? "",
          date: r.date ?? today,
          duration_min: s(r.duration_min),
          distance_km: s(r.distance_km),
          kcal: s(r.kcal),
          volume_kg: s(r.volume_kg),
          app: r.app ?? "",
        },
        error: r.readable ? undefined : "Couldn't find a workout in that screenshot.",
      };
    case "sleep":
      return {
        fields: { hours: s(r.hours), date: r.date ?? today, deep_hours: s(r.deep_hours), resting_hr: s(r.resting_hr), hrv_ms: s(r.hrv_ms) },
        error: r.readable ? undefined : "Couldn't find a sleep summary in that screenshot.",
      };
    case "blood_pressure":
      return {
        fields: { systolic: s(r.systolic), diastolic: s(r.diastolic), pulse: s(r.pulse) },
        error: r.readable ? undefined : "Couldn't read the monitor's display.",
      };
  }
}

/** Turn the form into an entry to save, or return null when the main number is missing. */
export function formToEntry(kind: ScanKind, fields: Fields, units: Units, source: "photo" | "manual", tip?: string | null): FormEntry | null {
  const n = (k: string) => {
    const v = parseFloat(fields[k] ?? "");
    return Number.isFinite(v) ? v : null;
  };
  const atNoon = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`).toISOString() : undefined);
  switch (kind) {
    case "weight": {
      const w = n("weight");
      return w ? { type: "weight", source, data: { kg: Math.round(fromDisplay(w, units) * 10) / 10, body_fat_pct: n("body_fat_pct") } } : null;
    }
    case "meal": {
      if (!fields.name && n("kcal") === null) return null;
      return {
        type: "meal",
        source,
        data: {
          name: fields.name || "Meal",
          items: [],
          kcal: n("kcal"),
          protein_g: n("protein_g"),
          carbs_g: n("carbs_g"),
          fat_g: n("fat_g"),
          fiber_g: n("fiber_g"),
          veg_fruit_servings: n("veg_fruit_servings"),
          tip: tip ?? null,
        },
      };
    }
    case "workout": {
      if (n("duration_min") === null && n("distance_km") === null) return null;
      return {
        type: "workout",
        source,
        occurred_at: atNoon(fields.date),
        data: {
          activity: (fields.activity || "workout").toLowerCase(),
          app: fields.app || null,
          duration_min: n("duration_min"),
          distance_km: n("distance_km"),
          kcal: n("kcal"),
          volume_kg: n("volume_kg"),
        },
      };
    }
    case "sleep": {
      const h = n("hours");
      return h ? { type: "sleep", source, occurred_at: atNoon(fields.date), data: { hours: h, deep_hours: n("deep_hours"), resting_hr: n("resting_hr"), hrv_ms: n("hrv_ms") } } : null;
    }
    case "blood_pressure": {
      const sys = n("systolic");
      const dia = n("diastolic");
      if (!sys || !dia) return null;
      // People sometimes type the numbers in the wrong boxes. The top number is always the larger one.
      return { type: "blood_pressure", source, data: { systolic: Math.max(sys, dia), diastolic: Math.min(sys, dia), pulse: n("pulse") } };
    }
  }
}
