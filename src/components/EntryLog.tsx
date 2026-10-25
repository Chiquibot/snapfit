"use client";
import { useState } from "react";
import type { Entry, EntryType } from "@/lib/entries";
import { localDay } from "@/lib/dates";
import { fmtWeight } from "@/lib/units";

const COLORS: Record<EntryType, string> = {
  weight: "var(--color-scale)",
  meal: "var(--color-accent)",
  workout: "var(--color-run)",
  sleep: "var(--color-sleep)",
  checkin: "var(--color-muted)",
  water: "var(--color-water)",
  blood_pressure: "var(--color-warn)",
};

type AnyEntry = Entry<EntryType>;

function describe(e: AnyEntry, units: "kg" | "lb"): [string, string] {
  const d = e.data as Record<string, never>;
  switch (e.type) {
    case "weight":
      return ["Weigh-in", `${fmtWeight(d.kg, units)} ${units}`];
    case "meal":
      return [d.name || "Meal", d.kcal != null ? `${Math.round(d.kcal)} kcal` : ""];
    case "workout":
      return [
        `${String(d.activity || "Workout").replace(/^./, (c) => c.toUpperCase())}${d.app ? ` · ${d.app}` : ""}`,
        [d.distance_km ? `${Number(d.distance_km).toFixed(2)} km` : "", d.duration_min ? `${Math.round(d.duration_min)} min` : ""].filter(Boolean).join(" · "),
      ];
    case "sleep":
      return ["Sleep", `${d.hours} h`];
    case "checkin":
      return ["Check-in", [d.stress && `stress ${d.stress}`, d.energy && `energy ${d.energy}`].filter(Boolean).join(" · ")];
    case "water":
      return ["Water", `${d.ml} ml`];
    case "blood_pressure":
      return ["Blood pressure", `${d.systolic}/${d.diastolic}${d.pulse ? ` · ${d.pulse} bpm` : ""}`];
  }
}

export function EntryLog({ entries, units, timezone, onDelete }: { entries: AnyEntry[]; units: "kg" | "lb"; timezone: string; onDelete: (id: string) => void }) {
  const [armed, setArmed] = useState<string | null>(null);
  const shown = entries.filter((e) => e.type !== "water").slice(0, 30);
  const today = localDay(new Date(), timezone);
  return (
    <section className="card flex flex-col">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold">Log</h2>
        <span className="text-xs text-muted">last 90 days</span>
      </div>
      {shown.length === 0 && <p className="mt-2 text-sm text-muted">Nothing yet. Tap Scale, Meal, Workout or Sleep above and take a photo. You check the numbers before anything is saved.</p>}
      {shown.map((e) => {
        const [title, value] = describe(e, units);
        const day = localDay(e.occurred_at, timezone);
        const when =
          day === today
            ? new Date(e.occurred_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: timezone })
            : new Date(e.occurred_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: timezone });
        return (
          <div key={e.id} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 border-t border-line py-2.5 first-of-type:border-0">
            <span className="h-7 w-7 rounded-lg" style={{ background: COLORS[e.type] }} aria-hidden />
            <div className="min-w-0">
              <div className="break-words">{title}</div>
              <div className="text-xs text-muted">
                {when}
                {e.source === "shortcut" ? " · from Apple Health" : e.source === "photo" ? " · from photo" : ""}
              </div>
            </div>
            <div className="num text-right text-sm">
              {value}
              <br />
              <button
                className="font-sans text-xs text-muted"
                onClick={() => {
                  if (armed === e.id) onDelete(e.id);
                  else {
                    setArmed(e.id);
                    setTimeout(() => setArmed((a) => (a === e.id ? null : a)), 3000);
                  }
                }}
              >
                {armed === e.id ? "Tap to confirm" : "Delete"}
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
