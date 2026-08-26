# Architecture

DevRadar separates agent observation from intelligence collection so failures in either path cannot interrupt the coding CLI.

```text
Agent hook/plugin/shim
        │
        ├── local JSON-line IPC ──> singleton daemon ──> state/visibility engine
        │                                      │
        └── transparent PTY ──> terminal card  └── SQLite story cache
                                                       ▲
RSS · GitHub · OSV · arXiv ──> normalize/rank/summarize┘
```

## Runtime

Adapters translate native lifecycle events into a shared state model. Events are ordered per agent/session, stale events are rejected, and visibility is evaluated against global state, per-agent state, quiet mode, attention priority, and the thinking threshold.

The daemon uses a per-user named pipe on Windows or Unix-domain socket elsewhere. A lock file enforces one daemon, stale leases are recovered, and hook commands auto-start the service. JSON messages are schema-validated and size-limited.

Transparent shell shims resolve the original executable after removing only the DevRadar shim directory from `PATH`. Enabled sessions use `node-pty`; any bridge failure falls back to an inherited-stdio child process.

## Intelligence

Collectors share a small `FeedCollector` interface. Each refresh uses `Promise.allSettled`, so failures remain source-local. Candidates receive stable IDs, canonical URLs, category-specific expiry, task/project/global relevance, and weighted feed placement.

The default summarizer is deterministic. Optional providers implement the same validated contract. Card assembly enforces the PRD's headline, summary, why-it-matters, and total word-density bounds before persistence.

## Persistence

YAML stores human-editable preferences. SQLite stores normalized card-ready stories, saves, and daemon metadata. Both locations are derived from one platform-aware state root and can be overridden with `DEVRADAR_HOME` for testing or isolation.
