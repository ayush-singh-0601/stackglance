import type { z } from "zod";

import type { Story, StoryCandidate } from "../core/types.js";
import { summarySchema } from "../summaries/contract.js";
import { countWords, type SummaryResult } from "../summaries/deterministic.js";
import type { RelevanceScore } from "./relevance.js";
import { assessSecurity } from "./security.js";

export const cardContentSchema = summarySchema.refine(
  (content) => countWords(`${content.headline} ${content.summary} ${content.whyItMatters}`) >= 35,
  { message: "card must contain at least 35 words" },
).refine((content) => countWords(`${content.headline} ${content.summary} ${content.whyItMatters}`) <= 70, {
  message: "card must contain no more than 70 words",
});

export function assembleStory(candidate: StoryCandidate, relevance: RelevanceScore, content: SummaryResult): Story {
  const valid = cardContentSchema.parse(content);
  const security = assessSecurity(candidate);
  return {
    id: candidate.id,
    source: candidate.source,
    sourceId: candidate.sourceId,
    url: candidate.url,
    headline: valid.headline,
    summary: valid.summary,
    whyItMatters: valid.whyItMatters,
    category: candidate.category,
    scope: relevance.scope,
    publishedAt: candidate.publishedAt,
    expiresAt: candidate.expiresAt,
    relevance: relevance.score,
    tags: candidate.tags,
    ...(security === undefined ? {} : { priority: security.priority }),
  };
}

export type CardContent = z.infer<typeof cardContentSchema>;
