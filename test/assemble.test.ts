import { describe, expect, it } from "vitest";

import type { StoryCandidate } from "../src/core/types.js";
import { assembleStory, cardContentSchema } from "../src/intelligence/assemble.js";

const candidate: StoryCandidate = {
  id: "one",
  source: "news",
  sourceId: "one",
  url: "https://example.com",
  title: "Release",
  body: "Body",
  category: "project",
  publishedAt: "2026-08-26T00:00:00Z",
  expiresAt: "2026-09-01T00:00:00Z",
  tags: ["redis"],
  metadata: {},
};

const content = {
  headline: "Redis release improves common caching workflows",
  summary: "The release reduces unnecessary network round trips and adds better diagnostics for cache misses. Existing commands remain compatible while applications gain more predictable behavior.",
  whyItMatters: "This project uses Redis, so the performance change directly affects current API work.",
};

describe("card assembly", () => {
  it("enforces total density and maps ranked content to a story", () => {
    expect(cardContentSchema.parse(content)).toEqual(content);
    expect(
      assembleStory(candidate, { score: 0.91, scope: "project", taskMatches: [], projectMatches: ["redis"], recency: 1 }, content),
    ).toMatchObject({ headline: content.headline, relevance: 0.91, scope: "project" });
  });

  it("rejects underfilled cards", () => {
    expect(() => cardContentSchema.parse({ ...content, summary: "This summary has far too few useful words for a card." })).toThrow();
  });
});
