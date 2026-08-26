import { describe, expect, it } from "vitest";

import type { StoryCandidate } from "../src/core/types.js";
import { OpenAiSummarizer } from "../src/summaries/openai.js";

const story: StoryCandidate = {
  id: "one",
  source: "news",
  sourceId: "one",
  url: "https://example.com",
  title: "A new coding model improves repository reasoning",
  body: "The model can complete long tasks with lower latency and more reliable tool calls.",
  category: "model",
  publishedAt: "2026-08-26T00:00:00Z",
  expiresAt: "2026-09-01T00:00:00Z",
  tags: ["model"],
  metadata: {},
};

describe("OpenAI Responses summarizer", () => {
  it("requests non-stored structured output and validates it", async () => {
    let captured: Readonly<Record<string, unknown>> | undefined;
    const summarizer = new OpenAiSummarizer({
      apiKey: "test-key",
      model: "gpt-test",
      createResponse: (request) => {
        captured = request;
        return Promise.resolve({
          output_text: JSON.stringify({
            headline: "New coding model improves repository reasoning",
            summary: "The model handles longer coding tasks with more reliable tool calls and lower latency. It can reason across larger repositories while maintaining progress through multi-step changes.",
            whyItMatters: "Developers may finish autonomous coding tasks faster with fewer failed tool interactions.",
          }),
        });
      },
    });
    const result = await summarizer.summarize({ story });
    expect(result.headline).toContain("coding model");
    expect(captured).toMatchObject({ model: "gpt-test", store: false, text: { format: { type: "json_schema", strict: true } } });
  });
});
