import { z } from "zod";

import type { RepositoryContext, StoryCandidate } from "../core/types.js";
import { countWords, deterministicSummary, type SummaryResult } from "./deterministic.js";

function boundedWords(label: string, minimum: number, maximum: number): z.ZodString {
  return z
    .string()
    .transform((value) => value.replace(/\s+/gu, " ").trim())
    .pipe(
      z.string().refine((value) => countWords(value) >= minimum && countWords(value) <= maximum, {
        message: `${label} must contain ${minimum}-${maximum} words`,
      }),
    ) as unknown as z.ZodString;
}

export const summarySchema: z.ZodType<SummaryResult> = z.object({
  headline: boundedWords("headline", 5, 12),
  summary: boundedWords("summary", 20, 45),
  whyItMatters: boundedWords("why it matters", 8, 20),
});

export interface SummaryInput {
  story: StoryCandidate;
  repository?: RepositoryContext | undefined;
}

export interface Summarizer {
  readonly name: string;
  summarize(input: SummaryInput): Promise<SummaryResult>;
}

export class DeterministicSummarizer implements Summarizer {
  readonly name = "deterministic";

  summarize(input: SummaryInput): Promise<SummaryResult> {
    return Promise.resolve(deterministicSummary(input.story, input.repository));
  }
}

export function providerSecret(provider: "deterministic" | "openai" | "ollama", env = process.env): string | undefined {
  return provider === "openai" ? env.OPENAI_API_KEY : undefined;
}

export function validateSummary(value: unknown): SummaryResult {
  return summarySchema.parse(value);
}
