export type WaterReminderInput = {
  hour: number; // local hour now, 0–23
  minute: number;
  wakeHour: number;
  sleepHour: number;
  targetMl: number;
  drankMl: number; // so far today
  minutesSinceLastDrink: number | null; // null = nothing logged today
};

/**
 * Decide whether to send a water reminder this hour.
 * Remind only while awake, not in the first hour after waking or the last
 * hour before bed, and only when intake is behind a steady pace and the
 * person hasn't logged a drink in the last 90 minutes.
 */
export function shouldRemindWater(i: WaterReminderInput): boolean {
  const now = i.hour + i.minute / 60;
  const awakeSpan = i.sleepHour - i.wakeHour;
  if (awakeSpan <= 2) return false;
  if (now < i.wakeHour + 1 || now > i.sleepHour - 1) return false;
  if (i.drankMl >= i.targetMl) return false;
  if (i.minutesSinceLastDrink !== null && i.minutesSinceLastDrink < 90) return false;
  const expected = (i.targetMl * (now - i.wakeHour)) / awakeSpan;
  return i.drankMl < expected - 250;
}

export function waterMessage(drankMl: number, targetMl: number): { title: string; body: string } {
  const left = Math.max(0, targetMl - drankMl);
  return {
    title: "Time for some water",
    body: `${(drankMl / 1000).toFixed(1)} L so far today. ${(left / 1000).toFixed(1)} L to go. Tap to log a glass.`,
  };
}
