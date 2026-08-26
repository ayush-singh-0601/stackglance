import { detectAgents, type DetectedAgent } from "../../agents/detect.js";
import { DEFAULT_CONFIG } from "../../config/schema.js";
import { saveConfig } from "../../config/store.js";
import type { DevRadarPaths } from "../../core/paths.js";
import { DevRadarDatabase } from "../../storage/database.js";
import { installShellShims } from "../../integrations/shims.js";
import type { CliIo } from "../run.js";

export interface InitDependencies {
  detect?: () => DetectedAgent[];
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

  io.stdout.write("DevRadar Setup\n\nDetected:\n");
  for (const { agent, installed } of agents) {
    io.stdout.write(`${installed ? "✓" : "·"} ${agent}${installed ? "" : " (not found)"}\n`);
  }
  io.stdout.write(`\nNews sources configured.\nProject intelligence enabled.\nShell integrations: ${paths.bin}\nPassive intelligence: ON\n`);
  return 0;
}
