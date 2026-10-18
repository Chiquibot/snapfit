export const LB_PER_KG = 2.20462;
export const toDisplay = (kg: number, units: "kg" | "lb") => (units === "lb" ? kg * LB_PER_KG : kg);
export const fromDisplay = (v: number, units: "kg" | "lb") => (units === "lb" ? v / LB_PER_KG : v);
export const fmtWeight = (kg: number | null | undefined, units: "kg" | "lb") => (kg == null ? "–" : toDisplay(kg, units).toFixed(1));
