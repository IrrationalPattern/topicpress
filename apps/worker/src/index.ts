import { pathToFileURL } from "node:url";

export * from "./feed-ingestion.js";
export * from "./feed-types.js";
export * from "./clustering.js";
export * from "./draft-creation.js";
export * from "./article-review.js";
export * from "./article-publishing.js";
export * from "./public-homepage.js";
export * from "./public-category-listing.js";
export * from "./public-article-detail.js";
export * from "./public-sitemap.js";
export * from "./cluster-generation-run.js";
export * from "./ingestion-run.js";
export * from "./ingestion-policy.js";
export * from "./source-item-persistence.js";
export * from "./hero-image-candidates.js";

export const workerPackageName = "@topicpress/worker";

export function main(): void {
  console.log(`${workerPackageName} scaffold ready.`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
