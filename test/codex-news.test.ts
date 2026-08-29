import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  CodexNewsCollector,
  parseCodexJsonl,
  type CodexExecutionRequest,
} from "../src/feeds/codex-news.js";

describe("optional Codex live-news collector", () => {
  it("keeps only recent, verified-shaped stories and reports token usage", async () => {
    const workDirectory = await mkdtemp(join(tmpdir(), "stackglance-codex-news-"));
    const usage = vi.fn();
    let request: CodexExecutionRequest | undefined;
    const collector = new CodexNewsCollector({
      executable: "codex",
      workDirectory,
      technologies: ["TypeScript", "Node.js"],
      maxStories: 4,
      maxAgeHours: 72,
      onUsage: usage,
      execute: (value) => {
        request = value;
        return Promise.resolve({
          finalMessage: JSON.stringify({
            stories: [
              {
                source: "Node.js",
                url: "https://nodejs.org/en/blog/release/example",
                title: "Node.js publishes a new runtime release",
                summary:
                  "The runtime release adds developer-facing diagnostics and reliability fixes.",
                category: "open_source",
                publishedAt: "2026-08-28T12:00:00.000Z",
              },
              {
                source: "Old source",
                url: "https://example.com/old",
                title: "An old developer update",
                summary: "This item is outside the configured freshness window.",
                category: "ai",
                publishedAt: "2026-08-20T12:00:00.000Z",
              },
            ],
          }),
          usage: {
            inputTokens: 900,
            cachedInputTokens: 700,
            outputTokens: 100,
            reasoningOutputTokens: 0,
          },
        });
      },
    });

    const stories = await collector.collect(new Date("2026-08-29T12:00:00.000Z"));
    expect(stories).toHaveLength(1);
    expect(stories[0]).toMatchObject({
      source: "Node.js",
      metadata: { collectedBy: "codex", aiAssisted: true },
    });
    expect(request?.prompt).toContain("last 72 hours");
    expect(request?.prompt).toContain("TypeScript, Node.js");
    expect(usage).toHaveBeenCalledWith(expect.objectContaining({ inputTokens: 900 }));
  });

  it("extracts the structured final response and usage from Codex JSONL", () => {
    const finalMessage = JSON.stringify({ stories: [] });
    const jsonl = [
      JSON.stringify({ type: "thread.started", thread_id: "one" }),
      JSON.stringify({
        type: "item.completed",
        item: { type: "agent_message", text: finalMessage },
      }),
      JSON.stringify({
        type: "turn.completed",
        usage: {
          input_tokens: 1200,
          cached_input_tokens: 1000,
          output_tokens: 80,
          reasoning_output_tokens: 20,
        },
      }),
    ].join("\n");

    expect(parseCodexJsonl(jsonl)).toEqual({
      finalMessage,
      usage: {
        inputTokens: 1200,
        cachedInputTokens: 1000,
        outputTokens: 80,
        reasoningOutputTokens: 20,
      },
    });
  });
});
