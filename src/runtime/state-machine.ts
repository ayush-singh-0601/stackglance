import type { AgentEvent, AgentState } from "../core/types.js";

export interface SessionSnapshot {
  event: AgentEvent;
  previousState?: AgentState;
  stateEnteredAt: string;
  revision: number;
}

export interface TransitionResult {
  accepted: boolean;
  reason: string;
  snapshot: SessionSnapshot;
}

export class AgentSessionMachine {
  private readonly sessions = new Map<string, SessionSnapshot>();

  transition(event: AgentEvent): TransitionResult {
    const key = `${event.agent}:${event.session}`;
    const current = this.sessions.get(key);
    if (
      current !== undefined &&
      Date.parse(event.occurredAt) < Date.parse(current.event.occurredAt)
    ) {
      return { accepted: false, reason: "stale event", snapshot: current };
    }

    const stateChanged = current?.event.state !== event.state;
    const snapshot: SessionSnapshot = {
      event,
      ...(current === undefined ? {} : { previousState: current.event.state }),
      stateEnteredAt: stateChanged
        ? event.occurredAt
        : (current?.stateEnteredAt ?? event.occurredAt),
      revision: (current?.revision ?? 0) + 1,
    };
    this.sessions.set(key, snapshot);
    return { accepted: true, reason: stateChanged ? "state changed" : "state refreshed", snapshot };
  }

  get(agent: AgentEvent["agent"], session: string): SessionSnapshot | undefined {
    return this.sessions.get(`${agent}:${session}`);
  }

  remove(agent: AgentEvent["agent"], session: string): boolean {
    return this.sessions.delete(`${agent}:${session}`);
  }

  list(): SessionSnapshot[] {
    return [...this.sessions.values()];
  }
}
