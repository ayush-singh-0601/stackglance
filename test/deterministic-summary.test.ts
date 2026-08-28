import { describe, expect, it } from "vitest";

import type { StoryCandidate } from "../src/core/types.js";
import { countWords, deterministicSummary } from "../src/summaries/deterministic.js";

const story: StoryCandidate = {
  id: "one",
  source: "Release notes",
  sourceId: "one",
  url: "https://example.com",
  title: "Prisma introduces a faster query optimizer for common application patterns",
  body: "The latest release improves batching and removes unnecessary database round trips. It also adds diagnostics for expensive queries. Existing APIs remain compatible with the new optimizer.",
  category: "project",
  publishedAt: "2026-08-26T00:00:00Z",
  expiresAt: "2026-09-01T00:00:00Z",
  tags: ["prisma", "database"],
  metadata: {},
};

describe("deterministic summaries", () => {
  it("produces one-glance bounded content without an API key", () => {
    const result = deterministicSummary(story, {
      root: "/repo",
      technologies: ["prisma"],
      dependencies: {},
    });
    expect(countWords(result.headline)).toBeLessThanOrEqual(12);
    expect(countWords(result.summary)).toBeGreaterThanOrEqual(20);
    expect(countWords(result.summary)).toBeLessThanOrEqual(45);
    expect(countWords(result.whyItMatters)).toBeLessThanOrEqual(20);
    expect(result.whyItMatters).toContain("prisma");
  });

  it("turns security metadata into an actionable dependency summary", () => {
    const result = deterministicSummary(
      {
        ...story,
        title: "GHSA-5xrq-8626-4rwp affects vitest",
        body: "A dependency advisory may affect this project.",
        category: "security",
        tags: ["vitest", "security"],
        metadata: { advisory: "GHSA-5xrq-8626-4rwp", dependency: "vitest" },
      },
      { root: "/repo", technologies: ["vitest"], dependencies: { vitest: "^3.2.4" } },
    );
    expect(result.headline).toBe("GHSA-5xrq-8626-4rwp flags a security issue in vitest");
    expect(result.summary).toContain("affected version range");
    expect(result.whyItMatters).toContain("vitest");
  });
});
