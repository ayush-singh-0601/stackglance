import { describe, expect, it } from "vitest";

import { providerSecret, validateSummary } from "../src/summaries/contract.js";

describe("BYOK summary contract", () => {
  it("validates the PRD information-density ranges", () => {
    expect(
      validateSummary({
        headline: "New coding model improves repository work",
        summary: "The release improves long-running coding tasks, tool use, and repository-scale reasoning. It also reduces latency during multi-step changes across larger projects.",
        whyItMatters: "Developers can complete autonomous coding workflows faster and with fewer interruptions.",
      }),
    ).toMatchObject({ headline: "New coding model improves repository work" });
    expect(() => validateSummary({ headline: "Too short", summary: "Too short", whyItMatters: "Too short" })).toThrow(
      "headline must contain",
    );
  });

  it("reads provider secrets from the environment instead of configuration", () => {
    expect(providerSecret("openai", { OPENAI_API_KEY: "secret" })).toBe("secret");
    expect(providerSecret("deterministic", { OPENAI_API_KEY: "secret" })).toBeUndefined();
    expect(providerSecret("ollama", {})).toBeUndefined();
  });
});
