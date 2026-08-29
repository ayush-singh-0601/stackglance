import { z } from "zod";

import { AGENTS } from "../core/types.js";

export const DEFAULT_CODEX_NEWS_CONFIG = {
  enabled: false,
  maxStories: 6,
  maxAgeHours: 72,
  maxRunsPerDay: 4,
  maxDailyTokens: 40_000,
} as const;

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
  sources: z.object({
    refreshMinutes: z.number().int().min(5).max(1_440),
    rss: z.array(
      z.object({
        name: z.string().min(1),
        url: z.url(),
        allowedHosts: z.array(z.string().min(1)).min(1),
      }),
    ),
    githubRepositories: z.array(z.string().regex(/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/iu)).max(50),
    codexNews: z
      .object({
        enabled: z.boolean(),
        maxStories: z.number().int().min(1).max(10),
        maxAgeHours: z.number().int().min(12).max(168),
        maxRunsPerDay: z.number().int().min(1).max(24),
        maxDailyTokens: z.number().int().min(1_000).max(1_000_000),
      })
      .default(DEFAULT_CODEX_NEWS_CONFIG),
  }),
});

export type StackGlanceConfig = z.infer<typeof configSchema>;

export const DEFAULT_CONFIG: StackGlanceConfig = {
  version: 1,
  enabled: false,
  pausedUntil: null,
  agents: { codex: true, claude: true, gemini: true, opencode: true, aider: true },
  feed: { task: 45, project: 30, global: 25 },
  display: { thinkingDelayMs: 3_000, cardDurationMs: 8_000, quietDurationMs: 5_000 },
  summarizer: { provider: "deterministic", model: "deterministic-v1" },
  sources: {
    refreshMinutes: 30,
    rss: [
      {
        name: "GitHub Changelog",
        url: "https://github.blog/changelog/feed/",
        allowedHosts: ["github.blog"],
      },
      {
        name: "Node.js Blog",
        url: "https://nodejs.org/en/feed/blog.xml",
        allowedHosts: ["nodejs.org"],
      },
    ],
    githubRepositories: [
      "microsoft/typescript",
      "vercel/next.js",
      "prisma/prisma",
      "microsoft/playwright",
    ],
    codexNews: DEFAULT_CODEX_NEWS_CONFIG,
  },
};
