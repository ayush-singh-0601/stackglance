import type { RawStory } from "../core/types.js";
import { parseSyndication } from "./rss.js";
import { safeFetchText, type SafeFetchOptions, type SafeResponse } from "./safe-fetch.js";
import type { FeedCollector } from "./types.js";

type FetchText = (url: string, options: SafeFetchOptions) => Promise<SafeResponse>;

export class ArxivCollector implements FeedCollector {
  readonly name = "arXiv";

  constructor(
    private readonly terms: readonly string[],
    private readonly fetchText: FetchText = safeFetchText,
  ) {}

  async collect(now = new Date()): Promise<RawStory[]> {
    const terms = this.terms.map(cleanTerm).filter(Boolean).slice(0, 8);
    if (terms.length === 0) return [];
    const query = terms.map((term) => `all:"${term}"`).join(" OR ");
    const parameters = new URLSearchParams({
      search_query: query,
      start: "0",
      max_results: "10",
      sortBy: "submittedDate",
      sortOrder: "descending",
    });
    const url = `https://export.arxiv.org/api/query?${parameters.toString()}`;
    const response = await this.fetchText(url, { allowedHosts: ["export.arxiv.org"] });
    return parseSyndication(
      response.body,
      { name: this.name, url, allowedHosts: ["export.arxiv.org"] },
      now,
    ).map((story) => ({
      ...story,
      category: "research",
    }));
  }
}

function cleanTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9 .+#-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 80);
}
