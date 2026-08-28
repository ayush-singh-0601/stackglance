import type { StackGlanceConfig } from "../config/schema.js";
import type { GlanceScope, StoryCandidate } from "../core/types.js";
import type { RelevanceScore } from "./relevance.js";

export interface RankedCandidate {
  story: StoryCandidate;
  relevance: RelevanceScore;
}

export function blendFeed(
  items: readonly RankedCandidate[],
  weights: StackGlanceConfig["feed"],
  limit = 20,
): RankedCandidate[] {
  const unique = [...new Map(items.map((item) => [item.story.id, item])).values()];
  const groups = new Map<GlanceScope, RankedCandidate[]>([
    ["task", []],
    ["project", []],
    ["global", []],
  ]);
  for (const item of unique) groups.get(item.relevance.scope)?.push(item);
  for (const group of groups.values())
    group.sort((left, right) => right.relevance.score - left.relevance.score);

  const count = Math.min(limit, unique.length);
  const quotas = allocateQuotas(count, weights);
  const output: RankedCandidate[] = [];
  const scopes: GlanceScope[] = ["task", "project", "global"];
  while (output.length < count) {
    let added = false;
    for (const scope of scopes) {
      const quota = quotas[scope];
      const group = groups.get(scope)!;
      if (quota > 0 && group.length > 0) {
        output.push(group.shift()!);
        quotas[scope] -= 1;
        added = true;
      }
    }
    if (added) continue;
    const remaining = [...groups.values()]
      .flat()
      .sort((left, right) => right.relevance.score - left.relevance.score);
    output.push(...remaining.slice(0, count - output.length));
    break;
  }
  return output;
}

function allocateQuotas(
  count: number,
  weights: StackGlanceConfig["feed"],
): Record<GlanceScope, number> {
  const scopes: GlanceScope[] = ["task", "project", "global"];
  const exact = scopes.map((scope) => ({ scope, exact: (weights[scope] / 100) * count }));
  const quotas = Object.fromEntries(
    exact.map(({ scope, exact: value }) => [scope, Math.floor(value)]),
  ) as Record<GlanceScope, number>;
  let remaining = count - Object.values(quotas).reduce((sum, value) => sum + value, 0);
  for (const { scope } of exact.sort((left, right) => (right.exact % 1) - (left.exact % 1))) {
    if (remaining-- <= 0) break;
    quotas[scope] += 1;
  }
  return quotas;
}
