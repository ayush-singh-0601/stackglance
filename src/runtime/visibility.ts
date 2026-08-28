import type { StackGlanceConfig } from "../config/schema.js";
import type { AgentEvent, AgentState } from "../core/types.js";

export interface VisibilityDecision {
  show: boolean;
  reason: string;
  mode: "full" | "minimal" | "hidden";
}

export interface VisibilityInput {
  config: StackGlanceConfig;
  event: AgentEvent;
  stateEnteredAt: string;
  now: Date;
}

const FULL_CARD_STATES = new Set<AgentState>([
  "agent_thinking",
  "running_command",
  "running_tests",
  "building",
  "installing",
]);

export function evaluateVisibility({
  config,
  event,
  stateEnteredAt,
  now,
}: VisibilityInput): VisibilityDecision {
  if (!config.enabled) return hidden("StackGlance is disabled");
  if (!config.agents[event.agent]) return hidden(`${event.agent} integration is disabled`);
  if (config.pausedUntil !== null && Date.parse(config.pausedUntil) > now.getTime())
    return hidden("quiet mode is active");
  if (!FULL_CARD_STATES.has(event.state) && event.state !== "agent_generating") {
    return hidden(`agent state ${event.state} requires a clear screen`);
  }

  const elapsed = now.getTime() - Date.parse(stateEnteredAt);
  if (elapsed < config.display.thinkingDelayMs) {
    return hidden(`waiting for ${config.display.thinkingDelayMs}ms minimum threshold`);
  }

  return {
    show: true,
    reason: "agent is busy and does not need developer attention",
    mode: event.state === "agent_generating" ? "minimal" : "full",
  };
}

function hidden(reason: string): VisibilityDecision {
  return { show: false, reason, mode: "hidden" };
}
