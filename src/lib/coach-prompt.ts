import type { Entry, EntryType, Person } from "./entries";
import { localDay } from "./dates";

type AnyEntry = Entry<EntryType>;

function line(e: AnyEntry, tz: string): string {
  const d = localDay(e.occurred_at, tz);
  const v = (x: unknown, unit = "") => (x === null || x === undefined ? "?" : `${x}${unit}`);
  switch (e.type) {
    case "weight": {
      const w = e.data as Entry<"weight">["data"];
      return `${d} weigh-in ${w.kg} kg${w.body_fat_pct ? `, body fat ${w.body_fat_pct}%` : ""}`;
    }
    case "meal": {
      const m = e.data as Entry<"meal">["data"];
      const t = new Date(e.occurred_at).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
      return `${d} ${t} meal "${m.name}": ${v(m.kcal)} kcal, protein ${v(m.protein_g, " g")}, fiber ${v(m.fiber_g, " g")}, veg/fruit ${v(m.veg_fruit_servings)}, processed ${v(m.processed)}`;
    }
    case "workout": {
      const w = e.data as Entry<"workout">["data"];
      return `${d} ${w.activity}${w.app ? ` (${w.app})` : ""}: ${v(w.duration_min, " min")}${w.distance_km ? `, ${w.distance_km} km` : ""}${w.volume_kg ? `, ${w.volume_kg} kg lifted` : ""}`;
    }
    case "sleep": {
      const s = e.data as Entry<"sleep">["data"];
      return `${d} slept ${s.hours} h${s.resting_hr ? `, resting HR ${s.resting_hr}` : ""}${s.hrv_ms ? `, HRV ${s.hrv_ms} ms` : ""}`;
    }
    case "checkin": {
      const c = e.data as Entry<"checkin">["data"];
      return `${d} check-in: stress ${v(c.stress)}/5, energy ${v(c.energy)}/5, rested ${v(c.rested)}/5${c.note ? `, note: "${c.note}"` : ""}`;
    }
    case "water":
      return ""; // summarized per day below
  }
}

function waterByDay(entries: AnyEntry[], tz: string): string {
  const days = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== "water") continue;
    const d = localDay(e.occurred_at, tz);
    days.set(d, (days.get(d) ?? 0) + (e.data as Entry<"water">["data"]).ml);
  }
  return [...days].map(([d, ml]) => `${d} water ${(ml / 1000).toFixed(1)} L`).join("\n");
}

export function buildCoachPrompt(person: Person, entries: AnyEntry[], tz: string, now = new Date()): string {
  const sorted = entries.slice().sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  const rows = [sorted.map((e) => line(e, tz)).filter(Boolean).join("\n"), waterByDay(sorted, tz)].filter(Boolean).join("\n");
  const age = person.birth_year ? now.getFullYear() - person.birth_year : null;

  const who =
    person.kind === "child"
      ? [
          `This is for a child${age ? ` aged about ${age}` : ""}, logged by their parent.`,
          "Give family-friendly advice for healthy habits: more vegetables and fruit, water instead of sugary drinks, fewer ultra-processed snacks, regular meals, about 60 minutes of active play a day, and good sleep.",
          "Never suggest calorie restriction, dieting or weight loss for the child, and don't comment on the child's body or weight. Suggest things the parent and child can do together.",
        ].join(" ")
      : [
          `This is for an adult who is overweight and wants to lose fat, get fit and have more energy.`,
          `Height ${person.height_cm ?? "unknown"} cm, goal weight ${person.goal_kg ?? "not set"} kg, daily targets ${person.kcal_target ?? "?"} kcal and ${person.protein_target ?? "?"} g protein, water ${person.water_target_ml} ml.`,
          "A safe pace is about 0.5–1% of body weight per week.",
        ].join(" ");

  return `You are a supportive, practical fitness and nutrition coach. ${who}

Here is the last 14 days of logged data. Meal numbers are estimated from photos, so treat them as approximate. Stress is 1 (calm) to 5 (very stressed); energy and rested are 1 (low) to 5 (high).
${rows || "(no data yet)"}

Write a short check-in in plain language, at most 200 words, no headings or tables:
1. One sentence on what is going well, citing a specific number from the data.
2. If the data shows a link between sleep, stress, food or activity (for example, more snacking after short nights), name it in one sentence. Skip this if there isn't enough data.
3. The two or three changes that would help most this week, each specific and doable. Base them on the data.
4. One sentence of encouragement.
If something looks worrying (very low calories, very fast weight change, very poor sleep for many days, very high stress), gently suggest checking with a doctor. You are not a doctor; don't diagnose.`;
}
