import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  DEFAULT_CONFIG,
  StackGlanceDatabase,
  explainStory,
  refreshDefaultIntelligence,
  renderCard,
  resolvePaths,
  saveConfig,
} from "../dist/index.js";

const root = await mkdtemp(join(tmpdir(), "stackglance-readme-real-"));
try {
  const paths = resolvePaths({ env: { STACKGLANCE_HOME: root } });

  await saveConfig(paths.config, {
    ...DEFAULT_CONFIG,
    enabled: true,
    sources: {
      ...DEFAULT_CONFIG.sources,
      githubRepositories: ["microsoft/typescript"],
    },
  });

  const report = await refreshDefaultIntelligence(
    paths,
    process.cwd(),
    "Fix Linux CI paths and publish StackGlance",
  );
  const database = new StackGlanceDatabase(paths.database);
  const stories = database.listStories();
  database.close();
  const example = stories.find((story) => story.source === "OSV" && story.priority === "high");

  console.log(
    JSON.stringify(
      {
        report,
        stories: stories
          .slice(0, 3)
          .map(
            ({
              id,
              source,
              url,
              headline,
              summary,
              whyItMatters,
              category,
              scope,
              relevance,
              publishedAt,
              priority,
            }) => ({
              id,
              source,
              url,
              headline,
              summary,
              whyItMatters,
              category,
              scope,
              relevance,
              publishedAt,
              priority,
            }),
          ),
        example:
          example === undefined
            ? null
            : {
                id: example.id,
                url: example.url,
                card: renderCard(example, { width: 72 }).text,
                explanation: explainStory(example),
              },
      },
      null,
      2,
    ),
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
