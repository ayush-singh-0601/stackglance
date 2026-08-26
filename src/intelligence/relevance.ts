import type { RadarScope, RepositoryContext, StoryCandidate } from "../core/types.js";

export interface RelevanceScore {
  score: number;
  scope: RadarScope;
  taskMatches: readonly string[];
  projectMatches: readonly string[];
  recency: number;
}

export function scoreRelevance(
  story: StoryCandidate,
  repository: RepositoryContext,
  taskTags: readonly string[],
  now = new Date(),
): RelevanceScore {
  const storyTags = new Set(story.tags.map(normalize));
  const taskMatches = [...new Set(taskTags.map(normalize).filter((tag) => storyTags.has(tag)))];
  const projectMatches = [...new Set(repository.technologies.map(normalize).filter((tag) => storyTags.has(tag)))];
  const taskCoverage = taskTags.length === 0 ? 0 : taskMatches.length / Math.min(taskTags.length, 5);
  const projectCoverage =
    repository.technologies.length === 0 ? 0 : projectMatches.length / Math.min(repository.technologies.length, 8);
  const ageDays = Math.max(0, now.getTime() - Date.parse(story.publishedAt)) / 86_400_000;
  const recency = Math.max(0, 1 - ageDays / 30);
  const securityBoost = story.category === "security" && projectMatches.length > 0 ? 0.1 : 0;
  const score = clamp(0.15 + taskCoverage * 0.5 + projectCoverage * 0.25 + recency * 0.1 + securityBoost);
  const scope: RadarScope = taskMatches.length > 0 ? "task" : projectMatches.length > 0 ? "project" : "global";
  return { score, scope, taskMatches, projectMatches, recency };
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/^@/, "").replace(/\.js$/u, "").replace(/[^a-z0-9+#.-]/gu, "");
}

function clamp(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
}
