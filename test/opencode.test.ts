import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { installOpenCodePlugin, openCodeEventToAgentEvent } from "../src/integrations/opencode.js";

describe("OpenCode plugin", () => {
  it("installs a global fail-open event plugin", async () => {
    const home = await mkdtemp(join(tmpdir(), "devradar-opencode-"));
    const path = await installOpenCodePlugin(home);
    const source = await readFile(path, "utf8");
    expect(source).toContain("export const DevRadarPlugin");
    expect(source).toContain('Bun.spawn(\n        ["devradar", "hook", "opencode"');
    expect(source).toContain("never interrupts OpenCode");
  });

  it("maps busy, idle, permission, and error events", () => {
    expect(
      openCodeEventToAgentEvent({ hook_event_name: "session.status", status: "busy" }).state,
    ).toBe("agent_thinking");
    expect(openCodeEventToAgentEvent({ hook_event_name: "session.idle" }).state).toBe(
      "waiting_for_user",
    );
    expect(openCodeEventToAgentEvent({ hook_event_name: "permission.asked" }).state).toBe(
      "waiting_for_user",
    );
    expect(openCodeEventToAgentEvent({ hook_event_name: "session.error" }).state).toBe("error");
  });
});
