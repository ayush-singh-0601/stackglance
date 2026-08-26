import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { parse, stringify } from "yaml";

import type { AgentState } from "../core/types.js";

export interface AiderIntegrationResult {
  path: string;
  notificationConfigured: boolean;
}

export async function installAiderIntegration(home: string): Promise<AiderIntegrationResult> {
  const path = join(home, ".aider.conf.yml");
  const configuration = await readConfiguration(path);
  const existingCommand = configuration["notifications-command"] ?? configuration.notifications_command;
  const notificationConfigured =
    existingCommand === undefined || (typeof existingCommand === "string" && existingCommand.includes("devradar hook aider"));
  if (notificationConfigured) {
    configuration.notifications = true;
    configuration["notifications-command"] = "devradar hook aider waiting_for_user";
    delete configuration.notifications_command;
    const temporary = `${path}.${process.pid}.tmp`;
    await writeFile(temporary, stringify(configuration), { encoding: "utf8", mode: 0o600 });
    await rename(temporary, path);
  }
  return { path, notificationConfigured };
}

export function classifyAiderOutput(value: string): AgentState | undefined {
  const text = value.replaceAll(String.fromCodePoint(27), "").toLowerCase();
  if (/\b(waiting|ready|tokens:)\b/u.test(text) || /(^|\n)>\s*$/u.test(text)) return "waiting_for_user";
  if (/\b(test|pytest|jest|vitest|cargo test)\b/u.test(text) && /\b(run|running|command)\b/u.test(text)) return "running_tests";
  if (/\b(build|compile|compiling)\b/u.test(text)) return "building";
  if (/\b(install|installing)\b/u.test(text)) return "installing";
  if (/\b(thinking|reasoning|architect|applying edit|editing)\b/u.test(text)) return "agent_thinking";
  if (/\b(error|exception|traceback)\b/u.test(text)) return "error";
  return undefined;
}

async function readConfiguration(path: string): Promise<Record<string, unknown>> {
  try {
    const value = parse(await readFile(path, "utf8")) as unknown;
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}
