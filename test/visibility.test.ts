import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "../src/config/schema.js";
import { evaluateVisibility } from "../src/runtime/visibility.js";

const enabled = { ...DEFAULT_CONFIG, enabled: true };

describe("card visibility", () => {
  it("waits three seconds before showing during thinking", () => {
    const event = {
      agent: "codex" as const,
      session: "one",
      state: "agent_thinking" as const,
      occurredAt: "2026-08-26T00:00:00.000Z",
    };
    expect(
      evaluateVisibility({ config: enabled, event, stateEnteredAt: event.occurredAt, now: new Date("2026-08-26T00:00:02.999Z") }),
    ).toMatchObject({ show: false });
    expect(
      evaluateVisibility({ config: enabled, event, stateEnteredAt: event.occurredAt, now: new Date("2026-08-26T00:00:03.000Z") }),
    ).toMatchObject({ show: true, mode: "full" });
  });

  it("immediately hides when developer attention is required", () => {
    const event = {
      agent: "codex" as const,
      session: "one",
      state: "waiting_for_user" as const,
      occurredAt: "2026-08-26T00:00:10.000Z",
    };
    expect(
      evaluateVisibility({ config: enabled, event, stateEnteredAt: event.occurredAt, now: new Date("2026-08-26T00:01:00.000Z") }),
    ).toMatchObject({ show: false, mode: "hidden" });
  });

  it("honors global, agent, and quiet-mode preferences", () => {
    const event = {
      agent: "gemini" as const,
      session: "one",
      state: "running_tests" as const,
      occurredAt: "2026-08-26T00:00:00.000Z",
    };
    const config = {
      ...enabled,
      agents: { ...enabled.agents, gemini: false },
      pausedUntil: "2026-08-27T00:00:00.000Z",
    };
    expect(
      evaluateVisibility({ config, event, stateEnteredAt: event.occurredAt, now: new Date("2026-08-26T01:00:00.000Z") }),
    ).toMatchObject({ show: false });
  });
});
