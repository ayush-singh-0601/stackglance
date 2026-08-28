# StackGlance — Updated Runtime & Integration Requirements

## Core UX Principle

StackGlance must behave as a **persistent intelligence layer for AI coding CLIs**.

The developer should **not need to manually start StackGlance whenever they open Codex, Claude Code, Gemini CLI, OpenCode, Aider, or another supported coding agent**.

There should only be a one-time activation.

```bash
stackglance enable
```

After activation, StackGlance automatically works whenever a supported AI CLI is used.

To turn it off:

```bash
stackglance disable
```

This preference persists across:

- terminal sessions
- repositories
- computer restarts
- supported AI CLI sessions

---

# 1. Installation Experience

Install:

```bash
npm install -g stackglance
```

Initial setup:

```bash
stackglance init
```

Example:

```text
StackGlance Setup

Detected:

✓ Codex CLI
✓ Claude Code
✓ Gemini CLI

News sources configured.

Project intelligence enabled.

Enable StackGlance automatically
for supported AI coding CLIs?

> Yes
```

This effectively performs:

```bash
stackglance enable
```

From this point forward, the developer does not need to run another StackGlance command during normal usage.

---

# 2. Persistent Modes

There are only two primary runtime states.

## Enabled

```bash
stackglance enable
```

Meaning:

> Automatically activate StackGlance whenever I use a supported AI coding CLI.

Persist locally:

```json
{
  "enabled": true
}
```

---

## Disabled

```bash
stackglance disable
```

Meaning:

> Do not display StackGlance inside any AI coding CLI.

Persist:

```json
{
  "enabled": false
}
```

The developer can still manually use commands such as:

```bash
stackglance catchup
stackglance feed
stackglance impact
```

but passive AI-CLI integration remains disabled.

---

# 3. Normal User Experience

Once enabled, the user simply uses their coding tool normally.

```bash
codex
```

No:

```bash
stackglance start
```

No:

```bash
stackglance watch
```

No:

```bash
stackglance codex
```

No additional command should be required.

---

# 4. Agent-State Awareness

StackGlance should understand the current state of the coding agent.

Possible states:

```text
IDLE
USER_TYPING
AGENT_THINKING
AGENT_GENERATING
RUNNING_COMMAND
RUNNING_TESTS
BUILDING
INSTALLING
WAITING_FOR_TOOL
WAITING_FOR_USER
FINISHED
ERROR
```

The most important state is:

```text
AGENT_THINKING
```

This is when StackGlance gets screen time.

---

# 5. Thinking-Time Experience

Example:

```text
$ codex

> Refactor the authentication system

⠋ Thinking...
```

StackGlance detects:

```text
STATE = AGENT_THINKING
```

After a short delay:

```text
⠋ Thinking...

╭─ STACKGLANCE ────────────────────────────╮
│ 🎯 RELATED                            │
│                                       │
│ Better Auth released a new session    │
│ management API.                       │
│                                       │
│ Relevant to your current task: 93%    │
│                                       │
│ [E] Explain   [S] Save                │
╰───────────────────────────────────────╯
```

The coding agent continues working underneath.

---

# 6. Unrelated News During Thinking

Not every card needs to relate to the current project.

StackGlance should alternate between:

```text
TASK
PROJECT
GLOBAL
```

Example:

```text
⠙ Thinking...

╭─ STACKGLANCE · AI ──────────────────────╮
│ New open-source coding model          │
│ released today.                       │
│                                       │
│ • 14B parameters                      │
│ • local inference                     │
│ • strong coding benchmark             │
│                                       │
│ 🌍 Global technology news             │
╰───────────────────────────────────────╯
```

Later:

```text
⠹ Running tests...

╭─ STACKGLANCE · PROJECT ─────────────────╮
│ Playwright introduced a new browser   │
│ testing capability.                   │
│                                       │
│ Your repository uses Playwright.      │
│ Relevance: HIGH                       │
╰───────────────────────────────────────╯
```

---

# 7. StackGlance Must Disappear When the Agent Needs Attention

Suppose Codex finishes thinking:

```text
✓ Analysis complete

I need clarification:

Should authentication support
Google OAuth as well?
```

