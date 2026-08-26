import { loadConfig } from "../config/store.js";
import type { DevRadarPaths } from "../core/paths.js";
import type { RepositoryContext, Story } from "../core/types.js";
import { ArxivCollector } from "../feeds/arxiv.js";
import { GitHubReleaseCollector } from "../feeds/github.js";
import { OsvCollector } from "../feeds/osv.js";
import { RssAtomCollector } from "../feeds/rss.js";
import type { FeedCollector } from "../feeds/types.js";
import { DevRadarDatabase } from "../storage/database.js";
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
  database: DevRadarDatabase;
  now?: Date;
}

export async function collectAndStore(input: CollectionInput): Promise<RefreshReport> {
  const now = input.now ?? new Date();
  const results = await Promise.allSettled(input.collectors.map((collector) => collector.collect(now)));
  const raw = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const errors = results.flatMap((result, index) =>
    result.status === "rejected" ? [`${input.collectors[index]?.name ?? "feed"}: ${safeError(result.reason)}`] : [],
  );
  const ranked: RankedCandidate[] = normalizeStories(raw, now).map((story) => ({
    story,
    relevance: scoreRelevance(story, input.repository, input.taskTags, now),
  }));
  const blended = blendFeed(ranked, input.weights, 40);
  const stories: Story[] = [];
  for (const item of blended) {
    try {
      const content = await input.summarizer.summarize({ story: item.story, repository: input.repository });
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
  paths: DevRadarPaths,
  cwd: string,
  task = "",
  env: NodeJS.ProcessEnv = process.env,
): Promise<RefreshReport> {
  const config = await loadConfig(paths.config);
  const repository = await detectRepository(cwd);
  const taskTags = extractTaskTags(task).tags;
  const collectors: FeedCollector[] = [
    ...config.sources.rss.map((source) => new RssAtomCollector(source)),
    new GitHubReleaseCollector(config.sources.githubRepositories, env.GITHUB_TOKEN),
    new OsvCollector(repository),
    new ArxivCollector([...taskTags, ...repository.technologies]),
  ];
  const database = new DevRadarDatabase(paths.database);
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

function selectSummarizer(
  config: { provider: "deterministic" | "openai" | "ollama"; model: string; endpoint?: string | undefined },
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
  return value instanceof Error ? value.message.replace(/\s+/gu, " ").slice(0, 300) : "collector failed";
}
