import { describe, expect, it } from "vitest";

import type { Story } from "../src/core/types.js";
import { explainStory, saveStory } from "../src/cards/actions.js";
import { DevRadarDatabase } from "../src/storage/database.js";

const story: Story = {
  id: "one",
  source: "news",
  sourceId: "one",
  url: "https://example.com/one",
  headline: "Redis release improves common caching workflows",
  summary: "The release reduces unnecessary network round trips and adds better diagnostics for cache misses. Existing commands remain compatible while applications gain more predictable behavior.",
  whyItMatters: "This project uses Redis, so the performance change directly affects current API work.",
  category: "project",
  scope: "project",
  publishedAt: "2026-08-26T00:00:00Z",
  expiresAt: "2026-09-26T00:00:00Z",
  relevance: 0.91,
  tags: ["redis"],
};

describe("progressive story actions", () => {
  it("expands a card into structured detail", () => {
    const explanation = explainStory(story);
    expect(explanation).toContain("What's new");
    expect(explanation).toContain("Technical details");
    expect(explanation).toContain("Relevant link\nhttps://example.com/one");
  });

  it("durably saves a known story", () => {
    const database = new DevRadarDatabase(":memory:");
    database.upsertStories([story]);
    expect(saveStory(database, "one")).toEqual(story);
    expect(database.listSavedStories()).toEqual([story]);
    expect(saveStory(database, "one")).toEqual(story);
    database.close();
  });
});
