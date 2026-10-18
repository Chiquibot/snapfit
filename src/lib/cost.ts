// Claude API list prices in US dollars per million tokens (first-party API, Oct 2026).
// Update this table when Anthropic changes pricing.
export const PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
};

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICES[model];
  if (!p) return 0;
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

/** Rough image token estimate: about width × height / 750. */
export function imageTokens(width: number, height: number): number {
  return Math.ceil((width * height) / 750);
}
