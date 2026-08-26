import { describe, expect, it } from "vitest";

import type { RadarScope, StoryCandidate } from "../src/core/types.js";
import { blendFeed, type RankedCandidate } from "../src/intelligence/blend.js";

function item(scope: RadarScope, index: number): RankedCandidate {
  const story: StoryCandidate = {
    id: `${scope}-${index}`,
    source: "test",
    sourceId: `${index}`,
    url: `https://example.com/${scope}/${index}`,
    title: "Story",
    body: "Body",
    category: "ai",
    publishedAt: "2026-08-26T00:00:00Z",
    expiresAt: "2026-09-01T00:00:00Z",
    tags: [],
    metadata: {},
  };
  return {
    story,
    relevance: { scope, score: 1 - index / 100, taskMatches: [], projectMatches: [], recency: 1 },
  };
}

describe("feed blending", () => {
  it("honors persistent scope weights while interleaving scopes", () => {
    const input = (["task", "project", "global"] as const).flatMap((scope) =>
      Array.from({ length: 10 }, (_, index) => item(scope, index)),
    );
    const output = blendFeed(input, { task: 50, project: 30, global: 20 }, 10);
    const counts = output.reduce<Record<string, number>>((result, entry) => {
      result[entry.relevance.scope] = (result[entry.relevance.scope] ?? 0) + 1;
      return result;
    }, {});
    expect(counts).toEqual({ task: 5, project: 3, global: 2 });
    expect(output.slice(0, 3).map((entry) => entry.relevance.scope)).toEqual([
      "task",
      "project",
      "global",
    ]);
  });
});
