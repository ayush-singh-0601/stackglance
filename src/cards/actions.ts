import type { Story } from "../core/types.js";
import type { StackGlanceDatabase } from "../storage/database.js";

export function explainStory(story: Story): string {
  const lines = [
    "What's new",
    story.headline,
    "",
    "Technical details",
    story.summary,
    "",
    "Potential impact",
    story.whyItMatters,
    "",
    `Source: ${story.source}`,
    `Scope: ${story.scope.toUpperCase()} · Relevance: ${Math.round(story.relevance * 100)}%`,
  ];
  if (story.priority !== undefined) lines.push(`Priority: ${story.priority.toUpperCase()}`);
  lines.push("", "Relevant link", story.url);
  return `${lines.join("\n")}\n`;
}

export function saveStory(database: StackGlanceDatabase, id: string, savedAt = new Date()): Story {
  const story = database.getStory(id);
  if (story === undefined) throw new Error(`Story not found: ${id}`);
  database.saveStory(id, savedAt);
  return story;
}
