import { describe, expect, it } from "vitest";
import { shouldRemindWater } from "@/lib/reminders";

const base = { minute: 0, wakeHour: 7, sleepHour: 22, targetMl: 2500, minutesSinceLastDrink: null };

describe("shouldRemindWater", () => {
  it("stays quiet in the first hour after waking and before bed", () => {
    expect(shouldRemindWater({ ...base, hour: 7, drankMl: 0 })).toBe(false);
    expect(shouldRemindWater({ ...base, hour: 21, minute: 30, drankMl: 0 })).toBe(false);
    expect(shouldRemindWater({ ...base, hour: 3, drankMl: 0 })).toBe(false);
  });

  it("reminds when behind pace mid-day", () => {
    // At 13:00, 6/15 of the day is gone → expect ~1000 ml.
    expect(shouldRemindWater({ ...base, hour: 13, drankMl: 300 })).toBe(true);
  });

  it("does not remind when on pace or done", () => {
    expect(shouldRemindWater({ ...base, hour: 13, drankMl: 1000 })).toBe(false);
    expect(shouldRemindWater({ ...base, hour: 15, drankMl: 2500 })).toBe(false);
  });

  it("waits 90 minutes after the last drink", () => {
    expect(shouldRemindWater({ ...base, hour: 13, drankMl: 300, minutesSinceLastDrink: 45 })).toBe(false);
    expect(shouldRemindWater({ ...base, hour: 13, drankMl: 300, minutesSinceLastDrink: 120 })).toBe(true);
  });
});
