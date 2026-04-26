import assert from "node:assert/strict";

import {
  aiLandscapeBriefSiteConfig,
  getCategorySeedRecords,
  getSourceSeedRecords,
  parseSiteConfig,
  siteConfig,
  SiteConfigValidationError,
  validateSiteConfig,
} from "../dist/index.js";

function runTest(name, testBody) {
  testBody();
  console.log(`ok - ${name}`);
}

runTest("siteConfig validates the HUM-102 first-site profile", () => {
  const result = parseSiteConfig(siteConfig);

  assert.equal(result.ok, true);
  assert.deepEqual(siteConfig.locales.supportedLocales, ["en-GB", "uk-UA"]);
  assert.equal(siteConfig.editorialRules.manualReviewRequired, true);
  assert.equal(siteConfig.editorialRules.publishingMode, "manual_review_required");
});

runTest("category and source seed records expose stable config keys", () => {
  const categorySeeds = getCategorySeedRecords();
  const sourceSeeds = getSourceSeedRecords();

  assert.deepEqual(
    categorySeeds.map((category) => category.configKey),
    [
      "news",
      "model_releases",
      "tools_products",
      "research",
      "benchmarks",
      "guides_explainers",
      "policy_safety",
      "business_adoption",
    ],
  );
  assert.equal(
    categorySeeds.find((category) => category.configKey === "benchmarks")?.parentConfigKey,
    "research",
  );
  assert.deepEqual(
    sourceSeeds.map((source) => source.configKey),
    ["openai_news", "huggingface_blog", "ahead_of_ai"],
  );
  assert.deepEqual(
    sourceSeeds.map((source) => source.kind),
    ["rss", "rss", "rss"],
  );
});

runTest("category seed records can resolve supported localized labels", () => {
  const categorySeeds = getCategorySeedRecords(siteConfig, "uk-UA");

  assert.equal(categorySeeds[0]?.name, "Новини");
  assert.equal(categorySeeds[1]?.name, "Релізи моделей");
});

runTest("invalid configs return path-specific validation issues", () => {
  const invalidConfig = {
    ...aiLandscapeBriefSiteConfig,
    taxonomy: [
      ...aiLandscapeBriefSiteConfig.taxonomy,
      {
        ...aiLandscapeBriefSiteConfig.taxonomy[0],
        slug: "duplicate-news",
      },
    ],
    sources: [
      {
        ...aiLandscapeBriefSiteConfig.sources[0],
        key: "Invalid Key",
        kind: "feed",
        feedUrl: "not-a-url",
      },
    ],
  };

  const result = parseSiteConfig(invalidConfig);

  assert.equal(result.ok, false);
  assert.match(result.issues.join("\n"), /taxonomy\.key: duplicate value "news"/);
  assert.match(result.issues.join("\n"), /sources\[0\]\.key/);
  assert.match(result.issues.join("\n"), /sources\[0\]\.kind/);
  assert.match(result.issues.join("\n"), /sources\[0\]\.feedUrl/);
});

runTest("validateSiteConfig throws a typed error for invalid configs", () => {
  assert.throws(() => validateSiteConfig({}), SiteConfigValidationError);
});
