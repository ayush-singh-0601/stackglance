import { createHash } from "node:crypto";

import type { Category, RawStory, StoryCandidate } from "../core/types.js";

const TTL_DAYS: Readonly<Record<Category, number>> = {
  ai: 7,
  project: 14,
  open_source: 14,
  security: 30,
  model: 14,
  research: 30,
};

export function normalizeStories(
  rawStories: readonly RawStory[],
  now = new Date(),
): StoryCandidate[] {
  const seen = new Set<string>();
  const normalized: StoryCandidate[] = [];
  for (const raw of rawStories) {
    const url = canonicalUrl(raw.url);
    const title = clean(raw.title);
    const body = clean(raw.body ?? "");
    if (title === "" || url === undefined) continue;
    const deduplicationKey = `${url}|${title.toLowerCase().replace(/[^a-z0-9]/gu, "")}`;
    if (seen.has(deduplicationKey)) continue;
    seen.add(deduplicationKey);
    const category = raw.category ?? inferCategory(`${title} ${body}`);
    const publishedAt = safeDate(raw.publishedAt, now);
    const expiresAt = new Date(
      Date.parse(publishedAt) + TTL_DAYS[category] * 86_400_000,
    ).toISOString();
    if (Date.parse(expiresAt) <= now.getTime()) continue;
    normalized.push({
      id: createHash("sha256")
        .update(`${raw.source}\0${raw.sourceId}\0${url}`)
        .digest("hex")
        .slice(0, 24),
      source: clean(raw.source),
      sourceId: raw.sourceId,
      url,
      title,
      body,
      category,
      publishedAt,
      expiresAt,
      tags: extractTags(`${title} ${body}`),
      metadata: raw.metadata ?? {},
    });
  }
  return normalized;
}

function canonicalUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return undefined;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || key === "ref") url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

function clean(value: string): string {
  return [...value.normalize("NFKC")]
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 32 || code === 127 ? " " : character;
    })
    .join("")
    .replace(/\s+/gu, " ")
    .trim();
}

function safeDate(value: string, fallback: Date): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}

function inferCategory(text: string): Category {
  const lower = text.toLowerCase();
  if (/\b(cve|vulnerability|security|exploit|advisory)\b/u.test(lower)) return "security";
  if (/\b(model|llm|inference|parameters)\b/u.test(lower)) return "model";
  if (/\b(paper|research|benchmark|arxiv)\b/u.test(lower)) return "research";
  if (/\b(open source|github|release)\b/u.test(lower)) return "open_source";
  return "ai";
}

function extractTags(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[a-z][a-z0-9.+#-]{2,}/gu) ?? [])].slice(0, 30);
}
