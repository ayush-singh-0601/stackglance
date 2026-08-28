import type { Story } from "../core/types.js";
import type { StackGlanceDatabase } from "../storage/database.js";
import { explainStory, saveStory } from "./actions.js";

export interface InteractionOutput {
  write(value: string): unknown;
}

export interface InteractionOptions {
  database: StackGlanceDatabase;
  output: InteractionOutput;
  onHide?: () => void;
}

export class CardInteractionController {
  private active: Story | undefined;

  constructor(private readonly options: InteractionOptions) {}

  show(story: Story): void {
    this.active = story;
  }

  hide(): void {
    if (this.active === undefined) return;
    this.active = undefined;
    this.options.onHide?.();
  }

  handleInput(value: string): string | undefined {
    const story = this.active;
    if (story === undefined) return value;
    if (value === "e" || value === "E") {
      this.hide();
      this.options.output.write(`\n${explainStory(story)}`);
      return undefined;
    }
    if (value === "s" || value === "S") {
      this.hide();
      saveStory(this.options.database, story.id);
      this.options.output.write(`\nSaved: ${story.headline}\n`);
      return undefined;
    }
    this.hide();
    return value;
  }
}
