"use client";
import { useState } from "react";

export function WaterCard({ drankMl, targetMl, onAdd }: { drankMl: number; targetMl: number; onAdd: (ml: number) => Promise<boolean> }) {
  const [busy, setBusy] = useState(false);
  const pct = Math.min(100, Math.round((drankMl / targetMl) * 100));
  const add = async (ml: number) => {
    setBusy(true);
    await onAdd(ml);
    setBusy(false);
  };
  return (
    <section className="card flex flex-col gap-3" id="water">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold">Water</h2>
        <span className="num text-sm">
          {(drankMl / 1000).toFixed(2)} / {(targetMl / 1000).toFixed(1)} L
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-soft" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Water today">
        <div className="h-full rounded-full bg-water transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-2">
        {[250, 500].map((ml) => (
          <button key={ml} className="btn-ghost flex-1" disabled={busy} onClick={() => add(ml)}>
            + {ml} ml
          </button>
        ))}
      </div>
    </section>
  );
}
