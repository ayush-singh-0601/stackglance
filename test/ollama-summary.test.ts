import { describe, expect, it } from "vitest";

import type { StoryCandidate } from "../src/core/types.js";
import { OllamaSummarizer, validateLocalEndpoint } from "../src/summaries/ollama.js";

const story: StoryCandidate = {
  id: "one",
  source: "news",
  sourceId: "one",
  url: "https://example.com",
  title: "New local coding model improves tool calls",
  body: "The model is small enough for local use and improves agent workflows.",
  category: "model",
  publishedAt: "2026-08-26T00:00:00Z",
  expiresAt: "2026-09-01T00:00:00Z",
  tags: ["model"],
  metadata: {},
};

describe("Ollama summarizer", () => {
  it("accepts only local endpoints", () => {
    expect(validateLocalEndpoint("http://127.0.0.1:11434").port).toBe("11434");
    expect(() => validateLocalEndpoint("https://remote.example.com")).toThrow("loopback");
  });

  it("requests non-streaming structured output", async () => {
    let body = "";
    const summarizer = new OllamaSummarizer({
      endpoint: "http://localhost:11434",
      model: "qwen-test",
      fetch: (_url, init) => {
        body = typeof init.body === "string" ? init.body : "";
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              response: JSON.stringify({
                headline: "Local coding model improves reliable tool calls",
                summary: "The model runs locally and improves tool calling during multi-step coding workflows. Its smaller size makes private repository assistance practical on developer hardware.",
                whyItMatters: "Teams can use capable coding assistance without sending project context to remote services.",
              }),
            }),
        });
      },
    });
    await expect(summarizer.summarize({ story })).resolves.toMatchObject({ headline: "Local coding model improves reliable tool calls" });
    expect(JSON.parse(body) as unknown).toMatchObject({ stream: false, format: { type: "object" }, options: { temperature: 0 } });
  });
});
