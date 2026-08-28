import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { AgentEvent, AgentState } from "../core/types.js";

const PLUGIN = `export const StackGlancePlugin = async ({ directory }) => ({
  event: async ({ event }) => {
    try {
      const session = event?.properties?.sessionID ?? event?.properties?.info?.id ?? "opencode-session"
      const child = Bun.spawn(
        ["stackglance", "hook", "opencode", String(event?.type ?? "session.status")],
        {
          cwd: directory,
          stdin: JSON.stringify({
            hook_event_name: event?.type,
            session_id: session,
            cwd: directory,
            status: event?.properties?.status?.type,
          }),
          stdout: "ignore",
          stderr: "ignore",
        },
      )
      await child.exited
    } catch {
      // StackGlance is fail-open and never interrupts OpenCode.
    }
  },
})
`;

export async function installOpenCodePlugin(home: string): Promise<string> {
  const directory = join(home, ".config", "opencode", "plugins");
  const path = join(directory, "stackglance.js");
  await mkdir(directory, { recursive: true });
  await writeFile(path, PLUGIN, { encoding: "utf8", mode: 0o600 });
  return path;
}

export function openCodeEventToAgentEvent(
  payload: Readonly<Record<string, unknown>>,
  now = new Date(),
): AgentEvent {
  const type =
    typeof payload.hook_event_name === "string" ? payload.hook_event_name : "session.status";
  return {
    agent: "opencode",
    state: openCodeState(type, payload.status),
    session: typeof payload.session_id === "string" ? payload.session_id : "opencode-session",
    occurredAt: now.toISOString(),
    ...(typeof payload.cwd === "string" ? { cwd: payload.cwd } : {}),
  };
}

function openCodeState(type: string, status: unknown): AgentState {
  if (type === "session.created") return "idle";
  if (type === "session.error") return "error";
  if (type === "session.deleted") return "finished";
  if (type === "session.idle" || type === "permission.asked") return "waiting_for_user";
  if (type === "command.executed" || type === "file.edited") return "agent_thinking";
  if (type === "session.status" && status === "busy") return "agent_thinking";
  if (type === "session.status" && status === "idle") return "waiting_for_user";
  return "agent_generating";
}
