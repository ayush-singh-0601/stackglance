import { z } from "zod";

import { AGENTS, AGENT_STATES, type AgentEvent, type RadarDecision } from "../core/types.js";

export const agentEventSchema: z.ZodType<AgentEvent> = z.object({
  agent: z.enum(AGENTS),
  state: z.enum(AGENT_STATES),
  session: z.string().min(1).max(256),
  cwd: z.string().max(4_096).optional(),
  task: z.string().max(4_096).optional(),
  occurredAt: z.iso.datetime(),
});

export interface IpcRequest {
  type: "event";
  event: AgentEvent;
}

export interface IpcResponse {
  ok: boolean;
  decision?: RadarDecision;
  error?: string;
}

export const ipcRequestSchema: z.ZodType<IpcRequest> = z.object({
  type: z.literal("event"),
  event: agentEventSchema,
});
