import { loadConfig } from "../config/store.js";
import type { StackGlancePaths } from "../core/paths.js";
import type { GlanceDecision } from "../core/types.js";
import { StackGlanceDatabase } from "../storage/database.js";
import type { IpcRequest, IpcResponse } from "../daemon/protocol.js";
import { rotationAt } from "./rotation.js";
import { AgentSessionMachine } from "./state-machine.js";
import { evaluateVisibility } from "./visibility.js";

export function createStackGlanceHandler(
  paths: StackGlancePaths,
  now: () => Date = () => new Date(),
) {
  const sessions = new AgentSessionMachine();
  return async (request: IpcRequest): Promise<IpcResponse> => {
    try {
      const transition = sessions.transition(request.event);
      const config = await loadConfig(paths.config);
      const currentTime = now();
      const visibility = evaluateVisibility({
        config,
        event: transition.snapshot.event,
        stateEnteredAt: transition.snapshot.stateEnteredAt,
        now: currentTime,
      });
      if (!visibility.show) return { ok: true, decision: visibility };
      const elapsed = currentTime.getTime() - Date.parse(transition.snapshot.stateEnteredAt);
      const rotation = rotationAt(elapsed - config.display.thinkingDelayMs, config.display);
      if (!rotation.show || rotation.scope === undefined) {
        return { ok: true, decision: { show: false, reason: "calm rotation interval" } };
      }
      const database = new StackGlanceDatabase(paths.database);
      try {
        const story =
          database.nextStory(currentTime, [], 40, rotation.scope) ??
          database.nextStory(currentTime);
        if (story !== undefined) database.markStoryShown(story.id, currentTime);
        const decision: GlanceDecision =
          story === undefined
            ? { show: false, reason: "no cached intelligence" }
            : { show: true, reason: visibility.reason, story };
        return { ok: true, decision };
      } finally {
        database.close();
      }
    } catch (error) {
      return {
        ok: true,
        decision: {
          show: false,
          reason: `fail-open: ${error instanceof Error ? error.message : "runtime error"}`,
        },
      };
    }
  };
}
