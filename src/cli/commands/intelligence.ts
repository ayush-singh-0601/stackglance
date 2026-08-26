import { access } from "node:fs/promises";
import { join } from "node:path";

import { explainStory, saveStory } from "../../cards/actions.js";
import { loadConfig } from "../../config/store.js";
import type { Story } from "../../core/types.js";
import { detectAgents } from "../../agents/detect.js";
import { detectRepository } from "../../intelligence/repository.js";
import { DevRadarDatabase } from "../../storage/database.js";
import type { CliContext } from "../context.js";
import type { CliIo } from "../run.js";

export function showFeed(context: CliContext, io: CliIo): Promise<number> {
  return Promise.resolve(withDatabase(context, (database) => printStories(database.listStories(context.now()), io)));
}

export function showCatchup(context: CliContext, io: CliIo): Promise<number> {
  return Promise.resolve(withDatabase(context, (database) => {
    const since = database.getMetadata("last_session") ?? new Date(0).toISOString();
    const stories = database.listStories(context.now()).filter((story) => Date.parse(story.publishedAt) > Date.parse(since));
    database.setMetadata("last_session", context.now().toISOString());
    io.stdout.write(`DevRadar catch-up since ${since}\n\n`);
    return printStories(stories, io);
  }));
}

export async function showImpact(context: CliContext, io: CliIo): Promise<number> {
  const repository = await detectRepository(context.cwd ?? process.cwd());
  return withDatabase(context, (database) => {
    const technologies = new Set(repository.technologies.map((value) => value.toLowerCase()));
    const stories = database
      .listStories(context.now())
      .filter((story) => story.scope !== "global" || story.tags.some((tag) => technologies.has(tag.toLowerCase())));
    io.stdout.write(`Project impact for ${repository.root}\n\n`);
    return printStories(stories, io);
  });
}

export function explainById(id: string | undefined, context: CliContext, io: CliIo): Promise<number> {
  if (id === undefined) return Promise.resolve(missingId("explain", io));
  return Promise.resolve(withDatabase(context, (database) => {
    const story = database.getStory(id);
    if (story === undefined) {
      io.stderr.write(`Story not found: ${id}\n`);
      return 1;
    }
    io.stdout.write(explainStory(story));
    return 0;
  }));
}

export function saveById(id: string | undefined, context: CliContext, io: CliIo): Promise<number> {
  if (id === undefined) return Promise.resolve(missingId("save", io));
  return Promise.resolve(withDatabase(context, (database) => {
    try {
      const story = saveStory(database, id, context.now());
      io.stdout.write(`Saved: ${story.headline}\n`);
      return 0;
    } catch (error) {
      io.stderr.write(`${error instanceof Error ? error.message : "Unable to save story"}\n`);
      return 1;
    }
  }));
}

export async function runDoctor(context: CliContext, io: CliIo): Promise<number> {
  let healthy = true;
  try {
    const config = await loadConfig(context.paths.config);
    io.stdout.write(`✓ Configuration valid (${config.enabled ? "enabled" : "disabled"})\n`);
  } catch {
    healthy = false;
    io.stdout.write("✗ Configuration invalid\n");
  }
  try {
    new DevRadarDatabase(context.paths.database).close();
    io.stdout.write("✓ SQLite storage ready\n");
  } catch {
    healthy = false;
    io.stdout.write("✗ SQLite storage unavailable\n");
  }
  const integrationPaths: Record<string, string> = {
    codex: join(context.home ?? "", ".codex", "hooks.json"),
    claude: join(context.home ?? "", ".claude", "settings.json"),
    gemini: join(context.home ?? "", ".gemini", "settings.json"),
    opencode: join(context.home ?? "", ".config", "opencode", "plugins", "devradar.js"),
    aider: join(context.home ?? "", ".aider.conf.yml"),
  };
  for (const agent of detectAgents()) {
    const configured = await exists(integrationPaths[agent.agent]!);
    io.stdout.write(`${agent.installed && configured ? "✓" : "·"} ${agent.agent}: ${agent.installed ? (configured ? "ready" : "setup required") : "not installed"}\n`);
  }
  return healthy ? 0 : 1;
}

function printStories(stories: readonly Story[], io: CliIo): number {
  if (stories.length === 0) {
    io.stdout.write("No cached intelligence yet.\n");
    return 0;
  }
  for (const story of stories) {
    io.stdout.write(`${story.id}  [${story.scope.toUpperCase()} ${Math.round(story.relevance * 100)}%] ${story.headline}\n`);
  }
  return 0;
}

function withDatabase(context: CliContext, operation: (database: DevRadarDatabase) => number): number {
  const database = new DevRadarDatabase(context.paths.database);
  try {
    return operation(database);
  } finally {
    database.close();
  }
}

function missingId(command: string, io: CliIo): number {
  io.stderr.write(`Usage: devradar ${command} <story-id>\n`);
  return 2;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
