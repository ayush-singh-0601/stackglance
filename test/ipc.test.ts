import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { sendIpcRequest, startIpcServer } from "../src/daemon/ipc.js";

describe("daemon IPC", () => {
  it("validates and exchanges one agent event", async () => {
    const token = crypto.randomUUID();
    const socket =
      process.platform === "win32"
        ? `\\\\.\\pipe\\stackglance-${token}`
        : join("/tmp", `stackglance-${token}.sock`);
    const server = await startIpcServer(socket, (request) => ({
      ok: true,
      decision: { show: request.event.state === "agent_thinking", reason: "test" },
    }));
    const response = await sendIpcRequest(socket, {
      type: "event",
      event: {
        agent: "codex",
        state: "agent_thinking",
        session: "one",
        occurredAt: "2026-08-26T00:00:00.000Z",
      },
    });
    expect(response).toMatchObject({ ok: true, decision: { show: true } });
    await server.close();
  });
});
