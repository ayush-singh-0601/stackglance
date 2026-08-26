import { appendFile, chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { delimiter, join, resolve } from "node:path";

import { AGENTS, type AgentName } from "../core/types.js";
import type { DevRadarPaths } from "../core/paths.js";

export interface InstalledShim {
  agent: AgentName;
  unix: string;
  windows: string;
}

const ACTIVATION_MARKER = "# >>> devradar >>>";

export interface ShellActivationOptions {
  home: string;
  platform?: NodeJS.Platform;
}

export async function installShellShims(
  paths: DevRadarPaths,
  agents: readonly AgentName[] = AGENTS,
): Promise<InstalledShim[]> {
  await mkdir(paths.bin, { recursive: true, mode: 0o700 });
  const installed: InstalledShim[] = [];
  for (const agent of agents) {
    const unix = join(paths.bin, agent);
    const windows = join(paths.bin, `${agent}.cmd`);
    await writeFile(unix, `#!/bin/sh\nexec devradar agent ${agent} "$@"\n`, {
      encoding: "utf8",
      mode: 0o755,
    });
    await chmod(unix, 0o755);
    await writeFile(windows, `@echo off\r\ndevradar agent ${agent} %*\r\n`, "utf8");
    installed.push({ agent, unix, windows });
  }
  return installed;
}

export function pathWithShims(currentPath: string | undefined, shimDirectory: string): string {
  const entries = (currentPath ?? "").split(delimiter).filter(Boolean);
  const target = resolve(shimDirectory).toLowerCase();
  return [
    shimDirectory,
    ...entries.filter((entry) => resolve(entry).toLowerCase() !== target),
  ].join(delimiter);
}

export function pathWithoutShims(currentPath: string | undefined, shimDirectory: string): string {
  const target = resolve(shimDirectory).toLowerCase();
  return (currentPath ?? "")
    .split(delimiter)
    .filter((entry) => entry !== "" && resolve(entry).toLowerCase() !== target)
    .join(delimiter);
}

export async function installShellActivation(
  paths: DevRadarPaths,
  options: ShellActivationOptions,
): Promise<string[]> {
  const platform = options.platform ?? process.platform;
  const targets =
    platform === "win32"
      ? [
          join(options.home, "Documents", "PowerShell", "Microsoft.PowerShell_profile.ps1"),
          join(options.home, "Documents", "WindowsPowerShell", "Microsoft.PowerShell_profile.ps1"),
        ]
      : [
          join(options.home, ".profile"),
          join(options.home, ".bashrc"),
          join(options.home, ".zshrc"),
        ];
  const block = platform === "win32" ? windowsActivation(paths.bin) : posixActivation(paths.bin);
  for (const target of targets) await appendActivation(target, block);
  return targets;
}

async function appendActivation(path: string, block: string): Promise<void> {
  let existing = "";
  try {
    existing = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (existing.includes(ACTIVATION_MARKER)) return;
  await mkdir(resolve(path, ".."), { recursive: true });
  const prefix = existing === "" || existing.endsWith("\n") ? "" : "\n";
  await appendFile(path, `${prefix}${block}`, { encoding: "utf8", mode: 0o600 });
}

function posixActivation(bin: string): string {
  const escaped = bin.replaceAll("'", `'\\''`);
  return `${ACTIVATION_MARKER}\nexport PATH='${escaped}':"$PATH"\n# <<< devradar <<<\n`;
}

function windowsActivation(bin: string): string {
  const escaped = bin.replaceAll("'", "''");
  return `${ACTIVATION_MARKER}\nif (($env:PATH -split ';') -notcontains '${escaped}') { $env:PATH = '${escaped};' + $env:PATH }\n# <<< devradar <<<\n`;
}
