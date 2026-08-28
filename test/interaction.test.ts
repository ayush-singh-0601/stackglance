import { describe, expect, it } from "vitest";

import type { Story } from "../src/core/types.js";
import { CardInteractionController } from "../src/cards/interaction.js";
import { StackGlanceDatabase } from "../src/storage/database.js";

const story: Story = {
  id: "one",
  source: "news",
  sourceId: "one",
  url: "https://example.com",
  headline: "Redis release improves common caching workflows",
  summary:
    "The release reduces unnecessary network round trips and adds better diagnostics for cache misses. Existing commands remain compatible while applications gain more predictable behavior.",
  whyItMatters:
    "This project uses Redis, so the performance change directly affects current API work.",
  category: "project",
  scope: "project",
  publishedAt: "2026-08-26T00:00:00Z",
  expiresAt: "2026-09-26T00:00:00Z",
  relevance: 0.91,
  tags: ["redis"],
};

describe("card keyboard interaction", () => {
  it("consumes E and S only while a card is active", () => {
    const database = new StackGlanceDatabase(":memory:");
    database.upsertStories([story]);
    const output: string[] = [];
    let hidden = 0;
    const controller = new CardInteractionController({
      database,
      output: { write: (value) => output.push(value) },
      onHide: () => (hidden += 1),
    });
    expect(controller.handleInput("e")).toBe("e");
    controller.show(story);
    expect(controller.handleInput("E")).toBeUndefined();
    expect(output.join("")).toContain("Technical details");
    controller.show(story);
    expect(controller.handleInput("S")).toBeUndefined();
    expect(database.listSavedStories()).toEqual([story]);
    expect(hidden).toBe(2);
    database.close();
  });

  it("hides and forwards ordinary developer input", () => {
    const database = new StackGlanceDatabase(":memory:");
    const controller = new CardInteractionController({
      database,
      output: { write: () => undefined },
    });
    controller.show(story);
    expect(controller.handleInput("hello")).toBe("hello");
    database.close();
  });
});
