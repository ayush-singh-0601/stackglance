import type { RepositoryContext, StoryCandidate } from "../core/types.js";

export interface SummaryResult {
  headline: string;
  summary: string;
  whyItMatters: string;
}

export function deterministicSummary(story: StoryCandidate, repository?: RepositoryContext): SummaryResult {
  const headline = truncateWords(story.title, 12);
  const sentences = story.body
    .replace(/\s+/gu, " ")
    .split(/(?<=[.!?])\s+/u)
    .filter(Boolean);
  const summarySource = sentences.slice(0, 3).join(" ") || `${story.title} was published by ${story.source}.`;
  const summary = truncateWords(summarySource, 45);
  const matchingTechnology = repository?.technologies.find((technology) => story.tags.includes(technology.toLowerCase()));
  const whyItMatters = truncateWords(whyFor(story, matchingTechnology), 20);
  return { headline, summary, whyItMatters };
}

function whyFor(story: StoryCandidate, matchingTechnology?: string): string {
  if (story.category === "security") {
    return matchingTechnology === undefined
      ? "Developers should check affected versions and apply the published remediation."
      : `This project uses ${matchingTechnology}; verify the installed version and remediation.`;
  }
  if (matchingTechnology !== undefined) return `This project uses ${matchingTechnology}, so the change may affect current development.`;
  if (story.category === "research") return "The technique may improve the cost, speed, or reliability of developer tooling.";
  if (story.category === "model") return "This may expand practical model choices for local and agentic coding workflows.";
  return "The change may influence tools, dependencies, or workflows used by software teams.";
}

function truncateWords(value: string, limit: number): string {
  const words = value.trim().split(/\s+/u).filter(Boolean);
  if (words.length <= limit) return words.join(" ");
  return `${words.slice(0, limit).join(" ").replace(/[,:;.!?]+$/u, "")}…`;
}

export function countWords(value: string): number {
  return value.trim() === "" ? 0 : value.trim().split(/\s+/u).length;
}
