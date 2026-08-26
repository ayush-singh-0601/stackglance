import { describe, expect, it } from "vitest";

import type { StoryCandidate } from "../src/core/types.js";
import { scoreRelevance } from "../src/intelligence/relevance.js";

const story: StoryCandidate = {
  id: "one",
  source: "source",
  sourceId: "one",
  url: "https://example.com",
  title: "Redis query improvements",
  body: "",
  category: "project",
  publishedAt: "2026-08-25T00:00:00.000Z",
  expiresAt: "2026-09-01T00:00:00.000Z",
  tags: ["redis", "caching", "database"],
  metadata: {},
};

describe("relevance scoring", () => {
  it("prioritizes task matches over project and global stories", () => {
    const repository = { root: "/repo", technologies: ["redis"], dependencies: {} };
    const task = scoreRelevance(story, repository, ["caching"], new Date("2026-08-26"));
    const project = scoreRelevance(story, repository, ["authentication"], new Date("2026-08-26"));
    const global = scoreRelevance(story, { ...repository, technologies: [] }, [], new Date("2026-08-26"));
    expect(task.scope).toBe("task");
    expect(project.scope).toBe("project");
    expect(global.scope).toBe("global");
    expect(task.score).toBeGreaterThan(project.score);
    expect(project.score).toBeGreaterThan(global.score);
  });
});
