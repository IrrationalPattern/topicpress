import { createDatabaseClient } from "./database.js";
import { runIngestion, type IngestionRunSummary } from "./ingestion-run.js";

async function main(): Promise<void> {
  const { db, close } = createDatabaseClient();
  const options = parseArgs(process.argv.slice(2));

  try {
    const result = await runIngestion(db, { force: options.force });

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

function parseArgs(args: readonly string[]): { readonly force: boolean; readonly json: boolean } {
  const options = { force: false, json: false };

  args.forEach((arg) => {
    if (arg === "--force") {
      options.force = true;
      return;
    }

    if (arg === "--json") {
      options.json = true;
      return;
    }

    throw new Error(`Unknown argument "${arg}"`);
  });

  return options;
}

function logSummary(summary: IngestionRunSummary): void {
  console.log(`Ingestion run ${summary.runId} ${summary.status} (${summary.outcome}).`);
  console.log(
    `Sources: active=${summary.sources.active}, eligible=${summary.sources.eligible}, attempted=${summary.sources.attempted}, succeeded=${summary.sources.succeeded}, failed=${summary.sources.failed}, skipped=${summary.sources.skippedByRecrawl}.`,
  );
  console.log(
    `Items: candidates=${summary.items.candidates}, inserted=${summary.items.inserted}, updated=${summary.items.updated}, unchanged=${summary.items.unchanged}, freshness_skipped=${summary.items.skippedByFreshness}, conflicts=${summary.items.conflicts}.`,
  );

  if (summary.failures.length > 0) {
    console.log("Source failures:");
    summary.failures.forEach((failure) => {
      const degraded = failure.degraded ? " degraded" : "";

      console.log(
        `- ${failure.configKey} (${failure.runId}): ${failure.errorClass}${degraded}: ${failure.errorMessage}`,
      );
    });
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
