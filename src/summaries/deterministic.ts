import type { RepositoryContext, StoryCandidate } from "../core/types.js";

export interface SummaryResult {
  headline: string;
  summary: string;
  whyItMatters: string;
}

export function deterministicSummary(
  story: StoryCandidate,
  repository?: RepositoryContext,
): SummaryResult {
  const headline = ensureMinimum(
    truncateWords(headlineFor(story), 12),
    "developer update is now available",
    5,
    12,
  );
  const sentences = story.body
    .replace(/\s+/gu, " ")
    .split(/(?<=[.!?])\s+/u)
    .filter(Boolean);
  const summarySource = summaryFor(story, sentences);
  const summary = ensureMinimum(
    truncateWords(summarySource, 45),
    "The source describes a concrete technical change for current software development workflows and existing projects.",
    20,
    45,
  );
  const matchingTechnology = repository?.technologies.find((technology) =>
    story.tags.includes(technology.toLowerCase()),
  );
  const whyItMatters = ensureMinimum(
    truncateWords(whyFor(story, matchingTechnology), 20),
    "Developers can evaluate the change against their current tools and project requirements.",
    8,
    20,
  );
  return { headline, summary, whyItMatters };
}

function headlineFor(story: StoryCandidate): string {
  if (story.category !== "security") return story.title;
  const advisory = metadataValue(story, "advisory");
  const dependency = metadataValue(story, "dependency");
  if (advisory !== undefined && dependency !== undefined) {
    return `${advisory} flags a security issue in ${dependency}`;
  }
  return story.title;
}

function summaryFor(story: StoryCandidate, sentences: readonly string[]): string {
  if (story.category === "security") {
    const advisory = metadataValue(story, "advisory");
    const dependency = metadataValue(story, "dependency");
    if (advisory !== undefined && dependency !== undefined) {
      return `${story.source} published ${advisory} for ${dependency}. Check the affected version range, exposure conditions, and patched releases before deciding whether this repository requires an immediate dependency upgrade.`;
    }
  }
  return sentences.slice(0, 3).join(" ") || `${story.title} was published by ${story.source}.`;
}

function metadataValue(story: StoryCandidate, key: string): string | undefined {
  const value = story.metadata[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function ensureMinimum(value: string, addition: string, minimum: number, maximum: number): string {
  if (countWords(value) >= minimum) return value;
  return truncateWords(`${value.replace(/[.!?]+$/u, "")} ${addition}`, maximum);
}

function whyFor(story: StoryCandidate, matchingTechnology?: string): string {
  if (story.category === "security") {
    return matchingTechnology === undefined
      ? "Developers should check affected versions and apply the published remediation."
      : `This project uses ${matchingTechnology}; verify the installed version and remediation.`;
  }
  if (matchingTechnology !== undefined)
    return `This project uses ${matchingTechnology}, so the change may affect current development.`;
  if (story.category === "research")
    return "The technique may improve the cost, speed, or reliability of developer tooling.";
  if (story.category === "model")
    return "This may expand practical model choices for local and agentic coding workflows.";
  return "The change may influence tools, dependencies, or workflows used by software teams.";
}

function truncateWords(value: string, limit: number): string {
  const words = value.trim().split(/\s+/u).filter(Boolean);
  if (words.length <= limit) return words.join(" ");
  return `${words
    .slice(0, limit)
    .join(" ")
    .replace(/[,:;.!?]+$/u, "")}…`;
}

export function countWords(value: string): number {
  return value.trim() === "" ? 0 : value.trim().split(/\s+/u).length;
}
