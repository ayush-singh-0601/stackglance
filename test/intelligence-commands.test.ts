import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { explainById, saveById, showCatchup, showFeed } from "../src/cli/commands/intelligence.js";
import type { CliContext } from "../src/cli/context.js";
import type { Story } from "../src/core/types.js";
import { resolvePaths } from "../src/core/paths.js";
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

describe("manual intelligence commands", () => {
  it("supports feed, catch-up, explain, and save from cached state", async () => {
    const root = await mkdtemp(join(tmpdir(), "stackglance-commands-"));
    const context: CliContext = {
      paths: resolvePaths({ env: { STACKGLANCE_HOME: root } }),
      now: () => new Date("2026-08-27T00:00:00Z"),
      cwd: root,
      home: root,
    };
    const database = new StackGlanceDatabase(context.paths.database);
    database.upsertStories([story]);
    database.close();
    const stdout: string[] = [];
    const stderr: string[] = [];
    const io = {
      stdout: { write: (value: string) => stdout.push(value) },
      stderr: { write: (value: string) => stderr.push(value) },
    };
    expect(await showFeed(context, io)).toBe(0);
    expect(await showCatchup(context, io)).toBe(0);
    expect(await explainById("one", context, io)).toBe(0);
    expect(await saveById("one", context, io)).toBe(0);
    expect(stdout.join("")).toContain("Technical details");
    expect(stderr).toEqual([]);
  });
});
