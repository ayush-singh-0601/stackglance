import type { RenderedCard } from "./render.js";

const MINIMUM_AGENT_ROWS = 6;
const SAVE_CURSOR = "\u001b[s";
const RESTORE_CURSOR = "\u001b[u";
const CLEAR_LINE = "\u001b[2K";

export interface OverlayOutput {
  columns?: number | undefined;
  rows?: number | undefined;
  write(value: string): unknown;
}

export class TerminalCardOverlay {
  private lines: string[] = [];
  private repaintTimer: NodeJS.Timeout | undefined;

  constructor(
    private readonly output: OverlayOutput,
    private readonly resizeAgent: () => void,
  ) {}

  get reservedRows(): number {
    return this.lines.length;
  }

  show(card: RenderedCard): boolean {
    const lines = splitLines(card.text);
    if (!this.fits(lines.length)) return false;

    this.lines = lines;
    this.resizeAgent();
    this.paint(lines);
    return true;
  }

  hide(): void {
    if (this.lines.length === 0) return;

    this.cancelRepaint();
    const rows = this.lines.length;
    this.paint(Array.from({ length: rows }, () => ""));
    this.lines = [];
    this.resizeAgent();
  }

  repaint(): void {
    if (this.lines.length === 0) return;
    if (!this.fits(this.lines.length)) {
      this.hide();
      return;
    }
    this.paint(this.lines);
  }

  scheduleRepaint(): void {
    if (this.lines.length === 0) return;
    this.cancelRepaint();
    this.repaintTimer = setTimeout(() => {
      this.repaintTimer = undefined;
      this.repaint();
    }, 25);
    this.repaintTimer.unref();
  }

  private fits(rows: number): boolean {
    return rows > 0 && rows <= terminalRows(this.output) - MINIMUM_AGENT_ROWS;
  }

  private paint(lines: readonly string[]): void {
    const startRow = terminalRows(this.output) - lines.length + 1;
    const commands = lines.map(
      (line, index) => `\u001b[${startRow + index};1H${CLEAR_LINE}${line}`,
    );
    this.output.write(`${SAVE_CURSOR}${commands.join("")}${RESTORE_CURSOR}`);
  }

  private cancelRepaint(): void {
    if (this.repaintTimer !== undefined) clearTimeout(this.repaintTimer);
    this.repaintTimer = undefined;
  }
}

function terminalRows(output: OverlayOutput): number {
  return Math.max(1, output.rows ?? 24);
}

function splitLines(value: string): string[] {
  return value.replace(/\r/gu, "").replace(/\n$/u, "").split("\n");
}
