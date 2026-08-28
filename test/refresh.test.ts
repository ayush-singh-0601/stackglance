import { describe, expect, it } from "vitest";

import { collectAndStore } from "../src/intelligence/refresh.js";
import { StackGlanceDatabase } from "../src/storage/database.js";
import { DeterministicSummarizer } from "../src/summaries/contract.js";

describe("intelligence refresh pipeline", () => {
  it("isolates collector failures and stores ranked card-ready stories", async () => {
    const database = new StackGlanceDatabase(":memory:");
    const report = await collectAndStore({
      collectors: [
        {
          name: "working feed",
          collect: () =>
            Promise.resolve([
              {
                source: "working feed",
                sourceId: "one",
                url: "https://example.com/one",
                title: "Redis release improves caching performance today",
                body: "The release reduces unnecessary network round trips and adds better diagnostics for cache misses. Existing commands remain compatible while applications gain more predictable behavior during common caching operations.",
                category: "project",
                publishedAt: "2026-08-26T00:00:00Z",
                fetchedAt: "2026-08-27T00:00:00Z",
              },
            ]),
        },
        { name: "broken feed", collect: () => Promise.reject(new Error("offline")) },
      ],
      repository: { root: "/repo", technologies: ["redis"], dependencies: { redis: "5.0.0" } },
      taskTags: ["caching"],
      weights: { task: 45, project: 30, global: 25 },
      summarizer: new DeterministicSummarizer(),
      database,
      now: new Date("2026-08-27T00:00:00Z"),
    });
    expect(report).toMatchObject({ collected: 1, stored: 1 });
    expect(report.errors[0]).toContain("broken feed: offline");
    expect(database.listStories(new Date("2026-08-27"))).toHaveLength(1);
    database.close();
  });
});
