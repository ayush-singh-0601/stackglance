import type { StackGlanceConfig } from "../config/schema.js";
import { loadConfig } from "../config/store.js";
import type { StackGlancePaths } from "../core/paths.js";
import type { RepositoryContext, Story } from "../core/types.js";
import { ArxivCollector } from "../feeds/arxiv.js";
import { CodexNewsCollector, type CodexUsage } from "../feeds/codex-news.js";
import { GitHubReleaseCollector } from "../feeds/github.js";
import { OsvCollector } from "../feeds/osv.js";
import { RssAtomCollector } from "../feeds/rss.js";
import type { FeedCollector } from "../feeds/types.js";
import { findExecutable } from "../agents/detect.js";
import { pathWithoutShims } from "../integrations/shims.js";
import { StackGlanceDatabase } from "../storage/database.js";
import { DeterministicSummarizer, providerSecret, type Summarizer } from "../summaries/contract.js";
import { OllamaSummarizer } from "../summaries/ollama.js";
import { OpenAiSummarizer } from "../summaries/openai.js";
import { assembleStory } from "./assemble.js";
import { blendFeed, type RankedCandidate } from "./blend.js";
import { normalizeStories } from "./normalize.js";
import { scoreRelevance } from "./relevance.js";
import { detectRepository } from "./repository.js";
import { extractTaskTags } from "./task-tags.js";

export interface RefreshReport {
  collected: number;
  stored: number;
  errors: readonly string[];
}

export interface CollectionInput {
  collectors: readonly FeedCollector[];
  repository: RepositoryContext;
  taskTags: readonly string[];
  weights: { task: number; project: number; global: number };
  summarizer: Summarizer;
  database: StackGlanceDatabase;
  now?: Date;
}

export async function collectAndStore(input: CollectionInput): Promise<RefreshReport> {
  const now = input.now ?? new Date();
  const results = await Promise.allSettled(
    input.collectors.map((collector) => collector.collect(now)),
  );
  const raw = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const errors = results.flatMap((result, index) =>
    result.status === "rejected"
      ? [`${input.collectors[index]?.name ?? "feed"}: ${safeError(result.reason)}`]
      : [],
  );
  const ranked: RankedCandidate[] = normalizeStories(raw, now).map((story) => ({
    story,
    relevance: scoreRelevance(story, input.repository, input.taskTags, now),
  }));
  const blended = blendFeed(ranked, input.weights, 40);
  const stories: Story[] = [];
  for (const item of blended) {
    try {
      const content = await input.summarizer.summarize({
        story: item.story,
        repository: input.repository,
      });
      stories.push(assembleStory(item.story, item.relevance, content));
    } catch (error) {
      errors.push(`${item.story.source}: ${safeError(error)}`);
    }
  }
  input.database.upsertStories(stories);
  input.database.setMetadata("last_fetch", now.toISOString());
  return { collected: raw.length, stored: stories.length, errors };
}

export async function refreshDefaultIntelligence(
  paths: StackGlancePaths,
  cwd: string,
  task = "",
  env: NodeJS.ProcessEnv = process.env,
): Promise<RefreshReport> {
  const config = await loadConfig(paths.config);
  const repository = await detectRepository(cwd);
  const taskTags = extractTaskTags(task).tags;
  const database = new StackGlanceDatabase(paths.database);
  const codexCollector = createCodexCollector({
    config: config.sources.codexNews,
    database,
    paths,
    repository,
    env,
    now: new Date(),
  });
  const collectors: FeedCollector[] = [
    ...config.sources.rss.map((source) => new RssAtomCollector(source)),
    new GitHubReleaseCollector(config.sources.githubRepositories, env.GITHUB_TOKEN),
    new OsvCollector(repository),
    new ArxivCollector([...taskTags, ...repository.technologies]),
    ...(codexCollector === undefined ? [] : [codexCollector]),
  ];
  try {
    return await collectAndStore({
      collectors,
      repository,
      taskTags,
      weights: config.feed,
      summarizer: selectSummarizer(config.summarizer, env),
      database,
    });
  } finally {
    database.close();
  }
}

interface CodexBudget {
  date: string;
  runs: number;
  tokens: number;
}

interface CodexCollectorInput {
  config: StackGlanceConfig["sources"]["codexNews"];
  database: StackGlanceDatabase;
  paths: StackGlancePaths;
  repository: RepositoryContext;
  env: NodeJS.ProcessEnv;
  now: Date;
}

function createCodexCollector(input: CodexCollectorInput): FeedCollector | undefined {
  if (!input.config.enabled) return undefined;
  const collectorEnvironment = {
    ...input.env,
    PATH: pathWithoutShims(input.env.PATH, input.paths.bin),
    STACKGLANCE_CODEX_COLLECTOR: "1",
  };
  const executable = findExecutable("codex", { env: collectorEnvironment });
  if (executable === undefined) return undefined;

  const budget = readCodexBudget(input.database, input.now);
  if (budget.runs >= input.config.maxRunsPerDay || budget.tokens >= input.config.maxDailyTokens) {
    return undefined;
  }
  writeCodexBudget(input.database, { ...budget, runs: budget.runs + 1 });
  return new CodexNewsCollector({
    executable,
    workDirectory: input.paths.runtime,
    technologies: input.repository.technologies,
    maxStories: input.config.maxStories,
    maxAgeHours: input.config.maxAgeHours,
    env: collectorEnvironment,
    onUsage: (usage) => recordCodexUsage(input.database, input.now, usage),
  });
}

function readCodexBudget(database: StackGlanceDatabase, now: Date): CodexBudget {
  const date = now.toISOString().slice(0, 10);
  try {
    const stored = JSON.parse(
      database.getMetadata("codex_news_budget") ?? "{}",
    ) as Partial<CodexBudget>;
    if (stored.date === date) {
      return {
        date,
        runs: safeCount(stored.runs),
        tokens: safeCount(stored.tokens),
      };
    }
  } catch {
    // A malformed advisory counter is safe to replace.
  }
  return { date, runs: 0, tokens: 0 };
}

function recordCodexUsage(database: StackGlanceDatabase, now: Date, usage: CodexUsage): void {
  const budget = readCodexBudget(database, now);
  const total = usage.inputTokens + usage.outputTokens + usage.reasoningOutputTokens;
  writeCodexBudget(database, { ...budget, tokens: budget.tokens + total });
}

function writeCodexBudget(database: StackGlanceDatabase, budget: CodexBudget): void {
  database.setMetadata("codex_news_budget", JSON.stringify(budget));
}

function safeCount(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function selectSummarizer(
  config: {
    provider: "deterministic" | "openai" | "ollama";
    model: string;
    endpoint?: string | undefined;
  },
  env: NodeJS.ProcessEnv,
): Summarizer {
  if (config.provider === "openai") {
    const apiKey = providerSecret("openai", env);
    if (apiKey !== undefined) return new OpenAiSummarizer({ apiKey, model: config.model });
  }
  if (config.provider === "ollama" && config.endpoint !== undefined) {
    return new OllamaSummarizer({ endpoint: config.endpoint, model: config.model });
  }
  return new DeterministicSummarizer();
}

function safeError(value: unknown): string {
  return value instanceof Error
    ? value.message.replace(/\s+/gu, " ").slice(0, 300)
    : "collector failed";
}