StackGlance immediately removes/hides its card.

```text
STACKGLANCE → HIDDEN
```

Priority should always be:

```text
Developer input
      ↓
Coding agent
      ↓
StackGlance
```

StackGlance must never obscure an important agent question.

---

# 8. Display Priority

Recommended:

```text
AGENT_THINKING

        ↓

StackGlance allowed
```

```text
RUNNING_TESTS

        ↓

StackGlance allowed
```

```text
BUILDING / INSTALLING

        ↓

StackGlance allowed
```

```text
AGENT_GENERATING

        ↓

Optional minimal cards
```

But:

```text
WAITING_FOR_USER

        ↓

StackGlance hidden
```

and:

```text
USER_TYPING

        ↓

StackGlance hidden
```

---

# 9. Minimum Thinking Threshold

Do not instantly show news whenever the model thinks for 500 milliseconds.

That would create visual noise.

Instead:

```text
Agent begins thinking
        ↓
Wait ~2-4 seconds
        ↓
Still thinking?
   ↓          ↓
 YES          NO
 ↓
show card
```

This means quick agent responses remain clean.

Example:

```text
Thinking: 1.2 seconds

→ No StackGlance
```

But:

```text
Thinking: 12 seconds

→ Show StackGlance
```

---

# 10. Long Agent Operations

If an operation lasts a long time:

```text
Agent analyzing repository...

30 seconds
```

StackGlance could rotate information slowly.

```text
0-8 sec
TASK RADAR

8-20 sec
nothing

20-30 sec
GLOBAL RADAR
```

Never create:

```text
news
news
news
news
news
```

The system should feel calm rather than like a stock ticker.

---

# 11. Example Complete Session

User:

```bash
codex
```

Codex:

```text
> Add caching to our API.
```

Codex:

```text
⠋ Analyzing repository...
```

StackGlance:

```text
╭─ PROJECT RADAR ──────────────────────╮
│ Redis 9 released                     │
│                                      │
│ Your project currently uses Redis.   │
│                                      │
│ [E] Explain                          │
╰──────────────────────────────────────╯
```

Codex:

```text
⠹ Inspecting API routes...
```

StackGlance remains unobtrusive.

Codex starts tests:

```text
⠙ Running tests...
```

StackGlance:

```text
╭─ AI RADAR ──────────────────────────╮
│ New coding-agent benchmark          │
│ published today.                    │
│                                     │
│ 🌍 Global                           │
╰─────────────────────────────────────╯
```

Codex:

```text
✓ Tests passed

I changed:

src/api/cache.ts
src/lib/redis.ts

Would you like me to benchmark the
old and new implementation?
```

StackGlance disappears.

---

# 12. How Automatic Activation Works

The architecture should contain:

```text
             StackGlance Core
                   │
         ┌─────────┴──────────┐
         │                    │
    Agent Detection      News Engine
         │                    │
         ↓                    ↓
  Session Adapter       Intelligence
         │
 ┌───────┼────────┐
 ↓       ↓        ↓

Codex   Claude   Gemini
```

During:

```bash
stackglance init
```

StackGlance installs lightweight integrations for detected coding CLIs.

These integrations communicate with the local StackGlance service automatically.

---

# 13. Transparent CLI Integration

The user should continue typing:

```bash
codex
```

rather than:

```bash
stackglance codex
```

Internally, StackGlance can use the best integration available for each agent.

Priority:

```text
1. Native hooks/events
        ↓
2. Plugin/extension API
        ↓
3. Shell integration
        ↓
4. Process/session observation
```

The implementation can differ between coding agents while maintaining identical UX.

---

# 14. Shell-Level Integration

For CLIs without sufficient extension APIs, StackGlance's one-time setup may install shell integrations.

Conceptually:

```text
User types:

codex
```

The shell integration transparently connects the resulting session to:

```text
StackGlance Session Observer
```

The developer still experiences:

```bash
codex
```

normally.

This configuration happens once during:

```bash
stackglance init
```

not for every session.

---

# 15. Local StackGlance Service

StackGlance runs a very lightweight local service.

Example:

```text
stackglance-daemon
```

