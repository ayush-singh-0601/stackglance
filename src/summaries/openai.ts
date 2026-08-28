import OpenAI from "openai";

import type { SummaryResult } from "./deterministic.js";
import { validateSummary, type Summarizer, type SummaryInput } from "./contract.js";

interface ResponseOutput {
  output_text: string;
}

type CreateResponse = (request: Readonly<Record<string, unknown>>) => Promise<ResponseOutput>;

export interface OpenAiSummarizerOptions {
  apiKey: string;
  model: string;
  createResponse?: CreateResponse;
}

export class OpenAiSummarizer implements Summarizer {
  readonly name = "openai";
  private readonly createResponse: CreateResponse;

  constructor(private readonly options: OpenAiSummarizerOptions) {
    if (options.apiKey.trim() === "")
      throw new Error("OPENAI_API_KEY is required for the OpenAI summarizer");
    if (options.createResponse !== undefined) {
      this.createResponse = options.createResponse;
    } else {
      const client = new OpenAI({ apiKey: options.apiKey });
      this.createResponse = (request) => client.responses.create(request as never);
    }
  }

  async summarize(input: SummaryInput): Promise<SummaryResult> {
    const response = await this.createResponse({
      model: this.options.model,
      store: false,
      input: [
        {
          role: "system",
          content:
            "Explain this development to a software developer. State what happened, the important technical change, and why it matters. Avoid marketing, history, repetition, and clickbait.",
        },
        {
          role: "user",
          content: JSON.stringify({
            title: input.story.title,
            body: input.story.body.slice(0, 12_000),
            category: input.story.category,
            technologies: input.repository?.technologies ?? [],
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "stackglance_card",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["headline", "summary", "whyItMatters"],
            properties: {
              headline: { type: "string", description: "5-12 words" },
              summary: { type: "string", description: "20-45 words in 2-3 short sentences" },
              whyItMatters: { type: "string", description: "8-20 words" },
            },
          },
        },
      },
    });
    if (response.output_text.trim() === "") throw new Error("OpenAI returned an empty summary");
    return validateSummary(JSON.parse(response.output_text) as unknown);
  }
}
