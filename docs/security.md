# Security and privacy model

StackGlance treats news content, agent output, hook payloads, repository manifests, and task text as untrusted input.

## Network boundary

- Feed URLs require HTTPS, port 443, and an exact configured hostname.
- DNS must resolve exclusively to public addresses. The chosen address is pinned into the TLS request to reduce rebinding risk.
- Every redirect repeats URL and DNS validation. POST requests cannot redirect.
- Requests have time, body, redirect, and response-size limits.
- Ollama is a separate local-only path and accepts HTTP loopback addresses only.

## Terminal boundary

External text is normalized and control characters are removed before rendering. Cards respect terminal width. Developer input immediately hides the active card; E and S are intercepted only while a card explicitly advertises those actions.

## Local data

- State directories and configuration are created with user-only modes where the platform honors them.
- YAML writes are atomic, and SQLite statements are parameterized.
- OpenAI keys are read from `OPENAI_API_KEY`; GitHub tokens are read from `GITHUB_TOKEN`. Neither is persisted.
- Task text is redacted for common credential forms, bearer tokens, JWTs, emails, and local paths before relevance tagging.
- Transcript files exposed by agent hooks are never opened.

## Availability

Agent hooks always return success. IPC failure, source failure, summarizer failure, malformed content, daemon failure, and PTY failure degrade to no card or the original inherited-stdio agent process. StackGlance does not make agent permissions or tool decisions.

Run `stackglance doctor` to check configuration, storage, detection, and installed integration files.
