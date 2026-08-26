import type { RawStory, RepositoryContext } from "../core/types.js";
import { safeFetchText, type SafeFetchOptions, type SafeResponse } from "./safe-fetch.js";
import type { FeedCollector } from "./types.js";

type FetchText = (url: string, options: SafeFetchOptions) => Promise<SafeResponse>;

interface OsvVulnerability {
  id: string;
  summary?: string;
  details?: string;
  modified: string;
  published?: string;
  references?: { type: string; url: string }[];
  database_specific?: { severity?: string };
}

interface OsvBatchResponse {
  results: { vulns?: OsvVulnerability[] }[];
}

export class OsvCollector implements FeedCollector {
  readonly name = "OSV";

  constructor(
    private readonly repository: RepositoryContext,
    private readonly fetchText: FetchText = safeFetchText,
  ) {}

  async collect(now = new Date()): Promise<RawStory[]> {
    const dependencies = Object.entries(this.repository.dependencies);
    if (dependencies.length === 0) return [];
    const queries = dependencies.map(([name, range]) => ({ package: { ecosystem: "npm", name }, version: cleanVersion(range) }));
    const response = await this.fetchText("https://api.osv.dev/v1/querybatch", {
      allowedHosts: ["api.osv.dev"],
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ queries }),
    });
    const parsed = JSON.parse(response.body) as OsvBatchResponse;
    return parsed.results.flatMap((result, index) =>
      (result.vulns ?? []).map((vulnerability) => mapVulnerability(vulnerability, dependencies[index]?.[0] ?? "dependency", now)),
    );
  }
}

function mapVulnerability(vulnerability: OsvVulnerability, dependency: string, now: Date): RawStory {
  const advisory = vulnerability.references?.find(({ type }) => type === "ADVISORY")?.url;
  return {
    source: "OSV",
    sourceId: `${vulnerability.id}:${dependency}`,
    url: advisory ?? `https://osv.dev/vulnerability/${encodeURIComponent(vulnerability.id)}`,
    title: `${vulnerability.id} affects ${dependency}`,
    body: vulnerability.summary ?? vulnerability.details?.slice(0, 4_000) ?? "A dependency advisory may affect this project.",
    category: "security",
    publishedAt: new Date(vulnerability.published ?? vulnerability.modified).toISOString(),
    fetchedAt: now.toISOString(),
    metadata: {
      dependency,
      advisory: vulnerability.id,
      severity: vulnerability.database_specific?.severity?.toLowerCase() ?? "unknown",
    },
  };
}

function cleanVersion(range: string): string {
  return range.match(/\d+(?:\.\d+){0,3}(?:-[a-z0-9.-]+)?/iu)?.[0] ?? range;
}
