import { spawn } from "node:child_process";

import type { CliContext } from "../cli/context.js";
import type { CliIo } from "../cli/run.js";
import type { AgentEvent, AgentName, AgentState } from "../core/types.js";
import { sendIpcRequest } from "../daemon/ipc.js";
import { extractTaskTags } from "../intelligence/task-tags.js";
import { claudeHookToEvent } from "./claude.js";
import { codexHookToEvent } from "./codex.js";
import { geminiHookToEvent } from "./gemini.js";
import { openCodeEventToAgentEvent } from "./opencode.js";

export interface HookDeliveryDependencies {
  send?: typeof sendIpcRequest;
  start?: () => void;
}

export async function runHookCommand(
  agent: AgentName,
  eventName: string | undefined,
  context: CliContext,
  io: CliIo,
): Promise<number> {
  try {
    const payload = await readHookInput();
    payload.hook_event_name ??= eventName;
    const event = translate(agent, payload, context.now());
    if (event.task !== undefined) event.task = extractTaskTags(event.task).redacted;
    await deliverHookEvent(event, context.paths.socket);
  } catch {
    // Hooks are advisory. DevRadar never blocks the coding agent.
  }
  if (agent === "gemini") io.stdout.write("{}\n");
  return 0;
}

export async function deliverHookEvent(
  event: AgentEvent,
  socketPath: string,
  dependencies: HookDeliveryDependencies = {},
): Promise<boolean> {
  const send = dependencies.send ?? sendIpcRequest;
  try {
    await send(socketPath, { type: "event", event }, 400);
    return true;
  } catch {
    (dependencies.start ?? startDetachedDaemon)();
  }
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 75));
    try {
      await send(socketPath, { type: "event", event }, 400);
      return true;
    } catch {
      // Retry briefly while the local daemon starts.
    }
  }
  return false;
}

function translate(
  agent: AgentName,
  payload: Readonly<Record<string, unknown>>,
  now: Date,
): AgentEvent {
  if (agent === "codex") return codexHookToEvent(payload, now);
  if (agent === "claude") return claudeHookToEvent(payload, now);
  if (agent === "gemini") return geminiHookToEvent(payload, now);
  if (agent === "opencode") return openCodeEventToAgentEvent(payload, now);
  const rawState = payload.hook_event_name;
  const state: AgentState =
    typeof rawState === "string" && rawState === "waiting_for_user"
      ? "waiting_for_user"
      : "agent_thinking";
  return {
    agent: "aider",
    state,
    session: typeof payload.session_id === "string" ? payload.session_id : `aider-${process.ppid}`,
    occurredAt: now.toISOString(),
    ...(typeof payload.cwd === "string" ? { cwd: payload.cwd } : { cwd: process.cwd() }),
  };
}

async function readHookInput(): Promise<Record<string, unknown>> {
  if (process.stdin.isTTY) return {};
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    if (chunks.reduce((total, value) => total + value.length, 0) > 64 * 1024)
      throw new Error("Hook input too large");
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text === "" ? {} : (JSON.parse(text) as Record<string, unknown>);
}

function startDetachedDaemon(): void {
  const entry = process.argv[1];
  if (entry === undefined) return;
  const child = spawn(process.execPath, [entry, "daemon"], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}
