import { describe, expect, it } from "vitest";

import { ArxivCollector } from "../src/feeds/arxiv.js";

describe("arXiv ingestion", () => {
  it("builds a bounded query and maps papers to research stories", async () => {
    const collector = new ArxivCollector(["retrieval augmented generation"], (url, options) => {
      expect(url).toContain("max_results=10");
      expect(new URL(url).searchParams.get("search_query")).toContain(
        'all:"retrieval augmented generation"',
      );
      expect(options.allowedHosts).toEqual(["export.arxiv.org"]);
      return Promise.resolve({
        url,
        status: 200,
        headers: {},
        body: `<feed><entry><id>https://arxiv.org/abs/2608.1</id><title>Better retrieval</title><link rel="alternate" href="https://arxiv.org/abs/2608.1"/><summary>A practical technique.</summary><published>2026-08-26T00:00:00Z</published></entry></feed>`,
      });
    });
    await expect(collector.collect()).resolves.toMatchObject([
      { category: "research", title: "Better retrieval" },
    ]);
  });
});
