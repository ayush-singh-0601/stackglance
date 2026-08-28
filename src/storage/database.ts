import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { Story } from "../core/types.js";

const SCHEMA_VERSION = 1;

export class StackGlanceDatabase {
  readonly connection: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.connection = new DatabaseSync(path);
    this.migrate();
  }

  private migrate(): void {
    this.connection.exec("PRAGMA foreign_keys = ON;");
    this.connection.exec(`
      CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        source_id TEXT NOT NULL,
        url TEXT NOT NULL,
        headline TEXT NOT NULL,
        summary TEXT NOT NULL,
        why_it_matters TEXT NOT NULL,
        category TEXT NOT NULL,
        scope TEXT NOT NULL,
        published_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        relevance REAL NOT NULL,
        tags_json TEXT NOT NULL,
        priority TEXT,
        UNIQUE(source, source_id)
      );
      CREATE INDEX IF NOT EXISTS stories_expiry ON stories(expires_at);
      CREATE TABLE IF NOT EXISTS saved_stories (
        story_id TEXT PRIMARY KEY REFERENCES stories(id) ON DELETE CASCADE,
        saved_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      PRAGMA user_version = ${SCHEMA_VERSION};
    `);
  }

  upsertStories(stories: readonly Story[]): void {
    const statement = this.connection.prepare(`
      INSERT INTO stories (
        id, source, source_id, url, headline, summary, why_it_matters, category,
        scope, published_at, expires_at, relevance, tags_json, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        headline = excluded.headline,
        summary = excluded.summary,
        why_it_matters = excluded.why_it_matters,
        expires_at = excluded.expires_at,
        relevance = excluded.relevance,
        tags_json = excluded.tags_json,
        priority = excluded.priority
    `);
    this.connection.exec("BEGIN");
    try {
      for (const story of stories) {
        statement.run(
          story.id,
          story.source,
          story.sourceId,
          story.url,
          story.headline,
          story.summary,
          story.whyItMatters,
          story.category,
          story.scope,
          story.publishedAt,
          story.expiresAt,
          story.relevance,
          JSON.stringify(story.tags),
          story.priority ?? null,
        );
      }
      this.connection.exec("COMMIT");
    } catch (error) {
      this.connection.exec("ROLLBACK");
      throw error;
    }
  }

  listStories(now = new Date()): Story[] {
    const rows = this.connection
      .prepare(
        "SELECT * FROM stories WHERE expires_at > ? ORDER BY relevance DESC, published_at DESC",
      )
      .all(now.toISOString());
    return rows.map(rowToStory);
  }

  getStory(id: string): Story | undefined {
    const row = this.connection.prepare("SELECT * FROM stories WHERE id = ?").get(id);
    return row === undefined ? undefined : rowToStory(row);
  }

  saveStory(id: string, savedAt = new Date()): boolean {
    return (
      this.connection
        .prepare("INSERT OR IGNORE INTO saved_stories (story_id, saved_at) VALUES (?, ?)")
        .run(id, savedAt.toISOString()).changes > 0
    );
  }

  listSavedStories(): Story[] {
    const rows = this.connection
      .prepare(
        "SELECT stories.* FROM stories JOIN saved_stories ON saved_stories.story_id = stories.id ORDER BY saved_stories.saved_at DESC",
      )
      .all();
    return rows.map(rowToStory);
  }

  setMetadata(key: string, value: string): void {
    this.connection
      .prepare(
        "INSERT INTO metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      )
      .run(key, value);
  }

  getMetadata(key: string): string | undefined {
    const row = this.connection.prepare("SELECT value FROM metadata WHERE key = ?").get(key) as
      { value: string } | undefined;
    return row?.value;
  }

  close(): void {
    this.connection.close();
  }
}

function rowToStory(row: Readonly<Record<string, unknown>>): Story {
  const priority = row.priority as Exclude<Story["priority"], undefined> | null;
  return {
    id: String(row.id),
    source: String(row.source),
    sourceId: String(row.source_id),
    url: String(row.url),
    headline: String(row.headline),
    summary: String(row.summary),
    whyItMatters: String(row.why_it_matters),
    category: row.category as Story["category"],
    scope: row.scope as Story["scope"],
    publishedAt: String(row.published_at),
    expiresAt: String(row.expires_at),
    relevance: Number(row.relevance),
    tags: JSON.parse(String(row.tags_json)) as string[],
    ...(priority === null ? {} : { priority }),
  };
}
