"use client";
import type { WeightPoint } from "@/lib/stats";
import { toDisplay } from "@/lib/units";

export function WeightChart({ trend, units, goalKg, title }: { trend: WeightPoint[]; units: "kg" | "lb"; goalKg: number | null; title: string }) {
  if (trend.length < 2) {
    return (
      <section className="card">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted">
          {trend.length ? "One weigh-in so far. Snap the scale again in a few days to see your trend." : "Snap your scale to start the trend line. Weigh in at the same time each morning for the steadiest numbers."}
        </p>
      </section>
    );
  }
  const conv = (kg: number) => toDisplay(kg, units);
  const goal = goalKg ? conv(goalKg) : null;
  const ys = trend.map((p) => conv(p.kg)).concat(goal ? [goal] : []);
  const lo = Math.floor(Math.min(...ys) - 1);
  const hi = Math.ceil(Math.max(...ys) + 1);
  const W = 520, H = 200, L = 40, R = 12, T = 12, B = 26;
  const t0 = Date.parse(trend[0].at);
  const t1 = Date.parse(trend.at(-1)!.at);
  const x = (at: string) => L + (W - L - R) * ((Date.parse(at) - t0) / Math.max(1, t1 - t0));
  const y = (v: number) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const step = Math.max(1, Math.ceil((hi - lo) / 4));
  const ticks: number[] = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  const line = trend.map((p, i) => `${i ? "L" : "M"}${x(p.at).toFixed(1)},${y(conv(p.avg7)).toFixed(1)}`).join("");
  const area = `${line}L${x(trend.at(-1)!.at)},${H - B}L${L},${H - B}Z`;
  const fmt = (at: string) => new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const diff = conv(trend.at(-1)!.avg7) - conv(trend[0].avg7);

  return (
    <section className="card flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <span className="text-sm text-muted">
          {diff <= 0 ? "↓" : "↑"} {Math.abs(diff).toFixed(1)} {units} (7-weigh-in avg)
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${title} over time`} className="[&_text]:fill-muted [&_text]:font-mono [&_text]:text-[11px]">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--color-line)" />
            <text x={L - 6} y={y(v) + 4} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {goal && (
          <g>
            <line x1={L} x2={W - R} y1={y(goal)} y2={y(goal)} stroke="var(--color-accent)" strokeDasharray="5 4" strokeWidth={1.5} />
            <text x={W - R} y={y(goal) - 5} textAnchor="end">
              goal {goal.toFixed(0)}
            </text>
          </g>
        )}
        <path d={area} fill="var(--color-scale)" fillOpacity={0.1} />
        <path d={line} fill="none" stroke="var(--color-scale)" strokeWidth={2.5} strokeLinejoin="round" />
        {trend.map((p) => (
          <circle key={p.at} cx={x(p.at)} cy={y(conv(p.kg))} r={2.5} fill="var(--color-muted)" fillOpacity={0.6} />
        ))}
        <circle cx={x(trend.at(-1)!.at)} cy={y(conv(trend.at(-1)!.avg7))} r={5} fill="var(--color-scale)" />
        <text x={L} y={H - 6}>
          {fmt(trend[0].at)}
        </text>
        <text x={W - R} y={H - 6} textAnchor="end">
          {fmt(trend.at(-1)!.at)}
        </text>
      </svg>
    </section>
  );
}
