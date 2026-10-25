import { describe, expect, it } from "vitest";
import { blankFields, formToEntry, scanToFields } from "@/lib/entry-form";
import { ENTRY_SCHEMAS } from "@/lib/entries";

describe("typing entries in by hand", () => {
  it("saves a typed-in weight in kg, converting from lb", () => {
    const e = formToEntry("weight", { weight: "220.5" }, "lb", "manual");
    expect(e).toMatchObject({ type: "weight", source: "manual", data: { kg: 100 } });
  });

  it("saves blood pressure and fixes swapped top and bottom numbers", () => {
    const e = formToEntry("blood_pressure", { systolic: "82", diastolic: "128", pulse: "70" }, "kg", "manual");
    expect(e?.data).toEqual({ systolic: 128, diastolic: 82, pulse: 70 });
    expect(ENTRY_SCHEMAS.blood_pressure.safeParse(e?.data).success).toBe(true);
  });

  it("refuses to save without the main number", () => {
    expect(formToEntry("weight", {}, "kg", "manual")).toBeNull();
    expect(formToEntry("blood_pressure", { systolic: "120" }, "kg", "manual")).toBeNull();
    expect(formToEntry("workout", blankFields("workout", "2026-10-25"), "kg", "manual")).toBeNull();
    expect(formToEntry("meal", {}, "kg", "manual")).toBeNull();
  });

  it("accepts a meal with just a name", () => {
    expect(formToEntry("meal", { name: "Chicken adobo" }, "kg", "manual")?.data).toMatchObject({ name: "Chicken adobo", kcal: null });
  });

  it("dates a typed-in workout on the chosen day", () => {
    const e = formToEntry("workout", { activity: "Run", date: "2026-10-24", distance_km: "5" }, "kg", "manual");
    expect(e?.occurred_at?.startsWith("2026-10-24")).toBe(true);
    expect(e?.data).toMatchObject({ activity: "run", distance_km: 5 });
  });
});

describe("photo readings", () => {
  it("fills the blood pressure form from a monitor photo", () => {
    const r = scanToFields("blood_pressure", { readable: true, systolic: 116, diastolic: 76, pulse: 72 }, "kg", "2026-10-25");
    expect(r.fields).toEqual({ systolic: "116", diastolic: "76", pulse: "72" });
    expect(r.error).toBeUndefined();
  });

  it("flags an unreadable display but leaves the form usable", () => {
    const r = scanToFields("blood_pressure", { readable: false, systolic: null, diastolic: null, pulse: null }, "kg", "2026-10-25");
    expect(r.error).toBeTruthy();
    expect(r.fields.systolic).toBe("");
  });

  it("converts a scale reading in lb to the user's kg setting", () => {
    expect(scanToFields("weight", { readable: true, weight: 220.5, unit: "lb", body_fat_pct: null, note: "" }, "kg", "x").fields.weight).toBe("100");
  });
});
