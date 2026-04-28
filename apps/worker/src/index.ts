import { pathToFileURL } from "node:url";

export * from "./feed-ingestion.js";
export * from "./feed-types.js";
export * from "./ingestion-policy.js";
export * from "./source-item-persistence.js";

export const workerPackageName = "@topicpress/worker";

export function main(): void {
  console.log(`${workerPackageName} scaffold ready.`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
