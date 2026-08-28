import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { AgentEvent, AgentState } from "../core/types.js";

const CLAUDE_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "Stop",
  "SessionEnd",
] as const;
type ClaudeEventName = (typeof CLAUDE_EVENTS)[number];

interface ClaudeSettings {
  hooks?: Record<string, unknown[]>;
  [key: string]: unknown;
}

export async function installClaudeHooks(home: string): Promise<string> {
  const path = join(home, ".claude", "settings.json");
  const settings = await readSettings(path);
  settings.hooks ??= {};
  for (const event of CLAUDE_EVENTS) {
    const groups = settings.hooks[event] ?? [];
    if (!groups.some(isStackGlanceGroup)) {
      groups.push({
        matcher: "",
        hooks: [
          { type: "command", command: `stackglance hook claude ${event}`, timeout: 2, async: true },
        ],
      });
    }
    settings.hooks[event] = groups;
  }
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(settings, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, path);
  return path;
}

export function claudeHookToEvent(
  payload: Readonly<Record<string, unknown>>,
  now = new Date(),
): AgentEvent {
  const rawEvent = payload.hook_event_name;
  const eventName =
    typeof rawEvent === "string" && CLAUDE_EVENTS.includes(rawEvent as ClaudeEventName)
      ? (rawEvent as ClaudeEventName)
      : "SessionStart";
  const task =
    eventName === "UserPromptSubmit" && typeof payload.prompt === "string"
      ? payload.prompt
      : undefined;
  return {
    agent: "claude",
    state: stateFor(eventName, payload),
    session: typeof payload.session_id === "string" ? payload.session_id : "claude-session",
    occurredAt: now.toISOString(),
    ...(typeof payload.cwd === "string" ? { cwd: payload.cwd } : {}),
    ...(task === undefined ? {} : { task }),
  };
}

function stateFor(event: ClaudeEventName, payload: Readonly<Record<string, unknown>>): AgentState {
  if (event === "UserPromptSubmit" || event === "PostToolUse") return "agent_thinking";
  if (event === "PreToolUse") {
    const tool = typeof payload.tool_name === "string" ? payload.tool_name.toLowerCase() : "";
    const input = JSON.stringify(payload.tool_input ?? "").toLowerCase();
    if (/\b(test|vitest|jest|pytest|cargo test)\b/u.test(input)) return "running_tests";
    if (/\b(build|compile|tsc|cargo build)\b/u.test(input)) return "building";
    if (/\b(install|npm ci|npm install|pip install)\b/u.test(input)) return "installing";
    return tool === "askuserquestion" ? "waiting_for_user" : "running_command";
  }
  if (event === "Stop") return "waiting_for_user";
  if (event === "SessionEnd") return "finished";
  return "idle";
}

function isStackGlanceGroup(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const hooks = (value as { hooks?: unknown }).hooks;
  return (
    Array.isArray(hooks) &&
    hooks.some(
      (hook) =>
        typeof hook === "object" &&
        hook !== null &&
        String((hook as { command?: unknown }).command).includes("stackglance hook claude"),
    )
  );
}

async function readSettings(path: string): Promise<ClaudeSettings> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as ClaudeSettings;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}
