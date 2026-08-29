import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  setAgentEnabled,
  setCodexNewsEnabled,
  setFeedWeights,
  setGlobalEnabled,
  setPaused,
} from "../src/cli/commands/controls.js";
import type { CliContext } from "../src/cli/context.js";
import { loadConfig } from "../src/config/store.js";
import { resolvePaths } from "../src/core/paths.js";

describe("persistent controls", () => {
  it("enables and disables passive intelligence", async () => {
    const root = await mkdtemp(join(tmpdir(), "stackglance-controls-"));
    const context: CliContext = {
      paths: resolvePaths({ env: { STACKGLANCE_HOME: root } }),
      now: () => new Date(),
    };
    const text: string[] = [];
    const io = {
      stdout: { write: (value: string) => text.push(value) },
      stderr: { write: () => undefined },
    };
    await setGlobalEnabled(true, context, io);
    expect((await loadConfig(context.paths.config)).enabled).toBe(true);
    await setGlobalEnabled(false, context, io);
    expect((await loadConfig(context.paths.config)).enabled).toBe(false);
    expect(text.join(" ")).toContain("disabled");
  });

  it("changes one agent without changing the global preference", async () => {
    const root = await mkdtemp(join(tmpdir(), "stackglance-agent-controls-"));
    const context: CliContext = {
      paths: resolvePaths({ env: { STACKGLANCE_HOME: root } }),
      now: () => new Date(),
    };
    const io = { stdout: { write: () => undefined }, stderr: { write: () => undefined } };
    await setAgentEnabled("gemini", false, context, io);
    const config = await loadConfig(context.paths.config);
    expect(config.enabled).toBe(false);
    expect(config.agents).toMatchObject({ gemini: false, codex: true });
  });

  it("persists quiet mode and validated feed weights", async () => {
    const root = await mkdtemp(join(tmpdir(), "stackglance-quiet-controls-"));
    const context: CliContext = {
      paths: resolvePaths({ env: { STACKGLANCE_HOME: root } }),
      now: () => new Date(),
    };
    const io = { stdout: { write: () => undefined }, stderr: { write: () => undefined } };
    const until = new Date("2026-08-26T12:00:00.000Z");
    await setPaused(until, context, io);
    await setFeedWeights({ task: 50, project: 25, global: 25 }, context, io);
    expect(await loadConfig(context.paths.config)).toMatchObject({
      pausedUntil: until.toISOString(),
      feed: { task: 50, project: 25, global: 25 },
    });
    await setPaused(null, context, io);
    expect((await loadConfig(context.paths.config)).pausedUntil).toBeNull();
  });

  it("requires an explicit persistent opt-in for Codex news", async () => {
    const root = await mkdtemp(join(tmpdir(), "stackglance-codex-news-control-"));
    const context: CliContext = {
      paths: resolvePaths({ env: { STACKGLANCE_HOME: root } }),
      now: () => new Date(),
    };
    const messages: string[] = [];
    const io = {
      stdout: { write: (value: string) => messages.push(value) },
      stderr: { write: () => undefined },
    };

    expect((await loadConfig(context.paths.config)).sources.codexNews.enabled).toBe(false);
    await setCodexNewsEnabled(true, context, io);
    expect((await loadConfig(context.paths.config)).sources.codexNews.enabled).toBe(true);
    expect(messages.join("")).toContain("opt-in");
  });
});
