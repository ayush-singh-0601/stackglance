import { detectAgents } from "../../agents/detect.js";
import { loadConfig, updateConfig } from "../../config/store.js";
import type { AgentName } from "../../core/types.js";
import type { CliContext } from "../context.js";
import type { CliIo } from "../run.js";

export interface FeedWeights {
  task: number;
  project: number;
  global: number;
}

export async function setGlobalEnabled(
  enabled: boolean,
  context: CliContext,
  io: CliIo,
): Promise<number> {
  await updateConfig(context.paths.config, (config) => ({ ...config, enabled }));
  io.stdout.write(`StackGlance passive intelligence ${enabled ? "enabled" : "disabled"}.\n`);
  return 0;
}

export async function setAgentEnabled(
  agent: AgentName,
  enabled: boolean,
  context: CliContext,
  io: CliIo,
): Promise<number> {
  await updateConfig(context.paths.config, (config) => ({
    ...config,
    agents: { ...config.agents, [agent]: enabled },
  }));
  io.stdout.write(`${agent} integration ${enabled ? "enabled" : "disabled"}.\n`);
  return 0;
}

export async function setPaused(
  pausedUntil: Date | null,
  context: CliContext,
  io: CliIo,
): Promise<number> {
  await updateConfig(context.paths.config, (config) => ({
    ...config,
    pausedUntil: pausedUntil?.toISOString() ?? null,
  }));
  io.stdout.write(
    pausedUntil === null
      ? "StackGlance resumed.\n"
      : `StackGlance paused until ${pausedUntil.toISOString()}.\n`,
  );
  return 0;
}

export async function setFeedWeights(
  weights: FeedWeights,
  context: CliContext,
  io: CliIo,
): Promise<number> {
  if (
    weights.task + weights.project + weights.global !== 100 ||
    Object.values(weights).some((value) => value < 0)
  ) {
    io.stderr.write("Feed weights must be non-negative and total 100.\n");
    return 2;
  }
  await updateConfig(context.paths.config, (config) => ({ ...config, feed: weights }));
  io.stdout.write(
    `Feed weights updated: task ${weights.task}, project ${weights.project}, global ${weights.global}.\n`,
  );
  return 0;
}

export async function setCodexNewsEnabled(
  enabled: boolean,
  context: CliContext,
  io: CliIo,
): Promise<number> {
  await updateConfig(context.paths.config, (config) => ({
    ...config,
    sources: {
      ...config.sources,
      codexNews: { ...config.sources.codexNews, enabled },
    },
  }));
  io.stdout.write(
    enabled
      ? "Codex live-news collection enabled (opt-in, bounded usage).\n"
      : "Codex live-news collection disabled.\n",
  );
  return 0;
}

export async function showStatus(context: CliContext, io: CliIo): Promise<number> {
  const config = await loadConfig(context.paths.config);
  const detected = new Map(detectAgents().map((item) => [item.agent, item.installed]));
  io.stdout.write(
    `StackGlance\n\nStatus: ${config.enabled ? "ENABLED" : "DISABLED"}\n\nIntegrations:\n`,
  );
  for (const [agent, enabled] of Object.entries(config.agents) as [AgentName, boolean][]) {
    io.stdout.write(
      `${enabled && detected.get(agent) ? "✓" : "·"} ${agent}: ${enabled ? "ON" : "OFF"}\n`,
    );
  }
  io.stdout.write(
    `\nPassive intelligence: ${config.enabled ? "ON" : "OFF"}\n` +
      `Codex news collection: ${config.sources.codexNews.enabled ? "ON (opt-in, low-token)" : "OFF (optional)"}\n`,
  );
  return 0;
}
