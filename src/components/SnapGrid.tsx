"use client";
import { useState } from "react";
import type { Person } from "@/lib/entries";
import type { ScanKind } from "@/lib/scan";
import { shrinkImage } from "@/lib/image";
import { fromDisplay, LB_PER_KG } from "@/lib/units";
import type { NewEntry } from "./Dashboard";

const SNAPS: { kind: ScanKind; label: string; hint: string; color: string; camera: boolean }[] = [
  { kind: "weight", label: "Scale", hint: "Snap the display", color: "var(--color-scale)", camera: true },
  { kind: "meal", label: "Meal", hint: "Snap your plate", color: "var(--color-accent)", camera: true },
  { kind: "workout", label: "Workout", hint: "Nike or Hevy screenshot", color: "var(--color-run)", camera: false },
  { kind: "sleep", label: "Sleep", hint: "Sleep app screenshot", color: "var(--color-sleep)", camera: false },
];

type Fields = Record<string, string>;
type Review = { kind: ScanKind; preview: string; loading: boolean; error?: string; fields: Fields; extra?: { items?: string; tip?: string; cost?: number } };

const s = (v: unknown) => (v === null || v === undefined ? "" : String(Math.round(Number(v) * 10) / 10));

export function SnapGrid({ person, units, onSave }: { person: Person; units: "kg" | "lb"; onSave: (e: NewEntry) => Promise<boolean> }) {
  const [review, setReview] = useState<Review | null>(null);
  const [saving, setSaving] = useState(false);

  async function pick(kind: ScanKind, file: File | undefined) {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setReview({ kind, preview, loading: true, fields: {} });
    const form = new FormData();
    form.set("kind", kind);
    form.set("child", person.kind === "child" ? "1" : "0");
    form.set("image", await shrinkImage(file), "photo.jpg");
    try {
      const res = await fetch("/api/scan", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't read that photo.");
      const f = toFields(kind, json.result, units);
      setReview({ kind, preview, loading: false, ...f, extra: { ...f.extra, cost: json.costUsd } });
    } catch (e) {
      setReview({ kind, preview, loading: false, fields: {}, error: `${(e as Error).message} You can fill in the numbers yourself.` });
    }
  }

  async function save() {
    if (!review) return;
    const entry = toEntry(review, units);
    if (!entry) {
      setReview({ ...review, error: "Fill in the main number first." });
      return;
    }
    setSaving(true);
    const ok = await onSave(entry);
    setSaving(false);
    if (ok) setReview(null);
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => review && setReview({ ...review, fields: { ...review.fields, [k]: e.target.value } });
  // A plain function (not a component) so inputs keep focus while typing.
  const F = ({ k, label, type = "number", full }: { k: string; label: string; type?: string; full?: boolean }) => (
    <label className={`field ${full ? "col-span-2" : ""}`} htmlFor={`f-${k}`}>
      {label}
      <input id={`f-${k}`} type={type} inputMode={type === "number" ? "decimal" : undefined} step="any" value={review?.fields[k] ?? ""} onChange={set(k)} />
    </label>
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SNAPS.map((x) => (
          <label key={x.kind} className="card relative flex cursor-pointer flex-col gap-2 !p-3 focus-within:outline-2 focus-within:outline-accent">
            <input
              type="file"
              accept="image/*"
              {...(x.camera ? { capture: "environment" as const } : {})}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label={`${x.label}: ${x.hint}`}
              onChange={(e) => {
                pick(x.kind, e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <span className="h-8 w-8 rounded-lg" style={{ background: x.color }} aria-hidden />
            <span>
              <b className="font-display">{x.label}</b>
              <br />
              <span className="text-xs text-muted">{x.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {review && (
        <section className="card flex flex-col gap-3" aria-live="polite">
          <div className="flex gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={review.preview} alt="Your photo" className="h-24 w-24 flex-none rounded-xl object-cover" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-xs font-semibold tracking-wider text-muted uppercase">
                {person.name} · {SNAPS.find((x) => x.kind === review.kind)?.label}
              </p>
              {review.loading ? (
                <p className="text-muted">Reading your photo…</p>
              ) : (
                <p className="text-sm text-muted">Check the numbers, fix anything that&apos;s off, then save.</p>
              )}
              {review.extra?.items && <p className="text-sm">{review.extra.items}</p>}
            </div>
          </div>
          {review.error && <p className="text-sm text-warn">{review.error}</p>}
          {!review.loading && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {review.kind === "weight" && (
                  <>
                    {F({ k: "weight", label: `Weight (${units})` })}
                    {F({ k: "body_fat_pct", label: "Body fat % (optional)" })}
                  </>
                )}
                {review.kind === "meal" && (
                  <>
                    {F({ k: "name", label: "What it was", type: "text", full: true })}
                    {F({ k: "kcal", label: "Calories" })}
                    {F({ k: "protein_g", label: "Protein (g)" })}
                    {F({ k: "carbs_g", label: "Carbs (g)" })}
                    {F({ k: "fat_g", label: "Fat (g)" })}
                    {F({ k: "fiber_g", label: "Fiber (g)" })}
                    {F({ k: "veg_fruit_servings", label: "Veg & fruit servings" })}
                  </>
                )}
                {review.kind === "workout" && (
                  <>
                    {F({ k: "activity", label: "Activity", type: "text" })}
                    {F({ k: "date", label: "Date", type: "date" })}
                    {F({ k: "duration_min", label: "Time (min)" })}
                    {F({ k: "distance_km", label: "Distance (km)" })}
                    {F({ k: "kcal", label: "Calories" })}
                    {F({ k: "volume_kg", label: "Volume lifted (kg)" })}
                  </>
                )}
                {review.kind === "sleep" && (
                  <>
                    {F({ k: "hours", label: "Hours asleep" })}
                    {F({ k: "date", label: "Morning of", type: "date" })}
                    {F({ k: "deep_hours", label: "Deep sleep (h)" })}
                    {F({ k: "resting_hr", label: "Resting heart rate" })}
                  </>
                )}
              </div>
              {review.extra?.tip && (
                <p className="rounded-xl bg-soft px-3 py-2 text-sm">
                  <b>Tip:</b> {review.extra.tip}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button className="btn" onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button className="btn-ghost" onClick={() => setReview(null)}>
                  Discard
                </button>
                {review.extra?.cost !== undefined && <span className="ml-auto text-xs text-muted">Reading cost ${review.extra.cost.toFixed(4)}</span>}
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}

// Map Claude's reading into editable form fields.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- result shape depends on kind; validated server-side
function toFields(kind: ScanKind, r: any, units: "kg" | "lb"): { fields: Fields; extra?: Review["extra"]; error?: string } {
  const today = new Date().toISOString().slice(0, 10);
  switch (kind) {
    case "weight": {
      let w = r.weight as number | null;
      if (w != null && r.unit && r.unit !== units) w = r.unit === "lb" ? w / LB_PER_KG : w * LB_PER_KG;
      return { fields: { weight: s(w), body_fat_pct: s(r.body_fat_pct) }, error: r.readable ? undefined : r.note || "Couldn't read the display." };
    }
    case "meal":
      return {
        fields: { name: r.name ?? "", kcal: s(r.kcal), protein_g: s(r.protein_g), carbs_g: s(r.carbs_g), fat_g: s(r.fat_g), fiber_g: s(r.fiber_g), veg_fruit_servings: s(r.veg_fruit_servings) },
        extra: {
          items: (r.items ?? []).map((i: { name: string; portion: string }) => `${i.name} (${i.portion})`).join(", "),
          tip: r.tip,
        },
        error: r.is_food ? undefined : "That doesn't look like food.",
      };
    case "workout":
      return {
        fields: { activity: r.activity ?? "", date: r.date ?? today, duration_min: s(r.duration_min), distance_km: s(r.distance_km), kcal: s(r.kcal), volume_kg: s(r.volume_kg), app: r.app ?? "" },
        error: r.readable ? undefined : "Couldn't find a workout in that screenshot.",
      };
    case "sleep":
      return {
        fields: { hours: s(r.hours), date: r.date ?? today, deep_hours: s(r.deep_hours), resting_hr: s(r.resting_hr), hrv_ms: s(r.hrv_ms) },
        error: r.readable ? undefined : "Couldn't find a sleep summary in that screenshot.",
      };
  }
}

function toEntry(r: Review, units: "kg" | "lb"): NewEntry | null {
  const n = (k: string) => {
    const v = parseFloat(r.fields[k] ?? "");
    return Number.isFinite(v) ? v : null;
  };
  const atNoon = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`).toISOString() : undefined);
  switch (r.kind) {
    case "weight": {
      const w = n("weight");
      return w ? { type: "weight", source: "photo", data: { kg: Math.round(fromDisplay(w, units) * 10) / 10, body_fat_pct: n("body_fat_pct") } } : null;
    }
    case "meal":
      return {
        type: "meal",
        source: "photo",
        data: {
          name: r.fields.name || "Meal",
          items: [],
          kcal: n("kcal"),
          protein_g: n("protein_g"),
          carbs_g: n("carbs_g"),
          fat_g: n("fat_g"),
          fiber_g: n("fiber_g"),
          veg_fruit_servings: n("veg_fruit_servings"),
          tip: r.extra?.tip ?? null,
        },
      };
    case "workout":
      return {
        type: "workout",
        source: "photo",
        occurred_at: atNoon(r.fields.date),
        data: {
          activity: (r.fields.activity || "workout").toLowerCase(),
          app: r.fields.app || null,
          duration_min: n("duration_min"),
          distance_km: n("distance_km"),
          kcal: n("kcal"),
          volume_kg: n("volume_kg"),
        },
      };
    case "sleep": {
      const h = n("hours");
      return h
        ? { type: "sleep", source: "photo", occurred_at: atNoon(r.fields.date), data: { hours: h, deep_hours: n("deep_hours"), resting_hr: n("resting_hr"), hrv_ms: n("hrv_ms") } }
        : null;
    }
  }
}
