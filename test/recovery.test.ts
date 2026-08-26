import { describe, expect, it } from "vitest";

import { classifyObservedOutput } from "../src/integrations/agent-command.js";
import { deliverHookEvent } from "../src/integrations/hook-command.js";

const event = {
  agent: "codex" as const,
  state: "agent_thinking" as const,
  session: "one",
  occurredAt: "2026-08-26T00:00:00.000Z",
};

describe("fail-open runtime recovery", () => {
  it("starts the daemon after a failed delivery and retries", async () => {
    let attempts = 0;
    let starts = 0;
    const delivered = await deliverHookEvent(event, "socket", {
      send: () => {
        attempts += 1;
        return attempts < 2 ? Promise.reject(new Error("offline")) : Promise.resolve({ ok: true });
      },
      start: () => (starts += 1),
    });
    expect(delivered).toBe(true);
    expect(starts).toBe(1);
    expect(attempts).toBe(2);
  });

  it("fails open when the daemon remains unavailable", async () => {
    await expect(
      deliverHookEvent(event, "socket", {
        send: () => Promise.reject(new Error("offline")),
        start: () => undefined,
      }),
    ).resolves.toBe(false);
  });

  it("classifies observed agent output conservatively", () => {
    expect(classifyObservedOutput("codex", "Thinking about the repository")).toBe("agent_thinking");
    expect(classifyObservedOutput("gemini", "Would you like me to continue?")).toBe(
      "waiting_for_user",
    );
    expect(classifyObservedOutput("claude", "Running pytest")).toBe("running_tests");
  });
});
