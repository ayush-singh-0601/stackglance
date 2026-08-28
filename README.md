# StackGlance

StackGlance is an ambient developer-intelligence layer for AI coding CLIs. Install it once, enable it once, then keep using Codex, Claude Code, Gemini CLI, OpenCode, or Aider normally. During longer thinking, test, build, and install phases, StackGlance uses otherwise idle terminal time for compact task-, project-, and global-relevant updates. It gets out of the way as soon as the agent needs developer attention.

This repository implements the two included product requirements as a local-first Node.js CLI. The default path uses deterministic summaries and requires no model API key.

## Quick start

Requirements: Node.js 22.16 or newer.

```bash
npm install -g stackglance
stackglance init
```

Open a new terminal after setup, then run a supported coding agent exactly as before:

```bash
codex
claude
gemini
opencode
aider
```

`stackglance init` detects installed agents, creates private local state, installs idempotent native hooks/plugins where available, creates transparent shell shims, activates those shims in PowerShell/POSIX shell profiles, and enables passive intelligence. Codex requires reviewing newly installed user hooks once through `/hooks`, as required by Codex's hook trust model.

To stop passive cards globally:

```bash
stackglance disable
```

Manual intelligence commands continue to work while passive mode is disabled.

## Experience

Cards appear only after the configured 2–4 second busy threshold. The default is three seconds. A card stays for eight seconds, followed by twelve quiet seconds before another scope may rotate in.

```text
╭─ STACKGLANCE · PROJECT · OPEN SOURCE ─────────────────╮
│ Prisma introduces a faster query optimizer             │
│                                                       │
│ The release improves batching and removes unnecessary  │
│ database round trips. Existing APIs remain compatible. │
│                                                       │
│ Why it matters: This project currently uses Prisma.    │
│                                                       │
│ Relevance: 91%                                        │
│                                                       │
│ [E] Explain   [S] Save                                │
╰───────────────────────────────────────────────────────╯
```

Cards are hidden for typing, questions, permission requests, completion, and errors. Terminal content is sanitized before rendering, and ordinary input immediately restores priority to the coding agent.

## Commands

```text
stackglance init                         One-time detection and integration setup
stackglance enable                       Enable passive intelligence globally
stackglance disable                      Disable passive intelligence globally
stackglance enable --agent gemini        Enable one agent integration
stackglance disable --agent gemini       Disable one agent integration
stackglance pause --minutes 60           Temporarily silence cards
stackglance resume                       End quiet mode
stackglance feed --weights 45,30,25      Set task/project/global percentages
stackglance status                       Show persisted state and integrations
stackglance catchup                      Show news since the last session
stackglance feed                         Browse cached intelligence
stackglance impact                       Show items affecting the current project
stackglance explain <story-id>           Expand a card into progressive detail
stackglance save <story-id>              Save a story in local SQLite storage
stackglance doctor                       Diagnose state, storage, and integrations
```

## Intelligence pipeline

StackGlance safely collects RSS/Atom feeds, GitHub releases, OSV dependency advisories, and task/project-relevant arXiv results. Remote fetching is HTTPS-only and protected by exact host allowlists, public-address validation, pinned DNS resolution, redirect revalidation, timeouts, and response-size limits.

Raw items are normalized, canonicalized, deduplicated, expired, scored, and blended according to persistent weights. Repository relevance comes from local manifests such as `package.json`, `pyproject.toml`, `Cargo.toml`, and `go.mod`. Task text is normalized and redacted for credentials, emails, and local paths before tags are used.

Default sources and refresh frequency live in the YAML configuration. Collector failures are isolated; one unavailable source cannot interrupt an agent or discard successful results.

## Configuration

State is stored under `%LOCALAPPDATA%\StackGlance` on Windows or `$XDG_STATE_HOME/stackglance` on Unix. Set `STACKGLANCE_HOME` to isolate or relocate all state.

The generated `config.yaml` includes:

```yaml
enabled: true
feed:
  task: 45
  project: 30
  global: 25
display:
  thinkingDelayMs: 3000
  cardDurationMs: 8000
  quietDurationMs: 12000
summarizer:
  provider: deterministic
  model: deterministic-v1
sources:
  refreshMinutes: 30
```

For optional OpenAI summaries, set `summarizer.provider` and `summarizer.model`, then export `OPENAI_API_KEY`. StackGlance uses the Responses API with strict structured output and `store: false`; the key is read only from the environment and is never written to configuration or SQLite.

For local summaries, set the provider to `ollama`, choose a model, and set `endpoint` to an HTTP loopback address such as `http://127.0.0.1:11434`. Non-loopback Ollama endpoints are rejected.

## Integration strategy

StackGlance chooses the strongest available integration while keeping the same command-line experience:

1. Native lifecycle hooks for Codex, Claude Code, and Gemini CLI.
2. A global event plugin for OpenCode.
3. Aider's documented ready notification command plus PTY observation.
4. Transparent shell shims and a cross-platform pseudo-terminal observer as the universal display path.

All hook delivery is advisory and fail-open. If the local daemon is absent, hooks start it and retry briefly. If StackGlance, IPC, configuration, rendering, or a PTY bridge fails, the original agent is launched with inherited stdio and its exit status remains authoritative.

## Development

```bash
npm install
npm run verify
npm pack --dry-run
```

`npm run verify` runs ESLint, strict TypeScript checking, Vitest, declaration generation, and a packaged CLI smoke test. CI repeats verification on Windows, Linux, and macOS with Node 22.16.

See [architecture](docs/architecture.md) and the [security model](docs/security.md) for implementation details.

## Project status

StackGlance is currently version `0.1.0`. Live end-to-end behavior depends on the installed versions and trust/configuration policies of third-party coding CLIs; run `stackglance doctor` after upgrading an agent.

The project is currently marked `UNLICENSED`; no open-source license grant is implied.
