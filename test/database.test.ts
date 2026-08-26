import { describe, expect, it } from "vitest";

import type { Story } from "../src/core/types.js";
import { DevRadarDatabase } from "../src/storage/database.js";

const story: Story = {
  id: "story-1",
  source: "example",
  sourceId: "1",
  url: "https://example.com/story",
  headline: "A useful release arrives",
  summary: "The release makes repository work faster.",
  whyItMatters: "Projects can adopt the improvement.",
  category: "project",
  scope: "project",
  publishedAt: "2026-08-26T00:00:00.000Z",
  expiresAt: "2026-09-26T00:00:00.000Z",
  relevance: 0.8,
  tags: ["typescript"],
};

describe("DevRadarDatabase", () => {
  it("migrates and round-trips stories", () => {
    const database = new DevRadarDatabase(":memory:");
    database.upsertStories([story]);
    expect(database.getStory("story-1")).toEqual(story);
    expect(database.listStories(new Date("2026-08-27"))).toEqual([story]);
    expect(database.saveStory("story-1")).toBe(true);
    expect(database.saveStory("story-1")).toBe(false);
    database.close();
  });

  it("stores daemon metadata", () => {
    const database = new DevRadarDatabase(":memory:");
    database.setMetadata("last_fetch", "now");
    expect(database.getMetadata("last_fetch")).toBe("now");
    database.close();
  });
});
