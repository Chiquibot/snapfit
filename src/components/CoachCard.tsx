"use client";
import { useState } from "react";
import type { Person } from "@/lib/entries";

export function CoachCard({ person }: { person: Person }) {
  const [state, setState] = useState<{ text: string; loading: boolean; error?: string }>({ text: "", loading: false });

  async function ask() {
    setState({ text: "", loading: true });
    try {
      const res = await fetch("/api/coach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ personId: person.id }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setState({ text: json.text, loading: false });
    } catch (e) {
      setState({ text: "", loading: false, error: (e as Error).message || "Coach couldn't answer just now." });
    }
  }

  return (
    <section className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Coach</h2>
        <button className="btn" onClick={ask} disabled={state.loading}>
          {state.loading ? "Thinking…" : "What should I improve?"}
        </button>
      </div>
      {state.text ? (
        <p className="leading-relaxed whitespace-pre-wrap">{state.text}</p>
      ) : state.error ? (
        <p className="text-sm text-warn">{state.error}</p>
      ) : (
        <p className="text-sm text-muted">
          Looks at the last 14 days of weigh-ins, meals, workouts, sleep, stress and water, then names the two or three changes that would help most this week.
        </p>
      )}
    </section>
  );
}