Responsibilities:

```text
Detect active agent sessions

Receive agent state

Determine current repository

Determine current task

Fetch cached intelligence

Rank stories

Render relevant cards

Store preferences
```

It can automatically start when required instead of permanently consuming significant resources.

---

# 16. Auto-Start Strategy

StackGlance should minimize background resource usage.

Preferred behavior:

```text
AI CLI starts
      ↓
StackGlance wakes
      ↓
Session active
      ↓
StackGlance works
      ↓
AI CLI exits
      ↓
StackGlance returns to idle
```

The intelligence/news collector can periodically update a local cache independently.

---

# 17. State Communication

An AI CLI adapter could send:

```json
{
  "agent": "codex",
  "state": "thinking",
  "cwd": "/projects/shop",
  "task": "Implement Redis caching",
  "session": "abc123"
}
```

StackGlance responds:

```json
{
  "show": true,
  "type": "project",
  "headline": "Redis releases new feature...",
  "relevance": 0.91
}
```

Once:

```json
{
  "state": "waiting_for_user"
}
```

StackGlance responds:

```json
{
  "show": false
}
```

---

# 18. Universal Integration Goal

The final experience should be identical across:

```text
Codex CLI
Claude Code
Gemini CLI
OpenCode
Aider
future AI coding CLIs
```

Example:

```bash
codex
```

Works automatically.

```bash
claude
```

Works automatically.

```bash
gemini
```

Works automatically.

```bash
opencode
```

Works automatically.

One StackGlance installation controls everything.

---

# 19. Global On/Off

Main commands:

```bash
stackglance enable
```

```bash
stackglance disable
```

Optional:

```bash
stackglance status
```

Example:

```text
StackGlance

Status: ENABLED

Integrations:

✓ Codex
✓ Claude Code
✓ Gemini CLI
✓ OpenCode

Passive intelligence:
ON

Thinking-time cards:
ON
```

---

# 20. Per-Agent Controls

Advanced users can disable only one integration.

```bash
stackglance disable --agent gemini
```

while leaving:

```text
Codex       ON
Claude      ON
Gemini      OFF
OpenCode    ON
```

Enable again:

```bash
stackglance enable --agent gemini
```

This is optional functionality and should not complicate initial setup.

---

# 21. Temporary Quiet Mode

Sometimes users may want one clean session without permanently disabling StackGlance.

Optional:

```bash
stackglance pause
```

Then:

```bash
stackglance resume
```

But these are secondary controls.

Normal users should only need:

```text
stackglance enable

        or

stackglance disable
```

---

# 22. Feed Selection Remains Persistent

Users configure this once:

```yaml
feed:
  task: 45
  project: 30
  global: 25
```

Every supported AI CLI automatically follows those preferences.

They don't need:

```bash
stackglance --mode mixed
```

for every session.

---

# 23. Core UX Rule

The ultimate UX should feel as though StackGlance is a capability built directly into the coding agent.

The developer should think:

```text
"I installed StackGlance."
```

Not:

```text
"I have to run StackGlance."
```

---

# 24. Revised Product Flow

```text
INSTALL ONCE

npm install -g stackglance

        ↓

SET UP ONCE

stackglance init

        ↓

ENABLE ONCE

stackglance enable

        ↓

┌─────────────────────────────────────┐
│              FROM NOW ON            │
└─────────────────────────────────────┘

Developer opens any supported AI CLI

        ↓

StackGlance automatically detects it

        ↓

Agent receives a task

        ↓

Agent starts thinking

        ↓

StackGlance waits briefly

        ↓

Task / Project / Global intelligence

        ↓

Agent requires user attention

        ↓

StackGlance disappears

        ↓

Agent thinks again

        ↓

StackGlance can return
```

---

# 25. Revised Product Positioning

StackGlance is not something the developer actively operates throughout the day.

It should function as:

> **An ambient developer-intelligence layer that automatically appears during otherwise idle moments in AI coding workflows.**

The core interaction becomes beautifully simple:

```text
Install once.
Enable once.
Use Codex/Claude/Gemini normally.
Learn while the AI thinks.
```

That should be one of the defining UX principles of the product.