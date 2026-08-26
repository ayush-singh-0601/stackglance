import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../src/config/schema.js";
import { saveConfig } from "../src/config/store.js";
import type { Story } from "../src/core/types.js";
import { resolvePaths } from "../src/core/paths.js";
import { createRadarHandler } from "../src/runtime/engine.js";
import { DevRadarDatabase } from "../src/storage/database.js";

const story: Story = {
  id: "one",
  source: "news",
  sourceId: "one",
  url: "https://example.com",
  headline: "Useful task intelligence arrives for developers",
  summary: "A release improves coding workflows and repository analysis during longer tasks. Existing interfaces remain stable while the implementation becomes faster and more predictable.",
  whyItMatters: "Developers can apply the improvement to current work without a disruptive migration.",
  category: "ai",
  scope: "task",
  publishedAt: "2026-08-26T00:00:00Z",
  expiresAt: "2026-09-26T00:00:00Z",
  relevance: 0.9,
  tags: [],
};

describe("daemon decision engine", () => {
  it("returns a cached story only after the attention threshold", async () => {
    const root = await mkdtemp(join(tmpdir(), "devradar-engine-"));
    const paths = resolvePaths({ env: { DEVRADAR_HOME: root } });
    await saveConfig(paths.config, { ...DEFAULT_CONFIG, enabled: true });
    const database = new DevRadarDatabase(paths.database);
    database.upsertStories([story]);
    database.close();
    const now = new Date("2026-08-26T00:00:03.000Z");
    const handler = createRadarHandler(paths, () => now);
    const response = await handler({
      type: "event",
      event: { agent: "codex", state: "agent_thinking", session: "one", occurredAt: "2026-08-26T00:00:00.000Z" },
    });
    expect(response).toMatchObject({ ok: true, decision: { show: true, story: { id: "one" } } });
    const hidden = await handler({
      type: "event",
      event: { agent: "codex", state: "waiting_for_user", session: "one", occurredAt: "2026-08-26T00:00:04.000Z" },
    });
    expect(hidden).toMatchObject({ decision: { show: false } });
  });
});
