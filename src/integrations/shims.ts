import { chmod, mkdir, writeFile } from "node:fs/promises";
import { delimiter, join, resolve } from "node:path";

import { AGENTS, type AgentName } from "../core/types.js";
import type { DevRadarPaths } from "../core/paths.js";

export interface InstalledShim {
  agent: AgentName;
  unix: string;
  windows: string;
}

export async function installShellShims(paths: DevRadarPaths, agents: readonly AgentName[] = AGENTS): Promise<InstalledShim[]> {
  await mkdir(paths.bin, { recursive: true, mode: 0o700 });
  const installed: InstalledShim[] = [];
  for (const agent of agents) {
    const unix = join(paths.bin, agent);
    const windows = join(paths.bin, `${agent}.cmd`);
    await writeFile(unix, `#!/bin/sh\nexec devradar agent ${agent} "$@"\n`, { encoding: "utf8", mode: 0o755 });
    await chmod(unix, 0o755);
    await writeFile(windows, `@echo off\r\ndevradar agent ${agent} %*\r\n`, "utf8");
    installed.push({ agent, unix, windows });
  }
  return installed;
}

export function pathWithShims(currentPath: string | undefined, shimDirectory: string): string {
  const entries = (currentPath ?? "").split(delimiter).filter(Boolean);
  const target = resolve(shimDirectory).toLowerCase();
  return [shimDirectory, ...entries.filter((entry) => resolve(entry).toLowerCase() !== target)].join(delimiter);
}

export function pathWithoutShims(currentPath: string | undefined, shimDirectory: string): string {
  const target = resolve(shimDirectory).toLowerCase();
  return (currentPath ?? "")
    .split(delimiter)
    .filter((entry) => entry !== "" && resolve(entry).toLowerCase() !== target)
    .join(delimiter);
}
