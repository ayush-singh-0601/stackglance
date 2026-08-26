import type { Story } from "../core/types.js";

export interface RenderOptions {
  width?: number;
  minimal?: boolean;
}

export interface RenderedCard {
  text: string;
  lines: number;
  width: number;
}

export function renderCard(story: Story, options: RenderOptions = {}): RenderedCard {
  const width = Math.max(40, Math.min(120, options.width ?? process.stdout.columns ?? 80));
  const inner = width - 4;
  const label = `${story.scope.toUpperCase()} RADAR · ${categoryLabel(story.category)}`;
  const top = `╭─ ${truncate(label, width - 7)} ${"─".repeat(Math.max(0, width - label.length - 5))}╮`;
  const lines: string[] = [top, ...boxed(wrap(story.headline, inner), inner), empty(inner)];
  if (!options.minimal) {
    lines.push(...boxed(wrap(story.summary, inner), inner), empty(inner));
    lines.push(...boxed(wrap(`Why it matters: ${story.whyItMatters}`, inner), inner), empty(inner));
    const signal = story.priority === undefined ? `Relevance: ${Math.round(story.relevance * 100)}%` : `Priority: ${story.priority.toUpperCase()}`;
    lines.push(...boxed([signal], inner), empty(inner), ...boxed(["[E] Explain   [S] Save"], inner));
  }
  lines.push(`╰${"─".repeat(width - 2)}╯`);
  return { text: `${lines.join("\n")}\n`, lines: lines.length, width };
}

export function clearRenderedCard(lines: number): string {
  if (lines <= 0) return "";
  return `\u001b[${lines}A${Array.from({ length: lines }, () => "\u001b[2K").join("\u001b[1B")}\u001b[${lines}A\r`;
}

export function sanitizeTerminalText(value: string): string {
  return [...value.normalize("NFKC")]
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 32 || code === 127 || code === 0x9b ? " " : character;
    })
    .join("")
    .replace(/\s+/gu, " ")
    .trim();
}

function wrap(value: string, width: number): string[] {
  const words = sanitizeTerminalText(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const safeWord = truncate(word, width);
    if (line === "") line = safeWord;
    else if (line.length + safeWord.length + 1 <= width) line += ` ${safeWord}`;
    else {
      lines.push(line);
      line = safeWord;
    }
  }
  if (line !== "") lines.push(line);
  return lines.length === 0 ? [""] : lines;
}

function boxed(lines: readonly string[], width: number): string[] {
  return lines.map((line) => `│ ${line}${" ".repeat(Math.max(0, width - line.length))} │`);
}

function empty(width: number): string {
  return `│ ${" ".repeat(width)} │`;
}

function truncate(value: string, limit: number): string {
  const safe = sanitizeTerminalText(value);
  return safe.length <= limit ? safe : `${safe.slice(0, Math.max(1, limit - 1))}…`;
}

function categoryLabel(category: Story["category"]): string {
  return category.replace("_", " ").toUpperCase();
}
