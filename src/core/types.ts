export const AGENTS = ["codex", "claude", "gemini", "opencode", "aider"] as const;
export type AgentName = (typeof AGENTS)[number];

export const AGENT_STATES = [
  "idle",
  "user_typing",
  "agent_thinking",
  "agent_generating",
  "running_command",
  "running_tests",
  "building",
  "installing",
  "waiting_for_tool",
  "waiting_for_user",
  "finished",
  "error",
] as const;
export type AgentState = (typeof AGENT_STATES)[number];

export const RADAR_SCOPES = ["task", "project", "global"] as const;
export type RadarScope = (typeof RADAR_SCOPES)[number];

export const CATEGORIES = [
  "ai",
  "project",
  "open_source",
  "security",
  "model",
  "research",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface AgentEvent {
  agent: AgentName;
  state: AgentState;
  session: string;
  cwd?: string;
  task?: string;
  occurredAt: string;
}

export interface RawStory {
  sourceId: string;
  source: string;
  url: string;
  title: string;
  body?: string;
  category?: Category;
  publishedAt: string;
  fetchedAt: string;
  metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface Story {
  id: string;
  source: string;
  sourceId: string;
  url: string;
  headline: string;
  summary: string;
  whyItMatters: string;
  category: Category;
  scope: RadarScope;
  publishedAt: string;
  expiresAt: string;
  relevance: number;
  tags: readonly string[];
  priority?: "low" | "medium" | "high" | "critical";
}

export interface RadarDecision {
  show: boolean;
  reason: string;
  story?: Story;
}

export interface RepositoryContext {
  root: string;
  technologies: readonly string[];
  dependencies: Readonly<Record<string, string>>;
}
