import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { SCAN_SCHEMAS, scanPrompt, type ScanKind, type ScanResult } from "./scan";
import { costUsd } from "./cost";
import { createAdminClient } from "./supabase/admin";

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic()); // reads ANTHROPIC_API_KEY

export const MODELS = {
  scan: process.env.SCAN_MODEL || "claude-haiku-5-5",
  meal: process.env.MEAL_MODEL || "claude-haiku-5-5",
  coach: process.env.COACH_MODEL || "claude-sonnet-5-5",
};

export class ClaudeError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

async function logUsage(owner: string, route: string, model: string, usage: { input_tokens: number; output_tokens: number }) {
  const cost = costUsd(model, usage.input_tokens, usage.output_tokens);
  // Usage logging must never break the user's request.
  await createAdminClient()
    .from("ai_usage")
    .insert({ owner, route, model, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens, cost_usd: cost })
    .then(
      () => undefined,
      () => undefined,
    );
  return cost;
}

type ImageMedia = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export async function readPhoto<K extends ScanKind>(
  owner: string,
  kind: K,
  image: { base64: string; mediaType: ImageMedia },
): Promise<{ result: ScanResult[K]; costUsd: number; model: string }> {
  const model = kind === "meal" ? MODELS.meal : MODELS.scan;
  try {
    const response = await anthropic().messages.parse({
      model,
      max_tokens: 4000,
      // Reading numbers off a screen needs little thinking; estimating a plate needs a bit more.
      output_config: { effort: kind === "meal" ? "medium" : "low", format: zodOutputFormat(SCAN_SCHEMAS[kind]) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
            { type: "text", text: scanPrompt(kind) },
          ],
        },
      ],
    });
    const cost = await logUsage(owner, `scan:${kind}`, model, response.usage);
    if (response.stop_reason === "refusal") throw new ClaudeError("Claude declined to read this photo. Try a different photo.", 422);
    if (!response.parsed_output) throw new ClaudeError("Couldn't read that photo. Try again with the numbers in focus.", 422);
    return { result: response.parsed_output as ScanResult[K], costUsd: cost, model };
  } catch (e) {
    throw toClaudeError(e);
  }
}

export async function coach(owner: string, prompt: string): Promise<{ text: string; costUsd: number }> {
  const model = MODELS.coach;
  try {
    const response = await anthropic().beta.messages.create({
      model,
      max_tokens: 8000,
      output_config: { effort: "medium" },
      // If the model declines for a policy reason, let the API retry on its default fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: prompt }],
    });
    const cost = await logUsage(owner, "coach", model, response.usage);
    if (response.stop_reason === "refusal") throw new ClaudeError("Coach couldn't answer this time. Try again later.", 422);
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return { text, costUsd: cost };
  } catch (e) {
    throw toClaudeError(e);
  }
}

function toClaudeError(e: unknown): ClaudeError {
  if (e instanceof ClaudeError) return e;
  if (e instanceof Anthropic.AuthenticationError) return new ClaudeError("The Claude API key is missing or wrong. Check ANTHROPIC_API_KEY.", 500);
  if (e instanceof Anthropic.RateLimitError) return new ClaudeError("Too many requests right now. Wait a minute and try again.", 429);
  if (e instanceof Anthropic.BadRequestError) return new ClaudeError("Claude couldn't process that request.", 400);
  if (e instanceof Anthropic.APIError) return new ClaudeError("Claude is unavailable right now. Try again shortly.", 502);
  console.error(e);
  return new ClaudeError("Something went wrong reading that.", 500);
}
