import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { codexHookToEvent, installCodexHooks } from "../src/integrations/codex.js";

describe("Codex native hooks", () => {
  it("merges lifecycle hooks without replacing user hooks", async () => {
    const home = await mkdtemp(join(tmpdir(), "stackglance-codex-"));
    await mkdir(join(home, ".codex"));
    await writeFile(
      join(home, ".codex", "hooks.json"),
      JSON.stringify({
        hooks: { Stop: [{ hooks: [{ type: "command", command: "user-script" }] }] },
      }),
    );
    const path = await installCodexHooks(home);
    const document = JSON.parse(await readFile(path, "utf8")) as {
      hooks: Record<string, unknown[]>;
    };
    expect(document.hooks.Stop).toHaveLength(2);
    expect(document.hooks.SessionStart).toHaveLength(1);
    await installCodexHooks(home);
    const idempotent = JSON.parse(await readFile(path, "utf8")) as {
      hooks: Record<string, unknown[]>;
    };
    expect(idempotent.hooks.Stop).toHaveLength(2);
  });

  it("maps attention and tool events to StackGlance states", () => {
    const now = new Date("2026-08-26T00:00:00Z");
    expect(
      codexHookToEvent(
        { hook_event_name: "UserPromptSubmit", session_id: "one", prompt: "Improve RAG" },
        now,
      ),
    ).toMatchObject({
      state: "agent_thinking",
      task: "Improve RAG",
    });
    expect(
      codexHookToEvent({ hook_event_name: "PreToolUse", tool_input: { command: "npm test" } }, now)
        .state,
    ).toBe("running_tests");
    expect(codexHookToEvent({ hook_event_name: "Stop" }, now).state).toBe("waiting_for_user");
  });

  it("repairs legacy asynchronous SessionEnd hooks", async () => {
    const home = await mkdtemp(join(tmpdir(), "stackglance-codex-session-end-"));
    await mkdir(join(home, ".codex"));
    await writeFile(
      join(home, ".codex", "hooks.json"),
      JSON.stringify({
        hooks: {
          SessionEnd: [
            {
              hooks: [
                {
                  type: "command",
                  command: "stackglance hook codex SessionEnd",
                  commandWindows: "stackglance hook codex SessionEnd",
                  timeout: 3,
                  async: true,
                },
              ],
            },
          ],
        },
      }),
    );

    const path = await installCodexHooks(home);
    const document = JSON.parse(await readFile(path, "utf8")) as {
      hooks: { SessionEnd: Array<{ hooks: Array<{ async: boolean }> }> };
    };
    expect(document.hooks.SessionEnd).toHaveLength(1);
    expect(document.hooks.SessionEnd[0]!.hooks[0]!.async).toBe(false);
  });
});
