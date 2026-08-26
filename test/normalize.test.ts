import { describe, expect, it } from "vitest";

import { normalizeStories } from "../src/intelligence/normalize.js";

describe("story normalization", () => {
  it("canonicalizes, deduplicates, categorizes, and expires stories", () => {
    const raw = {
      source: "News",
      sourceId: "one",
      url: "https://example.com/release?utm_source=test",
      title: " Critical security vulnerability released ",
      body: "A CVE affects middleware.",
      publishedAt: "2026-08-26T00:00:00Z",
      fetchedAt: "2026-08-26T01:00:00Z",
    };
    const stories = normalizeStories(
      [raw, { ...raw, sourceId: "duplicate", url: "https://example.com/release" }],
      new Date("2026-08-27"),
    );
    expect(stories).toHaveLength(1);
    expect(stories[0]).toMatchObject({
      category: "security",
      url: "https://example.com/release",
      expiresAt: "2026-09-25T00:00:00.000Z",
    });
  });

  it("drops stale and non-HTTPS input", () => {
    const base = {
      source: "x",
      sourceId: "x",
      title: "Old news",
      body: "body",
      fetchedAt: "2026-08-26T00:00:00Z",
    };
    expect(
      normalizeStories(
        [
          { ...base, url: "http://example.com", publishedAt: "2026-08-26T00:00:00Z" },
          { ...base, url: "https://example.com", publishedAt: "2020-01-01T00:00:00Z" },
        ],
        new Date("2026-08-27"),
      ),
    ).toEqual([]);
  });
});
