# Architecture

StackGlance separates agent observation from intelligence collection so failures in either path cannot interrupt the coding CLI.

```text
Agent hook/plugin/shim
        │
        ├── local JSON-line IPC ──> singleton daemon ──> state/visibility engine
        │                                      │
        └── transparent PTY ──> terminal card  └── SQLite story cache
                                                       ▲
RSS · GitHub · OSV · arXiv · opt-in Codex ──> normalize/rank/summarize┘
```

## Runtime

Adapters translate native lifecycle events into a shared state model. Events are ordered per agent/session, stale events are rejected, and visibility is evaluated against global state, per-agent state, quiet mode, attention priority, and the thinking threshold.

The daemon uses a per-user named pipe on Windows or Unix-domain socket elsewhere. A lock file enforces one daemon, stale leases are recovered, and hook commands auto-start the service. JSON messages are schema-validated and size-limited.

Transparent shell shims resolve the original executable after removing only the StackGlance shim directory from `PATH`. Enabled sessions use `node-pty`; any bridge failure falls back to an inherited-stdio child process.

Prompt submission starts a 3-second display threshold. A busy turn then follows a 13-second rotation period: an 8-second card and a 5-second quiet interval. SQLite impressions plus an in-session exclusion set keep the rotation from restarting at the same story. When collection is due, the wrapper asks the detached singleton daemon to refresh without blocking terminal input.

## Intelligence

Collectors share a small `FeedCollector` interface. Each refresh uses `Promise.allSettled`, so failures remain source-local. Candidates receive stable IDs, canonical URLs, category-specific expiry, task/project/global relevance, and weighted feed placement.

The default summarizer is deterministic. Optional providers implement the same validated contract. Card assembly enforces the PRD's headline, summary, why-it-matters, and total word-density bounds before persistence.

The optional Codex collector launches `codex exec` outside the wrapped executable path with live search, ephemeral state, a read-only sandbox, low reasoning effort, and a strict JSON schema. It is disabled by default and guarded by per-day run and reported-token budgets. Its results enter the same normalization, deduplication, recency, ranking, and source-local failure pipeline as direct collectors.

## Persistence

YAML stores human-editable preferences. SQLite stores normalized card-ready stories, saves, display impressions, collection budgets, and daemon metadata. Both locations are derived from one platform-aware state root and can be overridden with `STACKGLANCE_HOME` for testing or isolation.
