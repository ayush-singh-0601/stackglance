<div align="center">
  <img src="https://raw.githubusercontent.com/ayush-singh-0601/stackglance/main/assets/stackglance-hero.svg" alt="StackGlance — ambient developer intelligence for AI coding CLIs" width="100%" />

  <br />

[![npm version](https://img.shields.io/npm/v/stackglance?style=flat-square&color=6366f1)](https://www.npmjs.com/package/stackglance)
[![CI](https://img.shields.io/github/actions/workflow/status/ayush-singh-0601/stackglance/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/ayush-singh-0601/stackglance/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A522.16-22c55e?style=flat-square)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-f59e0b?style=flat-square)](LICENSE)

**Stay current without leaving your coding flow.**

[Quick start](#quick-start) · [Real example](#a-real-example-not-a-mock) · [Commands](#commands) · [How it works](#how-it-works)
</div>

StackGlance is a local-first intelligence layer for AI coding terminals. While your coding agent is thinking, testing, building, or installing, StackGlance uses that idle screen time to show compact updates relevant to your task and repository. The card disappears as soon as you type or the agent needs attention.

No dashboard. No workflow change. No model API key required by default.

## Why StackGlance

| Without StackGlance                                                     | With StackGlance                                                      |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Release notes, advisories, and ecosystem changes live in separate tabs. | Relevant signals arrive inside the terminal you already use.          |
| Generic feeds create noise.                                             | Task, manifests, dependencies, and saved preferences shape relevance. |
| Background tools can interrupt the agent.                               | Cards are advisory, input-aware, and fail open.                       |

Works with **Codex**, **Claude Code**, **Gemini CLI**, **OpenCode**, and **Aider**.

## Quick start

Requires Node.js 22.16 or newer.

```bash
npm install -g stackglance
stackglance init
```

Open a new terminal, then launch your coding agent exactly as you do today:

```bash
codex        # or: claude, gemini, opencode, aider
```

That is the complete setup. `stackglance init` detects supported agents, creates private local state, installs the strongest available integration, and enables passive intelligence. Codex users review newly installed user hooks once through `/hooks`, following Codex's trust flow.

Useful first checks:

```bash
stackglance status
stackglance doctor
stackglance impact
```

## A real example, not a mock

On **28 August 2026**, StackGlance ran against this repository while the task was `Fix Linux CI paths and publish StackGlance`. The live pipeline collected **1,083** items from its configured sources, stored the top **25**, and completed with **0 collector errors**.

It matched this repository's Vitest dependency to a real OSV advisory and rendered:

```text
╭─ STACKGLANCE · PROJECT · SECURITY ───────────────────────────────────╮
│ GHSA-5xrq-8626-4rwp flags a security issue in vitest                 │
│                                                                      │
│ OSV published GHSA-5xrq-8626-4rwp for vitest. Check the affected     │
│ version range, exposure conditions, and patched releases before      │
│ deciding whether this repository requires an immediate dependency    │
│ upgrade.                                                             │
│                                                                      │
│ Why it matters: This project uses vitest; verify the installed       │
│ version and remediation.                                             │
│                                                                      │
│ Priority: HIGH                                                       │
│                                                                      │
│ [E] Explain   [S] Save                                               │
╰──────────────────────────────────────────────────────────────────────╯
```

The useful outcome was not a reflexive upgrade. The [advisory](https://github.com/advisories/GHSA-5xrq-8626-4rwp) showed that affected Vitest 3.x releases were patched in `3.2.6`; this repository's lockfile resolved `3.2.7`, so the developer could confirm it was already remediated and continue the release without an unnecessary dependency change. See the [captured OSV record](https://osv.dev/vulnerability/GHSA-5xrq-8626-4rwp).

The repository includes the exact [capture script](scripts/capture-readme-example.mjs). It builds isolated temporary state and cleans it afterward; because it queries live sources, future rankings and counts will naturally change.

```bash
npm run build
node scripts/capture-readme-example.mjs
```

## Commands

| Command                          | What it does                                    |
| -------------------------------- | ----------------------------------------------- |
| `stackglance init`               | Detect agents and install integrations once.    |
| `stackglance status`             | Show persisted state and integration status.    |
| `stackglance impact`             | Show current items that affect this project.    |
| `stackglance catchup`            | Review news since the previous session.         |
| `stackglance feed`               | Browse cached intelligence.                     |
| `stackglance explain <story-id>` | Expand a card into technical detail and impact. |
| `stackglance save <story-id>`    | Save a useful story locally.                    |
| `stackglance pause --minutes 60` | Silence passive cards temporarily.              |
| `stackglance resume`             | End quiet mode.                                 |
| `stackglance enable` / `disable` | Control passive intelligence globally.          |
| `stackglance doctor`             | Diagnose state, storage, and integrations.      |

Adjust the task/project/global mix at any time:

```bash
stackglance feed --weights 45,30,25
```

## How it works

```text
RSS / GitHub / OSV / arXiv
            │
            ▼
  normalize · deduplicate · expire
            │
            ▼
 task + repository relevance scoring
            │
            ▼
 compact card during agent idle time
```

StackGlance reads local manifests such as `package.json`, `pyproject.toml`, `Cargo.toml`, and `go.mod`. It safely collects RSS/Atom feeds, GitHub releases, OSV advisories, and relevant arXiv results, then normalizes, deduplicates, scores, and stores the most useful items in local SQLite.

The default deterministic summarizer is API-key-free. Optional OpenAI and local Ollama summarizers are supported through configuration.

## Designed to stay out of the way

- **Input-aware:** cards are hidden for typing, questions, permissions, completion, and errors.
- **Fail-open:** integration, daemon, IPC, or rendering failures never replace the agent's exit status.
- **Local-first:** configuration, cached stories, and preferences stay in local state.
- **Defensive fetching:** HTTPS allowlists, public-address validation, pinned DNS, redirect checks, timeouts, and response-size limits protect remote collection.
- **Privacy-conscious:** task context is normalized and redacted before tags are used; OpenAI summaries use structured output with `store: false`.

State lives under `%LOCALAPPDATA%\StackGlance` on Windows or `$XDG_STATE_HOME/stackglance` on Unix. Set `STACKGLANCE_HOME` to isolate or relocate it.

<details>
<summary><strong>Configuration example</strong></summary>

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

For OpenAI summaries, set the provider and model, then export `OPENAI_API_KEY`. For Ollama, use an HTTP loopback endpoint such as `http://127.0.0.1:11434`; non-loopback endpoints are rejected.

</details>

## Development

```bash
git clone https://github.com/ayush-singh-0601/stackglance.git
cd stackglance
npm install
npm run verify
npm pack --dry-run
```

CI verifies Windows, Linux, and macOS on Node 22.16. Read the [architecture](docs/architecture.md) and [security model](docs/security.md) before making larger changes.

## License

StackGlance is open source under the [MIT License](LICENSE).
