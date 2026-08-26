import type { Story, StoryCandidate } from "../core/types.js";

export interface SecurityAssessment {
  priority: NonNullable<Story["priority"]>;
  dependency?: string;
  advisory?: string;
  action: string;
}

export function assessSecurity(story: StoryCandidate): SecurityAssessment | undefined {
  if (story.category !== "security") return undefined;
  const severity = String(story.metadata.severity ?? "unknown").toLowerCase();
  const dependency =
    typeof story.metadata.dependency === "string" ? story.metadata.dependency : undefined;
  const advisory =
    typeof story.metadata.advisory === "string" ? story.metadata.advisory : undefined;
  const priority =
    severity === "critical"
      ? "critical"
      : severity === "high" || dependency !== undefined
        ? "high"
        : severity === "moderate" || severity === "medium"
          ? "medium"
          : "low";
  const target = dependency === undefined ? "affected software" : `${dependency} in this project`;
  return {
    priority,
    ...(dependency === undefined ? {} : { dependency }),
    ...(advisory === undefined ? {} : { advisory }),
    action: `Check ${target}, review affected versions, and apply the published remediation.`,
  };
}
