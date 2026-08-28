import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { geminiHookToEvent, installGeminiHooks } from "../src/integrations/gemini.js";

describe("Gemini CLI native hooks", () => {
  it("installs idempotent lifecycle hooks in user settings", async () => {
    const home = await mkdtemp(join(tmpdir(), "stackglance-gemini-"));
    const path = await installGeminiHooks(home);
    await installGeminiHooks(home);
    const settings = JSON.parse(await readFile(path, "utf8")) as {
      hooks: Record<string, unknown[]>;
    };
    expect(settings.hooks.BeforeAgent).toHaveLength(1);
    expect(settings.hooks.BeforeTool).toHaveLength(1);
    expect(settings.hooks.AfterAgent).toHaveLength(1);
  });

  it("maps Gemini agent and tool lifecycle events", () => {
    const now = new Date("2026-08-26T00:00:00Z");
    expect(
      geminiHookToEvent({ hook_event_name: "BeforeAgent", prompt: "Improve retrieval" }, now),
    ).toMatchObject({
      state: "agent_thinking",
      task: "Improve retrieval",
    });
    expect(
      geminiHookToEvent({ hook_event_name: "BeforeTool", tool_input: { command: "pytest" } }, now)
        .state,
    ).toBe("running_tests");
    expect(geminiHookToEvent({ hook_event_name: "AfterAgent" }, now).state).toBe(
      "waiting_for_user",
    );
  });
});
