import { pathToFileURL } from "node:url";

import { createDatabaseClient } from "./database.js";
import { publishArticle, type PublishArticleResult } from "./article-publishing.js";

async function main(): Promise<void> {
  const options = parseArticlePublishCliArgs(process.argv.slice(2));
  const { db, close } = createDatabaseClient();

  try {
    const result = await publishArticle(db, {
      articleId: options.articleId,
      ...(options.operatorType !== undefined ? { operatorType: options.operatorType } : {}),
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      logResult(result);
    }

    process.exitCode = result.ok ? 0 : 1;
  } finally {
    await close();
  }
}

export function parseArticlePublishCliArgs(args: readonly string[]): {
  readonly articleId: string;
  readonly json: boolean;
  readonly operatorType?: string;
} {
  const options: { articleId?: string; json: boolean; operatorType?: string } = { json: false };
  const forwardedArgs = args[0] === "--" ? args.slice(1) : args;

  for (let index = 0; index < forwardedArgs.length; index += 1) {
    const arg = forwardedArgs[index];

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--article-id") {
      const value = forwardedArgs[index + 1];

      if (value === undefined || value.trim().length === 0) {
        throw new Error("--article-id requires a non-empty article id.");
      }

      options.articleId = value;
      index += 1;
      continue;
    }

    if (arg?.startsWith("--article-id=") === true) {
      const value = arg.slice("--article-id=".length);

      if (value.trim().length === 0) {
        throw new Error("--article-id requires a non-empty article id.");
      }

      options.articleId = value;
      continue;
    }

    if (arg === "--operator-type") {
      const value = forwardedArgs[index + 1];

      if (value === undefined || value.trim().length === 0) {
        throw new Error("--operator-type requires a non-empty value.");
      }

      options.operatorType = value;
      index += 1;
      continue;
    }

    if (arg?.startsWith("--operator-type=") === true) {
      const value = arg.slice("--operator-type=".length);

      if (value.trim().length === 0) {
        throw new Error("--operator-type requires a non-empty value.");
      }

      options.operatorType = value;
      continue;
    }

    throw new Error(`Unknown argument "${arg}"`);
  }

  if (options.articleId === undefined) {
    throw new Error("--article-id is required.");
  }

  return {
    articleId: options.articleId,
    json: options.json,
    ...(options.operatorType !== undefined ? { operatorType: options.operatorType } : {}),
  };
}

function logResult(result: PublishArticleResult): void {
  if (result.ok) {
    console.log(
      `Publish run ${result.pipelineRun.id} succeeded (${result.outcome}) for article ${result.article.id}.`,
    );
    return;
  }

  console.log(
    `Publish run ${result.pipelineRun.id} failed (${result.error.code}): ${result.error.message}`,
  );
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  });
}
