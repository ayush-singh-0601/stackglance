import type { RawStory } from "../core/types.js";
import { safeFetchText, type SafeFetchOptions, type SafeResponse } from "./safe-fetch.js";
import type { FeedCollector } from "./types.js";

type FetchText = (url: string, options: SafeFetchOptions) => Promise<SafeResponse>;

interface GitHubRelease {
  id: number;
  html_url: string;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  published_at: string | null;
}

export class GitHubReleaseCollector implements FeedCollector {
  readonly name = "GitHub Releases";

  constructor(
    private readonly repositories: readonly string[],
    private readonly token?: string,
    private readonly fetchText: FetchText = safeFetchText,
  ) {}

  async collect(now = new Date()): Promise<RawStory[]> {
    const batches = await Promise.all(this.repositories.map((repository) => this.collectRepository(repository, now)));
    return batches.flat();
  }

  private async collectRepository(repository: string, now: Date): Promise<RawStory[]> {
    if (!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/iu.test(repository)) throw new Error(`Invalid GitHub repository: ${repository}`);
    const headers = { accept: "application/vnd.github+json", ...(this.token === undefined ? {} : { authorization: `Bearer ${this.token}` }) };
    const response = await this.fetchText(`https://api.github.com/repos/${repository}/releases?per_page=10`, {
      allowedHosts: ["api.github.com"],
      headers,
    });
    const releases = JSON.parse(response.body) as GitHubRelease[];
    return releases
      .filter((release) => !release.draft && release.published_at !== null)
      .map((release) => ({
        source: this.name,
        sourceId: String(release.id),
        url: release.html_url,
        title: `${repository} ${release.name ?? release.tag_name}`,
        body: release.body?.slice(0, 20_000) ?? "",
        category: "open_source",
        publishedAt: new Date(release.published_at!).toISOString(),
        fetchedAt: now.toISOString(),
        metadata: { repository, tag: release.tag_name },
      }));
  }
}
