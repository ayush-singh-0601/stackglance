import { describe, expect, it } from "vitest";

import { AGENTS, AGENT_STATES, GLANCE_SCOPES } from "../src/core/types.js";

describe("domain contracts", () => {
  it("enumerates the supported agents and passive states", () => {
    expect(AGENTS).toEqual(["codex", "claude", "gemini", "opencode", "aider"]);
    expect(AGENT_STATES).toContain("waiting_for_user");
    expect(GLANCE_SCOPES).toEqual(["task", "project", "global"]);
  });
});
