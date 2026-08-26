import { detectAgents, type DetectedAgent } from "../../agents/detect.js";
import { DEFAULT_CONFIG } from "../../config/schema.js";
import { saveConfig } from "../../config/store.js";
import type { DevRadarPaths } from "../../core/paths.js";
import { DevRadarDatabase } from "../../storage/database.js";
import { installShellActivation, installShellShims } from "../../integrations/shims.js";
import { installCodexHooks } from "../../integrations/codex.js";
import { installClaudeHooks } from "../../integrations/claude.js";
import { installGeminiHooks } from "../../integrations/gemini.js";
import { installOpenCodePlugin } from "../../integrations/opencode.js";
import { installAiderIntegration } from "../../integrations/aider.js";
import { homedir } from "node:os";
import type { CliIo } from "../run.js";

export interface InitDependencies {
  detect?: () => DetectedAgent[];
  home?: string | undefined;
}

export async function initialize(
  paths: DevRadarPaths,
  io: CliIo,
  dependencies: InitDependencies = {},
): Promise<number> {
  const agents = (dependencies.detect ?? detectAgents)();
  await saveConfig(paths.config, { ...structuredClone(DEFAULT_CONFIG), enabled: true });
  new DevRadarDatabase(paths.database).close();
  await installShellShims(
    paths,
    agents.filter(({ installed }) => installed).map(({ agent }) => agent),
  );
  const home = dependencies.home ?? homedir();
  if (agents.some(({ installed }) => installed)) await installShellActivation(paths, { home });
  const installers = {
    codex: installCodexHooks,
    claude: installClaudeHooks,
    gemini: installGeminiHooks,
    opencode: installOpenCodePlugin,
    aider: installAiderIntegration,
  } as const;
  for (const { agent, installed } of agents) {
    if (installed) await installers[agent](home);
  }

  io.stdout.write("DevRadar Setup\n\nDetected:\n");
  for (const { agent, installed } of agents) {
    io.stdout.write(`${installed ? "✓" : "·"} ${agent}${installed ? "" : " (not found)"}\n`);
  }
  io.stdout.write(
    `\nNews sources configured.\nProject intelligence enabled.\nShell integrations: ${paths.bin}\nPassive intelligence: ON\n`,
  );
  return 0;
}
