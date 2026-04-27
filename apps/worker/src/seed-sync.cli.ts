import { createDatabaseClient } from "./database.js";
import { SeedSyncValidationError, syncSiteConfig } from "./seed-sync.js";

async function main(): Promise<void> {
  const { db, close } = createDatabaseClient();

  try {
    const result = await syncSiteConfig(db, parseArgs(process.argv.slice(2)));

    console.log("Seed sync completed.");
    console.log(`Sources upserted: ${result.sources.upserted}`);
    console.log(`Sources deactivated: ${result.sources.deactivatedMissing}`);
    console.log(`Categories upserted: ${result.categories.upserted}`);
    console.log(`Category parent links updated: ${result.categories.parentLinksUpdated}`);
    console.log(`Categories deactivated: ${result.categories.deactivatedMissing}`);
  } finally {
    await close();
  }
}

function parseArgs(args: readonly string[]): { locale?: string; deactivateMissing?: boolean } {
  const options: { locale?: string; deactivateMissing?: boolean } = {};

  args.forEach((arg) => {
    if (arg === "--keep-missing-active") {
      options.deactivateMissing = false;
      return;
    }

    if (arg.startsWith("--locale=")) {
      options.locale = arg.slice("--locale=".length);
      return;
    }

    throw new Error(`Unknown argument "${arg}"`);
  });

  return options;
}

main().catch((error: unknown) => {
  if (error instanceof SeedSyncValidationError) {
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
