import { XMLParser } from "fast-xml-parser";

import type { RawStory } from "../core/types.js";
import { safeFetchText, type SafeResponse } from "./safe-fetch.js";
import type { FeedCollector, FeedSource } from "./types.js";

type FetchText = (url: string, options: { allowedHosts: readonly string[] }) => Promise<SafeResponse>;

export class RssAtomCollector implements FeedCollector {
  readonly name: string;

  constructor(
    private readonly source: FeedSource,
    private readonly fetchText: FetchText = safeFetchText,
  ) {
    this.name = source.name;
  }

  async collect(now = new Date()): Promise<RawStory[]> {
    const response = await this.fetchText(this.source.url, { allowedHosts: this.source.allowedHosts });
    return parseSyndication(response.body, this.source, now);
  }
}

export function parseSyndication(xml: string, source: FeedSource, now = new Date()): RawStory[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", processEntities: false });
  const document = parser.parse(xml) as Record<string, unknown>;
  const rssItems = asArray(asRecord(asRecord(document.rss).channel).item);
  if (rssItems.length > 0) return rssItems.map((item) => rssItem(item, source, now));

  const atomEntries = asArray(asRecord(document.feed).entry);
  return atomEntries.map((entry) => atomEntry(entry, source, now));
}

function rssItem(value: unknown, source: FeedSource, now: Date): RawStory {
  const item = asRecord(value);
  const url = text(item.link);
  return {
    source: source.name,
    sourceId: text(item.guid) || url || text(item.title),
    url,
    title: text(item.title),
    body: cleanText(text(item.description) || text(item["content:encoded"])),
    publishedAt: validDate(text(item.pubDate), now),
    fetchedAt: now.toISOString(),
  };
}

function atomEntry(value: unknown, source: FeedSource, now: Date): RawStory {
  const entry = asRecord(value);
  const links = asArray(entry.link).map(asRecord);
  const alternate = links.find((link) => text(link["@_rel"]) === "alternate") ?? links[0];
  const url = alternate === undefined ? "" : text(alternate["@_href"]);
  return {
    source: source.name,
    sourceId: text(entry.id) || url || text(entry.title),
    url,
    title: text(entry.title),
    body: cleanText(text(entry.summary) || text(entry.content)),
    publishedAt: validDate(text(entry.published) || text(entry.updated), now),
    fetchedAt: now.toISOString(),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  const record = asRecord(value);
  return typeof record["#text"] === "string" ? record["#text"].trim() : "";
}

function cleanText(value: string): string {
  return value.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim();
}

function validDate(value: string, fallback: Date): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}
