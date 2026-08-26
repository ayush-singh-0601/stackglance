import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { claudeHookToEvent, installClaudeHooks } from "../src/integrations/claude.js";

describe("Claude Code native hooks", () => {
  it("merges user settings and installs idempotent lifecycle hooks", async () => {
    const home = await mkdtemp(join(tmpdir(), "devradar-claude-"));
    await mkdir(join(home, ".claude"));
    await writeFile(
      join(home, ".claude", "settings.json"),
      JSON.stringify({ permissions: { allow: ["Read"] } }),
    );
    const path = await installClaudeHooks(home);
    await installClaudeHooks(home);
    const settings = JSON.parse(await readFile(path, "utf8")) as {
      permissions: unknown;
      hooks: Record<string, unknown[]>;
    };
    expect(settings.permissions).toBeDefined();
    expect(settings.hooks.UserPromptSubmit).toHaveLength(1);
  });

  it("maps Claude lifecycle input without reading transcripts", () => {
    const now = new Date("2026-08-26T00:00:00Z");
    expect(
      claudeHookToEvent(
        { hook_event_name: "PreToolUse", tool_input: { command: "cargo build" } },
        now,
      ).state,
    ).toBe("building");
    expect(
      claudeHookToEvent({ hook_event_name: "Stop", transcript_path: "private.jsonl" }, now),
    ).not.toHaveProperty("transcript_path");
  });
});
