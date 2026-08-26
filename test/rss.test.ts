import { describe, expect, it } from "vitest";

import { parseSyndication } from "../src/feeds/rss.js";

const source = { name: "Example", url: "https://example.com/feed", allowedHosts: ["example.com"] };

describe("RSS and Atom ingestion", () => {
  it("parses RSS items and strips markup", () => {
    const stories = parseSyndication(
      `<rss><channel><item><guid>one</guid><title>Release</title><link>https://example.com/one</link><description><![CDATA[<b>Useful</b> change]]></description><pubDate>Tue, 26 Aug 2026 10:00:00 GMT</pubDate></item></channel></rss>`,
      source,
    );
    expect(stories[0]).toMatchObject({ sourceId: "one", title: "Release", body: "Useful change" });
  });

  it("parses Atom entries", () => {
    const stories = parseSyndication(
      `<feed><entry><id>two</id><title>Research</title><link rel="alternate" href="https://example.com/two"/><summary>Plain summary</summary><updated>2026-08-26T10:00:00Z</updated></entry></feed>`,
      source,
    );
    expect(stories[0]).toMatchObject({ sourceId: "two", url: "https://example.com/two", body: "Plain summary" });
  });
});
