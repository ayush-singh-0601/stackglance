import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { AgentEvent, AgentState } from "../core/types.js";

const CODEX_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "Stop",
  "SessionEnd",
] as const;

type CodexEventName = (typeof CODEX_EVENTS)[number];

interface HookHandler {
  type: "command";
  command: string;
  commandWindows: string;
  timeout: number;
  async: boolean;
}

type HookGroup = { hooks: HookHandler[] };

interface CodexHooksFile {
  description?: string;
  hooks?: Record<string, unknown[]>;
  [key: string]: unknown;
}

export async function installCodexHooks(home: string): Promise<string> {
  const path = join(home, ".codex", "hooks.json");
  const document = await readHooks(path);
  document.description ??= "User lifecycle hooks, including DevRadar ambient intelligence.";
  document.hooks ??= {};
  for (const event of CODEX_EVENTS) {
    const existing = document.hooks[event] ?? [];
    if (!existing.some(isDevRadarGroup)) existing.push(createGroup(event));
    document.hooks[event] = existing;
  }
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, path);
  return path;
}

export function codexHookToEvent(
  payload: Readonly<Record<string, unknown>>,
  now = new Date(),
): AgentEvent {
  const rawEvent = payload.hook_event_name;
  const eventName =
    typeof rawEvent === "string" && CODEX_EVENTS.includes(rawEvent as CodexEventName)
      ? (rawEvent as CodexEventName)
      : "SessionStart";
  const state = hookState(eventName, payload);
  const task =
    eventName === "UserPromptSubmit" && typeof payload.prompt === "string"
      ? payload.prompt
      : undefined;
  return {
    agent: "codex",
    state,
    session: typeof payload.session_id === "string" ? payload.session_id : "codex-session",
    occurredAt: now.toISOString(),
    ...(typeof payload.cwd === "string" ? { cwd: payload.cwd } : {}),
    ...(task === undefined ? {} : { task }),
  };
}

function hookState(event: CodexEventName, payload: Readonly<Record<string, unknown>>): AgentState {
  if (event === "UserPromptSubmit" || event === "PostToolUse") return "agent_thinking";
  if (event === "PreToolUse") {
    const input = JSON.stringify(payload.tool_input ?? "").toLowerCase();
    if (/\b(test|vitest|jest|pytest|cargo test)\b/u.test(input)) return "running_tests";
    if (/\b(build|compile|tsc|cargo build)\b/u.test(input)) return "building";
    if (/\b(install|npm ci|npm install|pip install)\b/u.test(input)) return "installing";
    return "running_command";
  }
  if (event === "Stop") return "waiting_for_user";
  if (event === "SessionEnd") return "finished";
  return "idle";
}

function createGroup(event: CodexEventName): HookGroup {
  return {
    hooks: [
      {
        type: "command",
        command: `devradar hook codex ${event}`,
        commandWindows: `devradar hook codex ${event}`,
        timeout: event === "SessionEnd" ? 3 : 2,
        async: true,
      },
    ],
  };
}

function isDevRadarGroup(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const hooks = (value as { hooks?: unknown }).hooks;
  return (
    Array.isArray(hooks) &&
    hooks.some(
      (hook) =>
        typeof hook === "object" &&
        hook !== null &&
        String((hook as { command?: unknown }).command).includes("devradar hook codex"),
    )
  );
}

async function readHooks(path: string): Promise<CodexHooksFile> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as CodexHooksFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}
