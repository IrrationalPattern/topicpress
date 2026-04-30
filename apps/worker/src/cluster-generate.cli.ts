import { pathToFileURL } from "node:url";

import { createDatabaseClient } from "./database.js";
import { runClusterGeneration, type ClusterGenerationRunSummary } from "./cluster-generation-run.js";

async function main(): Promise<void> {
  const options = parseClusterGenerateCliArgs(process.argv.slice(2));
  const { db, close } = createDatabaseClient();

  try {
    const result = await runClusterGeneration(db, {
      ...(options.limit !== undefined ? { limit: options.limit } : {}),
    });

    if (options.json) {
      console.log(JSON.stringify(result.summary, null, 2));
    } else {
      logSummary(result.summary);
    }

    process.exitCode = result.exitCode;
  } finally {
    await close();
  }
}

export function parseClusterGenerateCliArgs(args: readonly string[]): {
  readonly json: boolean;
  readonly limit?: number;
} {
  const options: { json: boolean; limit?: number } = { json: false };
  const forwardedArgs = args[0] === "--" ? args.slice(1) : args;

  for (let index = 0; index < forwardedArgs.length; index += 1) {
    const arg = forwardedArgs[index];

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--limit") {
      const value = forwardedArgs[index + 1];

      if (value === undefined) {
        throw new Error('--limit requires a positive integer value.');
      }

      options.limit = parseLimit(value);
      index += 1;
      continue;
    }

    if (arg?.startsWith("--limit=") === true) {
      options.limit = parseLimit(arg.slice("--limit=".length));
      continue;
    }

    throw new Error(`Unknown argument "${arg}"`);
  }

  return options;
}

function parseLimit(value: string): number {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error('--limit requires a positive integer value.');
  }

  return limit;
}

function logSummary(summary: ClusterGenerationRunSummary): void {
  console.log(`Cluster/generate run ${summary.runId} ${summary.status} (${summary.outcome}).`);
  console.log(
    `Clustering: candidates=${summary.clustering.candidates}, clustered=${summary.clustering.clustered}, already_clustered=${summary.clustering.alreadyClustered}, clusters_created=${summary.clustering.clustersCreated}, clusters_updated=${summary.clustering.clustersUpdated}.`,
  );
  console.log(
    `Generation: eligible=${summary.generation.eligible}, attempted=${summary.generation.attempted}, succeeded=${summary.generation.succeeded}, failed=${summary.generation.failed}, created=${summary.generation.created}, existing=${summary.generation.existingArticles}.`,
  );

  if (summary.failures.length > 0) {
    console.log("Cluster generation failures:");
    summary.failures.forEach((failure) => {
      console.log(
        `- ${failure.clusterId} (${failure.runId}): ${failure.errorClass}: ${failure.errorMessage}`,
      );
    });
  }
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
