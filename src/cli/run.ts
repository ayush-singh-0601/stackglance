import { AGENTS, type AgentName } from "../core/types.js";
import { version } from "../meta.js";
import { setAgentEnabled, setGlobalEnabled, showStatus } from "./commands/controls.js";
import { initialize } from "./commands/init.js";
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

  if (command === "init") return initialize(context.paths, io);
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

  io.stderr.write(`Unknown command: ${command}\nRun devradar --help for usage.\n`);
  return 2;
}
