import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { AgentEvent, AgentState } from "../core/types.js";

const GEMINI_EVENTS = [
  "SessionStart",
  "BeforeAgent",
  "BeforeTool",
  "AfterTool",
  "AfterAgent",
  "SessionEnd",
] as const;
type GeminiEventName = (typeof GEMINI_EVENTS)[number];

interface GeminiSettings {
  hooks?: Record<string, unknown[]>;
  [key: string]: unknown;
}

export async function installGeminiHooks(home: string): Promise<string> {
  const path = join(home, ".gemini", "settings.json");
  const settings = await readSettings(path);
  settings.hooks ??= {};
  for (const event of GEMINI_EVENTS) {
    const groups = settings.hooks[event] ?? [];
    if (!groups.some(isStackGlanceGroup)) {
      groups.push({
        matcher: "*",
        sequential: false,
        hooks: [
          {
            name: `stackglance-${event.toLowerCase()}`,
            type: "command",
            command: `stackglance hook gemini ${event}`,
            timeout: 2_000,
            description: "Send non-blocking agent state to local StackGlance",
          },
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

export function geminiHookToEvent(
  payload: Readonly<Record<string, unknown>>,
  now = new Date(),
): AgentEvent {
  const rawEvent = payload.hook_event_name;
  const eventName =
    typeof rawEvent === "string" && GEMINI_EVENTS.includes(rawEvent as GeminiEventName)
      ? (rawEvent as GeminiEventName)
      : "SessionStart";
  const task =
    eventName === "BeforeAgent" && typeof payload.prompt === "string" ? payload.prompt : undefined;
  return {
    agent: "gemini",
    state: stateFor(eventName, payload),
    session: typeof payload.session_id === "string" ? payload.session_id : "gemini-session",
    occurredAt:
      typeof payload.timestamp === "string"
        ? new Date(payload.timestamp).toISOString()
        : now.toISOString(),
    ...(typeof payload.cwd === "string" ? { cwd: payload.cwd } : {}),
    ...(task === undefined ? {} : { task }),
  };
}

function stateFor(event: GeminiEventName, payload: Readonly<Record<string, unknown>>): AgentState {
  if (event === "BeforeAgent" || event === "AfterTool") return "agent_thinking";
  if (event === "BeforeTool") {
    const input = JSON.stringify(payload.tool_input ?? "").toLowerCase();
    if (/\b(test|vitest|jest|pytest|cargo test)\b/u.test(input)) return "running_tests";
    if (/\b(build|compile|tsc|cargo build)\b/u.test(input)) return "building";
    if (/\b(install|npm ci|npm install|pip install)\b/u.test(input)) return "installing";
    return "running_command";
  }
  if (event === "AfterAgent") return "waiting_for_user";
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
        String((hook as { command?: unknown }).command).includes("stackglance hook gemini"),
    )
  );
}

async function readSettings(path: string): Promise<GeminiSettings> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as GeminiSettings;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}
