import { spawn } from "node:child_process";

import { CardInteractionController } from "../cards/interaction.js";
import { loadConfig } from "../config/store.js";
import type { CliContext } from "../cli/context.js";
import type { CliIo } from "../cli/run.js";
import type { AgentName, AgentState, Story } from "../core/types.js";
import { findExecutable } from "../agents/detect.js";
import { StackGlanceDatabase } from "../storage/database.js";
import { clearRenderedCard, renderCard } from "../terminal/render.js";
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
  let renderedLines = 0;
  let storyIndex = 0;
  const output = process.stdout;
  const controller = new CardInteractionController({
    database,
    output,
    onHide: () => {
      if (renderedLines > 0) output.write(clearRenderedCard(renderedLines));
      renderedLines = 0;
    },
  });

  const cancelTimer = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const showNext = (): void => {
    if (!busy) return;
    const stories = database.listStories(context.now());
    if (stories.length === 0) {
      timer = setTimeout(showNext, Math.min(config.display.quietDurationMs, 2_000));
      return;
    }
    const story = stories[storyIndex % stories.length] as Story;
    storyIndex += 1;
    const card = renderCard(story, { width: output.columns ?? 80 });
    output.write(`\n${card.text}`);
    renderedLines = card.lines;
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
      onOutput: (value) => enterState(classifyObservedOutput(agent, value)),
      transformInput: (value) => {
        const transformed = controller.handleInput(value);
        busy = false;
        cancelTimer();
        if (transformed !== undefined && isPromptSubmission(transformed)) {
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
