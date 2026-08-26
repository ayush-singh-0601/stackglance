import { describe, expect, it } from "vitest";

import type { StoryCandidate } from "../src/core/types.js";
import { assessSecurity } from "../src/intelligence/security.js";

const candidate: StoryCandidate = {
  id: "one",
  source: "OSV",
  sourceId: "one",
  url: "https://osv.dev/one",
  title: "Authorization bypass",
  body: "Affected middleware can bypass authorization.",
  category: "security",
  publishedAt: "2026-08-26T00:00:00Z",
  expiresAt: "2026-09-26T00:00:00Z",
  tags: ["next.js"],
  metadata: { severity: "critical", dependency: "next", advisory: "GHSA-one" },
};

describe("security assessment", () => {
  it("makes affected project advisories direct and actionable", () => {
    expect(assessSecurity(candidate)).toEqual({
      priority: "critical",
      dependency: "next",
      advisory: "GHSA-one",
      action: "Check next in this project, review affected versions, and apply the published remediation.",
    });
  });

  it("does not label ordinary news as security", () => {
    expect(assessSecurity({ ...candidate, category: "research" })).toBeUndefined();
  });
});
