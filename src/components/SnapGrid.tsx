"use client";
import { useState } from "react";
import type { Person } from "@/lib/entries";
import type { ScanKind } from "@/lib/scan";
import { shrinkImage } from "@/lib/image";
import { blankFields, formFields, formToEntry, scanToFields, type Fields } from "@/lib/entry-form";
import type { NewEntry } from "./Dashboard";

const TILES: { kind: ScanKind; label: string; hint: string; color: string; camera: boolean }[] = [
  { kind: "weight", label: "Weight", hint: "Snap the scale", color: "var(--color-scale)", camera: true },
  { kind: "meal", label: "Meal", hint: "Snap your plate", color: "var(--color-accent)", camera: true },
  { kind: "workout", label: "Workout", hint: "Nike or Hevy screenshot", color: "var(--color-run)", camera: false },
  { kind: "sleep", label: "Sleep", hint: "Sleep app screenshot", color: "var(--color-sleep)", camera: false },
  { kind: "blood_pressure", label: "Blood pressure", hint: "Snap the monitor", color: "var(--color-warn)", camera: true },
];

type Form = {
  kind: ScanKind;
  preview: string | null; // null when typing in by hand
  loading: boolean;
  error?: string;
  fields: Fields;
  items?: string;
  tip?: string;
  cost?: number;
};

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local

export function SnapGrid({ units, onSave }: { person: Person; units: "kg" | "lb"; onSave: (e: NewEntry) => Promise<boolean> }) {
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  async function snap(kind: ScanKind, file: File | undefined) {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setForm({ kind, preview, loading: true, fields: {} });
    const body = new FormData();
    body.set("kind", kind);
    body.set("image", await shrinkImage(file), "photo.jpg");
    try {
      const res = await fetch("/api/scan", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't read that photo.");
      setForm({ kind, preview, loading: false, ...scanToFields(kind, json.result, units, today()), cost: json.costUsd });
    } catch (e) {
      setForm({ kind, preview, loading: false, fields: blankFields(kind, today()), error: `${(e as Error).message} You can type the numbers in instead.` });
    }
  }

  function typeIn(kind: ScanKind) {
    setForm({ kind, preview: null, loading: false, fields: blankFields(kind, today()) });
  }

  async function save() {
    if (!form) return;
    const entry = formToEntry(form.kind, form.fields, units, form.preview ? "photo" : "manual", form.tip);
    if (!entry) {
      setForm({ ...form, error: "Fill in the main number first." });
      return;
    }
    setSaving(true);
    const ok = await onSave(entry);
    setSaving(false);
    if (ok) setForm(null);
  }

  const tile = TILES.find((t) => t.kind === form?.kind);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {TILES.map((t) => (
          <div key={t.kind} className="card flex flex-col gap-2 !p-3 last:col-span-2 sm:last:col-span-1">
            <label className="relative flex cursor-pointer flex-col gap-2 rounded-lg focus-within:outline-2 focus-within:outline-accent">
              <input
                type="file"
                accept="image/*"
                {...(t.camera ? { capture: "environment" as const } : {})}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label={`${t.label}: ${t.hint}`}
                onChange={(e) => {
                  snap(t.kind, e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <span className="h-8 w-8 rounded-lg" style={{ background: t.color }} aria-hidden />
              <span>
                <b className="font-display">{t.label}</b>
                <br />
                <span className="text-xs text-muted">{t.hint}</span>
              </span>
            </label>
            <button className="self-start text-xs font-semibold text-accent underline underline-offset-2" onClick={() => typeIn(t.kind)}>
              Type it in
            </button>
          </div>
        ))}
      </div>

      {form && (
        <section className="card flex flex-col gap-3" aria-live="polite">
          <div className="flex gap-3">
            {form.preview && (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview
              <img src={form.preview} alt="Your photo" className="h-24 w-24 flex-none rounded-xl object-cover" />
            )}
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-xs font-semibold tracking-wider text-muted uppercase">
                {tile?.label} · {form.preview ? "from photo" : "typed in"}
              </p>
              {form.loading ? (
                <p className="text-muted">Reading your photo…</p>
              ) : (
                <p className="text-sm text-muted">{form.preview ? "Check the numbers, fix anything that's off, then save." : "Fill in what you have, then save."}</p>
              )}
              {form.items && <p className="text-sm">{form.items}</p>}
            </div>
          </div>
          {form.error && <p className="text-sm text-warn">{form.error}</p>}
          {!form.loading && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {formFields(form.kind, units).map((f) => (
                  <label key={f.k} className={`field ${f.full ? "col-span-2" : ""}`} htmlFor={`f-${f.k}`}>
                    {f.label}
                    <input
                      id={`f-${f.k}`}
                      type={f.type ?? "number"}
                      inputMode={(f.type ?? "number") === "number" ? "decimal" : undefined}
                      step="any"
                      value={form.fields[f.k] ?? ""}
                      onChange={(e) => setForm({ ...form, fields: { ...form.fields, [f.k]: e.target.value } })}
                    />
                  </label>
                ))}
              </div>
              {form.tip && (
                <p className="rounded-xl bg-soft px-3 py-2 text-sm">
                  <b>Tip:</b> {form.tip}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button className="btn" onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button className="btn-ghost" onClick={() => setForm(null)}>
                  Discard
                </button>
                {form.cost !== undefined && <span className="ml-auto text-xs text-muted">Reading cost ${form.cost.toFixed(4)}</span>}
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
