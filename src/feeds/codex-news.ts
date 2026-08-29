import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { z } from "zod";

import { CATEGORIES, type RawStory } from "../core/types.js";
import type { FeedCollector } from "./types.js";

const MAX_OUTPUT_BYTES = 256 * 1024;
const DEFAULT_TIMEOUT_MS = 60_000;

const newsResponseSchema = z.object({
  stories: z
    .array(
      z.object({
        source: z.string().min(1).max(100),
        url: z.url().refine((value) => value.startsWith("https://"), "HTTPS URL required"),
        title: z.string().min(1).max(300),
        summary: z.string().min(1).max(1_500),
        category: z.enum(CATEGORIES),
        publishedAt: z.iso.datetime(),
      }),
    )
    .max(10),
});

const outputSchema = {
  type: "object",
  properties: {
    stories: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          source: { type: "string" },
          url: { type: "string" },
          title: { type: "string" },
          summary: { type: "string" },
          category: { type: "string", enum: CATEGORIES },
          publishedAt: { type: "string" },
        },
        required: ["source", "url", "title", "summary", "category", "publishedAt"],
        additionalProperties: false,
      },
    },
  },
  required: ["stories"],
  additionalProperties: false,
} as const;

export interface CodexUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
}

export interface CodexNewsCollectorOptions {
  executable: string;
  workDirectory: string;
  technologies?: readonly string[];
  maxStories: number;
  maxAgeHours: number;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  onUsage?: (usage: CodexUsage) => void;
  execute?: (request: CodexExecutionRequest) => Promise<CodexExecutionResult>;
}

export interface CodexExecutionRequest {
  executable: string;
  workDirectory: string;
  schemaPath: string;
  prompt: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
}

export interface CodexExecutionResult {
  finalMessage: string;
  usage?: CodexUsage;
}

export class CodexNewsCollector implements FeedCollector {
  readonly name = "Codex live news";

  constructor(private readonly options: CodexNewsCollectorOptions) {}

  async collect(now = new Date()): Promise<RawStory[]> {
    await mkdir(this.options.workDirectory, { recursive: true, mode: 0o700 });
    const schemaPath = join(this.options.workDirectory, "codex-news-output.schema.json");
    await writeFile(schemaPath, `${JSON.stringify(outputSchema)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    const execute = this.options.execute ?? executeCodex;
    const result = await execute({
      executable: this.options.executable,
      workDirectory: this.options.workDirectory,
      schemaPath,
      prompt: buildPrompt(this.options, now),
      env: this.options.env ?? process.env,
      timeoutMs: this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });
    if (result.usage !== undefined) this.options.onUsage?.(result.usage);

    const parsed = newsResponseSchema.parse(JSON.parse(result.finalMessage));
    const oldest = now.getTime() - this.options.maxAgeHours * 60 * 60 * 1_000;
    const newest = now.getTime() + 60 * 60 * 1_000;
    return parsed.stories
      .filter((story) => {
        const published = Date.parse(story.publishedAt);
        return published >= oldest && published <= newest;
      })
      .slice(0, this.options.maxStories)
      .map((story) => ({
        source: story.source,
        sourceId: story.url,
        url: story.url,
        title: story.title,
        body: story.summary,
        category: story.category,
        publishedAt: story.publishedAt,
        fetchedAt: now.toISOString(),
        metadata: { collectedBy: "codex", aiAssisted: true },
      }));
  }
}

export async function executeCodex(request: CodexExecutionRequest): Promise<CodexExecutionResult> {
  const args = [
    "--search",
    "--ask-for-approval",
    "never",
    "exec",
    "--ephemeral",
    "--json",
    "--ignore-user-config",
    "--sandbox",
    "read-only",
    "--skip-git-repo-check",
    "--output-schema",
    request.schemaPath,
    "-c",
    'model_reasoning_effort="low"',
    "-",
  ];
  const jsonl = await runProcess(request.executable, args, request);
  return parseCodexJsonl(jsonl);
}

export function parseCodexJsonl(value: string): CodexExecutionResult {
  let finalMessage: string | undefined;
  let usage: CodexUsage | undefined;
  for (const line of value.split(/\r?\n/u).filter(Boolean)) {
    const event = JSON.parse(line) as Record<string, unknown>;
    if (event.type === "item.completed") {
      const item = asRecord(event.item);
      if (item.type === "agent_message" && typeof item.text === "string") {
        finalMessage = item.text;
      }
    }
    if (event.type === "turn.completed") {
      const raw = asRecord(event.usage);
      usage = {
        inputTokens: finiteNumber(raw.input_tokens),
        cachedInputTokens: finiteNumber(raw.cached_input_tokens),
        outputTokens: finiteNumber(raw.output_tokens),
        reasoningOutputTokens: finiteNumber(raw.reasoning_output_tokens),
      };
    }
  }
  if (finalMessage === undefined) throw new Error("Codex returned no final news response");
  return { finalMessage, ...(usage === undefined ? {} : { usage }) };
}

function buildPrompt(options: CodexNewsCollectorOptions, now: Date): string {
  const technologies = (options.technologies ?? [])
    .map((value) =>
      value
        .replace(/[^a-z0-9 .+#-]/giu, " ")
        .replace(/\s+/gu, " ")
        .trim(),
    )
    .filter(Boolean)
    .slice(0, 8)
    .join(", ");
  return [
    `Find up to ${options.maxStories} significant software engineering, AI, developer-tool, open-source, model, research, or security news items published within the last ${options.maxAgeHours} hours as of ${now.toISOString()}.`,
    "Use live web search. Prefer the original publisher, project, advisory, or paper page over aggregators.",
    "Return only independently verifiable items with an HTTPS URL and publication timestamp. Do not invent or repeat stories.",
    "Keep each summary factual and under 55 words. Return only the requested JSON object.",
    technologies === "" ? "" : `Prioritize when genuinely relevant to: ${technologies}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

function runProcess(
  executable: string,
  args: readonly string[],
  request: CodexExecutionRequest,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const launch = codexLaunch(executable, args);
    const child = spawn(launch.executable, launch.args, {
      cwd: request.workDirectory,
      env: request.env,
      windowsHide: true,
      shell: launch.shell,
      stdio: ["pipe", "pipe", "ignore"],
    });
    let output = "";
    let settled = false;
    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error === undefined) resolve(output);
      else reject(error);
    };
    const timeout = setTimeout(() => {
      child.kill();
      finish(new Error("Codex news collection timed out"));
    }, request.timeoutMs);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      output += chunk;
      if (Buffer.byteLength(output, "utf8") > MAX_OUTPUT_BYTES) {
        child.kill();
        finish(new Error("Codex news response exceeded the size limit"));
      }
    });
    child.once("error", (error) => finish(error));
    child.once("exit", (code) => {
      if (code === 0) finish();
      else finish(new Error(`Codex news collection exited with code ${code ?? "unknown"}`));
    });
    child.stdin.end(request.prompt);
  });
}

function codexLaunch(
  executable: string,
  args: readonly string[],
): { executable: string; args: string[]; shell: boolean } {
  if (process.platform !== "win32" || !/\.(?:cmd|bat)$/iu.test(executable)) {
    return { executable, args: [...args], shell: false };
  }

  // npm's Windows launcher is a batch file. Prefer its JavaScript entry point
  // so paths and arguments never pass through command-shell interpolation.
  const npmEntry = join(dirname(executable), "node_modules", "@openai", "codex", "bin", "codex.js");
  if (existsSync(npmEntry)) {
    return { executable: process.execPath, args: [npmEntry, ...args], shell: false };
  }
  return { executable, args: [...args], shell: true };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}
