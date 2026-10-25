"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Entry, EntryType, Person } from "@/lib/entries";
import { localDay } from "@/lib/dates";
import { streak, summarizeDay, weightTrend, weeklyRate, wellbeing } from "@/lib/stats";
import { fmtWeight } from "@/lib/units";
import { SnapGrid } from "./SnapGrid";
import { WaterCard } from "./WaterCard";
import { CheckinCard } from "./CheckinCard";
import { WeightChart } from "./WeightChart";
import { CoachCard } from "./CoachCard";
import { EntryLog } from "./EntryLog";

type AnyEntry = Entry<EntryType>;
export type NewEntry = { type: EntryType; data: Record<string, unknown>; occurred_at?: string; source?: "photo" | "manual" };

export function Dashboard({ people, timezone, units }: { people: Person[]; timezone: string; units: "kg" | "lb" }) {
  const supabase = useMemo(() => createClient(), []);
  const person = people[0];
  const [entries, setEntries] = useState<AnyEntry[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!person) return;
    const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .eq("person_id", person.id)
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .returns<AnyEntry[]>();
    if (error) setError("Couldn't load your entries. Pull down to refresh.");
    else setEntries(data ?? []);
  }, [person, supabase]);

  useEffect(() => {
    // Loading data from Supabase when the selected person changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function add(e: NewEntry) {
    if (!person) return false;
    const { error } = await supabase.from("entries").insert({
      person_id: person.id,
      type: e.type,
      data: e.data,
      occurred_at: e.occurred_at ?? new Date().toISOString(),
      source: e.source ?? "manual",
    });
    if (error) {
      setError("Couldn't save. Check your connection and try again.");
      return false;
    }
    setError("");
    await load();
    return true;
  }

  async function remove(id: string) {
    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (error) setError("Couldn't delete that entry.");
    else setEntries((xs) => xs.filter((x) => x.id !== id));
  }

  if (!person) return <p className="text-muted">Setting up your account… refresh in a moment.</p>;

  const today = localDay(new Date(), timezone);
  const day = summarizeDay(entries, today, timezone);
  const trend = weightTrend(entries);
  const rate = weeklyRate(trend);
  const wb = wellbeing(entries, today, timezone);
  const lastWeight = trend.at(-1)?.kg ?? null;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", timeZone: timezone })}
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Snapfit</h1>
        </div>
        <Link href="/settings" className="btn-ghost text-sm">
          Settings
        </Link>
      </header>

      {error && <p className="rounded-xl bg-soft px-3 py-2 text-sm text-warn">{error}</p>}

      <SnapGrid person={person} units={units} onSave={add} />

      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Today</h2>
          <span className="rounded-full bg-soft px-2 py-0.5 text-xs font-semibold">{streak(entries, today, timezone)}-day streak</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <>
              <Stat
                label="Calories"
                value={day.kcal}
                unit={`of ${person.kcal_target ?? "–"}`}
                pct={person.kcal_target ? day.kcal / person.kcal_target : undefined}
                color={person.kcal_target && day.kcal > person.kcal_target ? "var(--color-warn)" : undefined}
              />
              <Stat
                label="Protein"
                value={day.protein_g}
                unit={`of ${person.protein_target ?? "–"} g`}
                pct={person.protein_target ? day.protein_g / person.protein_target : undefined}
              />
              <Stat label="Active today" value={day.workout_min} unit={day.distance_km ? `min · ${day.distance_km} km` : "min"} color="var(--color-run)" />
              <Stat
                label="Weight"
                value={fmtWeight(lastWeight, units)}
                unit={rate === null ? units : `${units} · ${rate > 0 ? "+" : ""}${rate} kg/wk`}
              />
          </>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted">
          <Mini label="Sleep avg" value={wb.sleep_hours === null ? "–" : `${wb.sleep_hours} h`} />
          <Mini label="Stress avg" value={wb.stress === null ? "–" : `${wb.stress}/5`} />
          <Mini label="Energy avg" value={wb.energy === null ? "–" : `${wb.energy}/5`} />
        </div>
      </section>

      <WaterCard drankMl={day.water_ml} targetMl={person.water_target_ml} onAdd={(ml) => add({ type: "water", data: { ml } })} />
      <CheckinCard onSave={(data) => add({ type: "checkin", data })} />
      <WeightChart trend={trend} units={units} goalKg={person.goal_kg} title="Weight trend" />
      <CoachCard person={person} />
      <EntryLog entries={entries} units={units} timezone={timezone} onDelete={remove} />
    </>
  );
}

function Stat({ label, value, unit, pct, color }: { label: string; value: string | number; unit: string; pct?: number; color?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-soft p-3">
      <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">{label}</span>
      <span className="num text-2xl">
        {value}
        <small className="ml-1 font-sans text-xs text-muted">{unit}</small>
      </span>
      {pct !== undefined && (
        <div className="h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round(pct * 100))}%`, background: color ?? "var(--color-accent)" }} />
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line px-2 py-2">
      <div className="num text-base text-ink">{value}</div>
      {label}
    </div>
  );
}
