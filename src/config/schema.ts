import { z } from "zod";

import { AGENTS } from "../core/types.js";

const agentFlags = Object.fromEntries(AGENTS.map((agent) => [agent, z.boolean()])) as Record<
  (typeof AGENTS)[number],
  z.ZodBoolean
>;

export const configSchema = z.object({
  version: z.literal(1),
  enabled: z.boolean(),
  pausedUntil: z.iso.datetime().nullable(),
  agents: z.object(agentFlags),
  feed: z
    .object({
      task: z.number().int().min(0).max(100),
      project: z.number().int().min(0).max(100),
      global: z.number().int().min(0).max(100),
    })
    .refine((weights) => weights.task + weights.project + weights.global === 100, {
      message: "feed weights must total 100",
    }),
  display: z.object({
    thinkingDelayMs: z.number().int().min(2_000).max(4_000),
    cardDurationMs: z.number().int().min(2_000).max(30_000),
    quietDurationMs: z.number().int().min(2_000).max(120_000),
  }),
  summarizer: z.object({
    provider: z.enum(["deterministic", "openai", "ollama"]),
    model: z.string().min(1),
    endpoint: z.url().optional(),
  }),
});

export type DevRadarConfig = z.infer<typeof configSchema>;

export const DEFAULT_CONFIG: DevRadarConfig = {
  version: 1,
  enabled: false,
  pausedUntil: null,
  agents: { codex: true, claude: true, gemini: true, opencode: true, aider: true },
  feed: { task: 45, project: 30, global: 25 },
  display: { thinkingDelayMs: 3_000, cardDurationMs: 8_000, quietDurationMs: 12_000 },
  summarizer: { provider: "deterministic", model: "deterministic-v1" },
};
