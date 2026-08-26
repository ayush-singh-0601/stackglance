import { detectAgents } from "../../agents/detect.js";
import { loadConfig, updateConfig } from "../../config/store.js";
import type { AgentName } from "../../core/types.js";
import type { CliContext } from "../context.js";
import type { CliIo } from "../run.js";

export async function setGlobalEnabled(enabled: boolean, context: CliContext, io: CliIo): Promise<number> {
  await updateConfig(context.paths.config, (config) => ({ ...config, enabled }));
  io.stdout.write(`DevRadar passive intelligence ${enabled ? "enabled" : "disabled"}.\n`);
  return 0;
}

export async function showStatus(context: CliContext, io: CliIo): Promise<number> {
  const config = await loadConfig(context.paths.config);
  const detected = new Map(detectAgents().map((item) => [item.agent, item.installed]));
  io.stdout.write(`DevRadar\n\nStatus: ${config.enabled ? "ENABLED" : "DISABLED"}\n\nIntegrations:\n`);
  for (const [agent, enabled] of Object.entries(config.agents) as [AgentName, boolean][]) {
    io.stdout.write(`${enabled && detected.get(agent) ? "✓" : "·"} ${agent}: ${enabled ? "ON" : "OFF"}\n`);
  }
  io.stdout.write(`\nPassive intelligence: ${config.enabled ? "ON" : "OFF"}\n`);
  return 0;
}
