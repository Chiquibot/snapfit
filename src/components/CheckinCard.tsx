"use client";
import { useState } from "react";

const SCALES = [
  { key: "stress", label: "Stress", low: "calm", high: "very stressed" },
  { key: "energy", label: "Energy", low: "drained", high: "full of energy" },
  { key: "rested", label: "Rested", low: "exhausted", high: "well rested" },
] as const;
type Key = (typeof SCALES)[number]["key"];

export function CheckinCard({ onSave }: { onSave: (data: Record<string, unknown>) => Promise<boolean> }) {
  const [vals, setVals] = useState<Partial<Record<Key, number>>>({});
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const any = Object.keys(vals).length > 0;

  async function save() {
    const ok = await onSave({ ...vals, note: note.trim() || null });
    if (ok) {
      setVals({});
      setNote("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <section className="card flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold">How are you feeling?</h2>
        <span className="text-xs text-muted">10 seconds, morning and evening</span>
      </div>
      {SCALES.map((s) => (
        <div key={s.key} className="flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{s.label}</span>
            <span className="text-xs text-muted">
              1 {s.low} · 5 {s.high}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label={s.label}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                role="radio"
                aria-checked={vals[s.key] === n}
                onClick={() => setVals((v) => ({ ...v, [s.key]: n }))}
                className={`num rounded-lg py-2 ${vals[s.key] === n ? "bg-accent text-accent-ink" : "bg-soft"}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
      <label className="field" htmlFor="checkin-note">
        Anything going on? (optional)
        <input id="checkin-note" type="text" maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Busy week at work, slept badly…" />
      </label>
      <div className="flex items-center gap-2">
        <button className="btn" disabled={!any} onClick={save}>
          Save check-in
        </button>
        {saved && <span className="text-sm text-muted">Saved</span>}
      </div>
    </section>
  );
}
