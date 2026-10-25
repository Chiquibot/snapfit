import { describe, expect, it } from "vitest";
import { buildCoachPrompt } from "@/lib/coach-prompt";
import type { Entry, EntryType, Person } from "@/lib/entries";

const me: Person = {
  id: "p",
  name: "Me",
  kind: "adult",
  birth_year: 1988,
  height_cm: 175,
  goal_kg: 80,
  kcal_target: 2000,
  protein_target: 120,
  water_target_ml: 2500,
};
const entries = [
  { id: "1", person_id: "p", type: "meal", occurred_at: "2026-10-18T04:00:00Z", data: { name: "Adobo", kcal: 650, protein_g: 35 }, source: "photo" },
  { id: "2", person_id: "p", type: "water", occurred_at: "2026-10-18T05:00:00Z", data: { ml: 500 }, source: "manual" },
  { id: "3", person_id: "p", type: "checkin", occurred_at: "2026-10-18T06:00:00Z", data: { stress: 4, energy: 2 }, source: "manual" },
] as unknown as Entry<EntryType>[];

describe("buildCoachPrompt", () => {
  it("includes the logged data, targets and age", () => {
    const p = buildCoachPrompt(me, entries, "Asia/Manila", new Date("2026-10-18"));
    expect(p).toContain('meal "Adobo": 650 kcal');
    expect(p).toContain("water 0.5 L");
    expect(p).toContain("stress 4/5");
    expect(p).toContain("2000 kcal");
    expect(p).toContain("aged about 38");
  });

  it("asks for a doctor referral on worrying signs instead of a diagnosis", () => {
    const p = buildCoachPrompt(me, [], "UTC");
    expect(p).toContain("(no data yet)");
    expect(p).toContain("suggest checking with a doctor");
    expect(p).toContain("don't diagnose");
  });
});
