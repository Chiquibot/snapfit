import { describe, expect, it } from "vitest";
import { costUsd, imageTokens } from "@/lib/cost";

describe("cost", () => {
  it("prices a typical Haiku photo reading at well under a tenth of a cent", () => {
    const tokens = imageTokens(1024, 768) + 300;
    expect(costUsd("claude-haiku-5-5", tokens, 400)).toBeLessThan(0.001);
  });
  it("returns 0 for unknown models instead of throwing", () => {
    expect(costUsd("some-future-model", 1000, 1000)).toBe(0);
  });
});
