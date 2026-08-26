import type { SummaryResult } from "./deterministic.js";
import { validateSummary, type Summarizer, type SummaryInput } from "./contract.js";

interface LocalResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

type LocalFetch = (url: string, init: RequestInit) => Promise<LocalResponse>;

export interface OllamaSummarizerOptions {
  endpoint: string;
  model: string;
  fetch?: LocalFetch;
}

const CARD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "summary", "whyItMatters"],
  properties: {
    headline: { type: "string", description: "5-12 words" },
    summary: { type: "string", description: "20-45 words" },
    whyItMatters: { type: "string", description: "8-20 words" },
  },
} as const;

export class OllamaSummarizer implements Summarizer {
  readonly name = "ollama";
  private readonly endpoint: URL;
  private readonly localFetch: LocalFetch;

  constructor(private readonly options: OllamaSummarizerOptions) {
    this.endpoint = validateLocalEndpoint(options.endpoint);
    this.localFetch = options.fetch ?? ((url, init) => fetch(url, init));
  }

  async summarize(input: SummaryInput): Promise<SummaryResult> {
    const response = await this.localFetch(new URL("/api/generate", this.endpoint).toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: this.options.model,
        stream: false,
        format: CARD_SCHEMA,
        options: { temperature: 0 },
        system:
          "Explain this development to a software developer in a compact card. Avoid marketing, background history, repetition, and clickbait. Return only the requested JSON.",
        prompt: JSON.stringify({
          schema: CARD_SCHEMA,
          title: input.story.title,
          body: input.story.body.slice(0, 12_000),
          category: input.story.category,
          technologies: input.repository?.technologies ?? [],
        }),
      }),
    });
    if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
    const payload = (await response.json()) as { response?: unknown; error?: unknown };
    if (typeof payload.response !== "string") {
      const detail = typeof payload.error === "string" ? payload.error : "missing output";
      throw new Error(`Ollama returned an invalid response: ${detail}`);
    }
    return validateSummary(JSON.parse(payload.response) as unknown);
  }
}

export function validateLocalEndpoint(value: string): URL {
  const endpoint = new URL(value);
  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (endpoint.protocol !== "http:" || !localHosts.has(endpoint.hostname)) {
    throw new Error("Ollama endpoint must be an HTTP loopback address");
  }
  if (endpoint.username !== "" || endpoint.password !== "")
    throw new Error("Ollama endpoint cannot contain credentials");
  return endpoint;
}
