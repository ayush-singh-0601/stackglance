import { AGENTS, type AgentName } from "../core/types.js";
import { version } from "../meta.js";
import {
  setAgentEnabled,
  setFeedWeights,
  setGlobalEnabled,
  setPaused,
  showStatus,
} from "./commands/controls.js";
import { initialize } from "./commands/init.js";
import { explainById, runDoctor, saveById, showCatchup, showFeed, showImpact } from "./commands/intelligence.js";
import { runDaemonCommand } from "./commands/daemon.js";
import { runAgentCommand } from "../integrations/agent-command.js";
import { runHookCommand } from "../integrations/hook-command.js";
import { createCliContext, type CliContext } from "./context.js";

export interface CliWriter {
  write(chunk: string): unknown;
}

export interface CliIo {
  stdout: CliWriter;
  stderr: CliWriter;
}

const HELP = `DevRadar ${version}

Ambient developer intelligence for AI coding CLIs.

Usage:
  devradar <command> [options]

Commands:
  init       Detect agents and install integrations
  enable     Enable passive intelligence
  disable    Disable passive intelligence
  status     Show runtime and integration status
  pause      Temporarily hide passive cards
  resume     Resume passive cards
  catchup    Show news since the last session
  feed       Browse the current intelligence feed
  impact     Show news affecting the current project
  explain    Expand a radar card
  save       Save a radar card
  doctor     Diagnose installed integrations

Options:
  -h, --help       Show help
  -v, --version    Show version
`;

export async function runCli(
  args: readonly string[],
  io: CliIo,
  context: CliContext = createCliContext(),
): Promise<number> {
  const [command] = args;

  if (command === "--version" || command === "-v") {
    io.stdout.write(`${version}\n`);
    return 0;
  }

  if (command === undefined || command === "--help" || command === "-h" || command === "help") {
    io.stdout.write(HELP);
    return 0;
  }

  if (command === "init") return initialize(context.paths, io, { home: context.home ?? undefined });
  if (command === "enable" || command === "disable") {
    const agentIndex = args.indexOf("--agent");
    if (agentIndex >= 0) {
      const agent = args[agentIndex + 1];
      if (agent === undefined || !AGENTS.includes(agent as AgentName)) {
        io.stderr.write(`Invalid agent. Expected one of: ${AGENTS.join(", ")}\n`);
        return 2;
      }
      return setAgentEnabled(agent as AgentName, command === "enable", context, io);
    }
    return setGlobalEnabled(command === "enable", context, io);
  }
  if (command === "status") return showStatus(context, io);
  if (command === "pause") {
    const minutesIndex = args.indexOf("--minutes");
    const minutes = minutesIndex < 0 ? 60 : Number(args[minutesIndex + 1]);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1_440) {
      io.stderr.write("--minutes must be an integer from 1 to 1440.\n");
      return 2;
    }
    return setPaused(new Date(context.now().getTime() + minutes * 60_000), context, io);
  }
  if (command === "resume") return setPaused(null, context, io);
  if (command === "feed" && args.includes("--weights")) {
    const raw = args[args.indexOf("--weights") + 1];
    const weights = raw?.split(",").map(Number);
    if (weights?.length !== 3 || weights.some((value) => !Number.isInteger(value))) {
      io.stderr.write("--weights expects task,project,global integers.\n");
      return 2;
    }
    return setFeedWeights({ task: weights[0]!, project: weights[1]!, global: weights[2]! }, context, io);
  }
  if (command === "catchup") return showCatchup(context, io);
  if (command === "feed") return showFeed(context, io);
  if (command === "impact") return showImpact(context, io);
  if (command === "explain") return explainById(args[1], context, io);
  if (command === "save") return saveById(args[1], context, io);
  if (command === "doctor") return runDoctor(context, io);
  if (command === "daemon") return runDaemonCommand(context, io);
  if (command === "agent") {
    const agent = args[1];
    if (agent === undefined || !AGENTS.includes(agent as AgentName)) {
      io.stderr.write(`Invalid agent. Expected one of: ${AGENTS.join(", ")}\n`);
      return 2;
    }
    return runAgentCommand(agent as AgentName, args.slice(2), context, io);
  }
  if (command === "hook") {
    const agent = args[1];
    if (agent === undefined || !AGENTS.includes(agent as AgentName)) return 0;
    return runHookCommand(agent as AgentName, args[2], context, io);
  }

  io.stderr.write(`Unknown command: ${command}\nRun devradar --help for usage.\n`);
  return 2;
}
