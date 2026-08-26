import { describe, expect, it } from "vitest";

import { GitHubReleaseCollector } from "../src/feeds/github.js";

describe("GitHub release ingestion", () => {
  it("maps public non-draft releases", async () => {
    const collector = new GitHubReleaseCollector(["owner/project"], undefined, (url, options) => {
      expect(url).toContain("owner/project/releases");
      expect(options.allowedHosts).toEqual(["api.github.com"]);
      return Promise.resolve({
        url,
        status: 200,
        headers: {},
        body: JSON.stringify([
          {
            id: 7,
            html_url: "https://github.com/owner/project/releases/tag/v2",
            tag_name: "v2",
            name: "Version 2",
            body: "Faster builds",
            draft: false,
            published_at: "2026-08-26T00:00:00Z",
          },
        ]),
      });
    });
    await expect(collector.collect(new Date("2026-08-26T01:00:00Z"))).resolves.toMatchObject([
      { sourceId: "7", category: "open_source", title: "owner/project Version 2" },
    ]);
  });
});
