import { describe, expect, it } from "vitest";

import type { AgentEvent } from "../src/core/types.js";
import { AgentSessionMachine } from "../src/runtime/state-machine.js";

function event(state: AgentEvent["state"], occurredAt: string): AgentEvent {
  return { agent: "codex", session: "abc", state, occurredAt };
}

describe("AgentSessionMachine", () => {
  it("tracks ordered transitions and state entry time", () => {
    const machine = new AgentSessionMachine();
    machine.transition(event("agent_thinking", "2026-08-26T00:00:00.000Z"));
    const refreshed = machine.transition(event("agent_thinking", "2026-08-26T00:00:01.000Z"));
    expect(refreshed.snapshot.stateEnteredAt).toBe("2026-08-26T00:00:00.000Z");
    const waiting = machine.transition(event("waiting_for_user", "2026-08-26T00:00:02.000Z"));
    expect(waiting.snapshot).toMatchObject({ previousState: "agent_thinking", revision: 3 });
  });

  it("rejects stale events", () => {
    const machine = new AgentSessionMachine();
    machine.transition(event("running_tests", "2026-08-26T00:00:02.000Z"));
    expect(machine.transition(event("agent_thinking", "2026-08-26T00:00:01.000Z"))).toMatchObject({
      accepted: false,
      reason: "stale event",
    });
    expect(machine.get("codex", "abc")?.event.state).toBe("running_tests");
  });
});
