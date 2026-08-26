import type { RawStory } from "../core/types.js";

export interface FeedCollector {
  readonly name: string;
  collect(now?: Date): Promise<RawStory[]>;
}

export interface FeedSource {
  name: string;
  url: string;
  allowedHosts: readonly string[];
}
