import { describe, expect, it } from "vitest";

import type { Story } from "../src/core/types.js";
import { renderCard, sanitizeTerminalText } from "../src/terminal/render.js";

const story: Story = {
  id: "one",
  source: "news",
  sourceId: "one",
  url: "https://example.com",
  headline: "A useful developer tool release arrives today",
  summary: "The release improves repository analysis and reduces unnecessary work during long coding sessions. Existing commands stay compatible with the faster implementation.",
  whyItMatters: "Developers can spend less time waiting for repeated repository operations.",
  category: "open_source",
  scope: "project",
  publishedAt: "2026-08-26T00:00:00Z",
  expiresAt: "2026-09-01T00:00:00Z",
  relevance: 0.93,
  tags: [],
};

describe("terminal renderer", () => {
  it("renders a one-glance card within terminal width", () => {
    const rendered = renderCard(story, { width: 60 });
    expect(rendered.text).toContain("Why it matters:");
    expect(rendered.text).toContain("[E] Explain");
    expect(rendered.text.trimEnd().split("\n").every((line) => [...line].length <= 60)).toBe(true);
  });

  it("removes terminal control injection from external content", () => {
    expect(sanitizeTerminalText("safe\u001b[2J\ntext")).toBe("safe [2J text");
  });
});
