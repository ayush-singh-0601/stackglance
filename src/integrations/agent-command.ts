import { spawn } from "node:child_process";

import { CardInteractionController } from "../cards/interaction.js";
import { loadConfig } from "../config/store.js";
import type { CliContext } from "../cli/context.js";
import type { CliIo } from "../cli/run.js";
import type { AgentName, AgentState } from "../core/types.js";
import { findExecutable } from "../agents/detect.js";
import { StackGlanceDatabase } from "../storage/database.js";
import { TerminalCardOverlay } from "../terminal/overlay.js";
import { renderCard } from "../terminal/render.js";
import { runObservedCommand } from "../terminal/pty.js";
import { classifyAiderOutput } from "./aider.js";
import { pathWithoutShims } from "./shims.js";

export async function runAgentCommand(
  agent: AgentName,
  args: readonly string[],
  context: CliContext,
  io: CliIo,
): Promise<number> {
  const environment = {
    ...process.env,
    PATH: pathWithoutShims(process.env.PATH, context.paths.bin),
    STACKGLANCE_SHIM_ACTIVE: "1",
  };
  const executable = findExecutable(agent, { env: environment });
  if (executable === undefined) {
    io.stderr.write(
      `Unable to find the original ${agent} executable outside the StackGlance shim directory.\n`,
    );
    return 127;
  }
  const config = await loadConfig(context.paths.config);
  if (!config.enabled || !config.agents[agent]) return runInherited(executable, args, environment);

  const database = new StackGlanceDatabase(context.paths.database);
  let timer: NodeJS.Timeout | undefined;
  let busy = false;
  const shownStoryIds = new Set<string>();
  const output = process.stdout;
  let resizeAgent = (): void => undefined;
  const overlay = new TerminalCardOverlay(output, () => resizeAgent());
  const controller = new CardInteractionController({
    database,
    output,
    onHide: () => overlay.hide(),
  });

  const cancelTimer = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const requestRefreshIfDue = (): void => {
    const currentTime = context.now();
    const lastFetch = database.getMetadata("last_fetch");
    if (!isRefreshDue(lastFetch, config.sources.refreshMinutes, currentTime)) return;
    const lastRequest = database.getMetadata("refresh_requested_at");
    if (!isRefreshDue(lastRequest, 1 / 6, currentTime)) return;
    database.setMetadata("refresh_requested_at", currentTime.toISOString());
    startDetachedDaemon(context, environment);
  };
  const showNext = (): void => {
    if (!busy) return;
    const currentTime = context.now();
    let story = database.nextStory(currentTime, [...shownStoryIds]);
    if (story === undefined && shownStoryIds.size > 0) {
      shownStoryIds.clear();
      story = database.nextStory(currentTime);
    }
    if (story === undefined) {
      requestRefreshIfDue();
      timer = setTimeout(showNext, Math.min(config.display.quietDurationMs, 2_000));
      return;
    }
    let card = renderCard(story, { width: output.columns ?? 80 });
    if (!overlay.show(card)) {
      card = renderCard(story, { width: output.columns ?? 80, minimal: true });
      if (!overlay.show(card)) {
        timer = setTimeout(showNext, config.display.quietDurationMs);
        return;
      }
    }
    shownStoryIds.add(story.id);
    database.markStoryShown(story.id, currentTime);
    controller.show(story);
    timer = setTimeout(() => {
      controller.hide();
      if (busy) timer = setTimeout(showNext, config.display.quietDurationMs);
    }, config.display.cardDurationMs);
  };
  const enterState = (state: AgentState | undefined): void => {
    if (state === undefined) return;
    const attention = ["waiting_for_user", "user_typing", "finished", "error", "idle"].includes(
      state,
    );
    if (attention) {
      busy = false;
      cancelTimer();
      controller.hide();
      return;
    }
    if (!busy) {
      busy = true;
      timer = setTimeout(showNext, config.display.thinkingDelayMs);
    }
  };

  try {
    return await runObservedCommand(executable, observedAgentArguments(agent, args), {
      cwd: context.cwd ?? process.cwd(),
      env: environment,
      reservedRows: () => overlay.reservedRows,
      onStart: (control) => {
        resizeAgent = () => control.resize();
      },
      onResize: () => overlay.repaint(),
      onOutput: (value) => {
        enterState(classifyObservedOutput(agent, value));
        overlay.scheduleRepaint();
      },
      transformInput: (value) => {
        const transformed = controller.handleInput(value);
        busy = false;
        cancelTimer();
        if (transformed !== undefined && isPromptSubmission(transformed)) {
          requestRefreshIfDue();
          busy = true;
          timer = setTimeout(showNext, config.display.thinkingDelayMs);
        }
        return transformed;
      },
    });
  } catch {
    return runInherited(executable, args, environment);
  } finally {
    busy = false;
    cancelTimer();
    controller.hide();
    database.close();
  }
}

export function isRefreshDue(
  lastRefresh: string | undefined,
  refreshMinutes: number,
  now = new Date(),
): boolean {
  if (lastRefresh === undefined) return true;
  const timestamp = Date.parse(lastRefresh);
  return !Number.isFinite(timestamp) || now.getTime() - timestamp >= refreshMinutes * 60_000;
}

export function observedAgentArguments(
  agent: AgentName,
  args: readonly string[],
): readonly string[] {
  if (agent !== "codex" || args.includes("--no-alt-screen")) return args;
  return ["--no-alt-screen", ...args];
}

export function isPromptSubmission(value: string): boolean {
  return value.includes("\r") || value.includes("\n");
}

export function classifyObservedOutput(agent: AgentName, value: string): AgentState | undefined {
  if (agent === "aider") return classifyAiderOutput(value);
  const text = value.toLowerCase();
  if (/\b(waiting for|need clarification|would you like|permission|approve)\b/u.test(text))
    return "waiting_for_user";
  if (/\b(tests? passed|finished|complete|tokens used)\b/u.test(text)) return "waiting_for_user";
  if (/\b(running tests?|vitest|jest|pytest|cargo test)\b/u.test(text)) return "running_tests";
  if (/\b(building|compiling|cargo build|npm run build)\b/u.test(text)) return "building";
  if (/\b(installing|npm install|npm ci|pip install)\b/u.test(text)) return "installing";
  if (/\b(thinking|analyzing|reasoning|working|generating)\b/u.test(text)) return "agent_thinking";
  if (/\b(error|failed|exception)\b/u.test(text)) return "error";
  return undefined;
}

function runInherited(
  executable: string,
  args: readonly string[],
  environment: NodeJS.ProcessEnv,
): Promise<number> {
  return new Promise<number>((resolve) => {
    const child = spawn(executable, [...args], {
      stdio: "inherit",
      env: environment,
      windowsHide: false,
    });
    child.once("error", () => resolve(127));
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

function startDetachedDaemon(context: CliContext, environment: NodeJS.ProcessEnv): void {
  const entry = process.argv[1];
  if (entry === undefined) return;
  const child = spawn(process.execPath, [entry, "daemon"], {
    cwd: context.cwd ?? process.cwd(),
    env: environment,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}
