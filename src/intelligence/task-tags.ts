const SECRET_PATTERNS: readonly RegExp[] = [
  /\b(?:sk|gh[oprsu])[-_][a-z0-9_-]{12,}\b/giu,
  /\beyJ[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+\b/giu,
  /\b(?:api[-_ ]?key|token|password|secret)\s*[:=]\s*\S+/giu,
  /\bBearer\s+\S+/giu,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
  /\b[A-Za-z]:\\(?:[^\s\\]+\\)*[^\s\\]*/gu,
  /(?:^|\s)\/(?:[^\s/]+\/)+[^\s/]*/gu,
];

const STOP_WORDS = new Set([
  "add",
  "and",
  "build",
  "change",
  "create",
  "fix",
  "for",
  "from",
  "implement",
  "into",
  "our",
  "refactor",
  "the",
  "this",
  "update",
  "with",
]);

export interface TaskTags {
  redacted: string;
  tags: readonly string[];
}

export function extractTaskTags(task: string, limit = 12): TaskTags {
  let redacted = task.normalize("NFKC").replace(/[\r\n\t]+/gu, " ").trim();
  for (const pattern of SECRET_PATTERNS) redacted = redacted.replace(pattern, " [redacted] ");
  redacted = redacted.replace(/\s+/gu, " ").trim().slice(0, 1_000);

  const tags = [
    ...new Set(
      redacted
        .toLowerCase()
        .match(/[a-z][a-z0-9.+#-]{2,}/gu)
        ?.filter((word) => word !== "redacted" && !STOP_WORDS.has(word)) ?? [],
    ),
  ].slice(0, limit);
  return { redacted, tags };
}
