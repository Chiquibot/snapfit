import { describe, expect, it } from "vitest";
import { buildCoachPrompt } from "@/lib/coach-prompt";
import type { Entry, EntryType, Person } from "@/lib/entries";

const person = (kind: "adult" | "child"): Person => ({
  id: "p",
  name: kind === "adult" ? "Me" : "Kid",
  kind,
  birth_year: kind === "child" ? 2018 : 1988,
  height_cm: 175,
  goal_kg: 80,
  kcal_target: 2000,
  protein_target: 120,
  water_target_ml: 2500,
});
const entries = [
  { id: "1", person_id: "p", type: "meal", occurred_at: "2026-10-18T04:00:00Z", data: { name: "Adobo", kcal: 650, protein_g: 35 }, source: "photo" },
  { id: "2", person_id: "p", type: "water", occurred_at: "2026-10-18T05:00:00Z", data: { ml: 500 }, source: "manual" },
] as unknown as Entry<EntryType>[];

describe("buildCoachPrompt", () => {
  it("includes the logged data and the adult's targets", () => {
    const p = buildCoachPrompt(person("adult"), entries, "Asia/Manila");
    expect(p).toContain('meal "Adobo": 650 kcal');
    expect(p).toContain("water 0.5 L");
    expect(p).toContain("2000 kcal");
  });

  it("never asks for dieting advice for a child", () => {
    const p = buildCoachPrompt(person("child"), entries, "Asia/Manila", new Date("2026-10-18"));
    expect(p).toContain("aged about 8");
    expect(p).toContain("Never suggest calorie restriction");
    expect(p).not.toContain("kcal_target");
    expect(p).not.toContain("lose fat");
  });
});
