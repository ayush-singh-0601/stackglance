import { describe, expect, it } from "vitest";

import type { Story } from "../src/core/types.js";
import { StackGlanceDatabase } from "../src/storage/database.js";

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

describe("StackGlanceDatabase", () => {
  it("migrates and round-trips stories", () => {
    const database = new StackGlanceDatabase(":memory:");
    database.upsertStories([story]);
    expect(database.getStory("story-1")).toEqual(story);
    expect(database.listStories(new Date("2026-08-27"))).toEqual([story]);
    expect(database.saveStory("story-1")).toBe(true);
    expect(database.saveStory("story-1")).toBe(false);
    database.close();
  });

  it("stores daemon metadata", () => {
    const database = new StackGlanceDatabase(":memory:");
    database.setMetadata("last_fetch", "now");
    expect(database.getMetadata("last_fetch")).toBe("now");
    database.close();
  });

  it("rotates through the freshest pool before repeating a story", () => {
    const database = new StackGlanceDatabase(":memory:");
    const newer = {
      ...story,
      id: "story-2",
      sourceId: "2",
      url: "https://example.com/story-2",
      headline: "A newer useful release arrives",
      publishedAt: "2026-08-27T00:00:00.000Z",
    };
    database.upsertStories([story, newer]);

    expect(database.nextStory(new Date("2026-08-28"))?.id).toBe("story-2");
    database.markStoryShown("story-2", new Date("2026-08-28T00:00:00.000Z"));
    expect(database.nextStory(new Date("2026-08-28"))?.id).toBe("story-1");
    expect(database.nextStory(new Date("2026-08-28"), ["story-1"])?.id).toBe("story-2");
    database.close();
  });
});
