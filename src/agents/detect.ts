import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";

import { AGENTS, type AgentName } from "../core/types.js";

export interface DetectedAgent {
  agent: AgentName;
  command: string;
  installed: boolean;
  executable?: string;
}

const COMMANDS: Readonly<Record<AgentName, string>> = {
  codex: "codex",
  claude: "claude",
  gemini: "gemini",
  opencode: "opencode",
  aider: "aider",
};

export interface DetectionOptions {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  canExecute?: (path: string) => boolean;
}

function defaultCanExecute(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function findExecutable(
  command: string,
  options: DetectionOptions = {},
): string | undefined {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const canExecute = options.canExecute ?? defaultCanExecute;
  const paths = (env.PATH ?? "").split(delimiter).filter(Boolean);
  const extensions =
    platform === "win32"
      ? (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").map((value) => value.toLowerCase())
      : [""];

  for (const directory of paths) {
    for (const extension of extensions) {
      const candidate = join(directory, platform === "win32" ? `${command}${extension}` : command);
      if (canExecute(candidate)) return candidate;
    }
  }
  return undefined;
}

export function detectAgents(options: DetectionOptions = {}): DetectedAgent[] {
  return AGENTS.map((agent) => {
    const command = COMMANDS[agent];
    const executable = findExecutable(command, options);
    return {
      agent,
      command,
      installed: executable !== undefined,
      ...(executable === undefined ? {} : { executable }),
    };
  });
}
