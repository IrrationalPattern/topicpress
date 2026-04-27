import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SeedSyncValidationError,
  validateAgainstExistingRows,
  validateSeedSyncPlan,
} from "../dist/seed-sync.js";

const now = new Date("2026-04-28T00:00:00.000Z");

function source(overrides = {}) {
  return {
    configKey: "openai_news",
    slug: "openai-news",
    name: "OpenAI News",
    kind: "rss",
    feedUrl: "https://openai.com/news/rss.xml",
    homepageUrl: "https://openai.com/news/",
    language: "en",
    isActive: true,
    ...overrides,
  };
}

function category(overrides = {}) {
  return {
    configKey: "news",
    slug: "news",
    name: "News",
    description: "Timely AI updates.",
    sortOrder: 10,
    isActive: true,
    ...overrides,
  };
}

function plan(overrides = {}) {
  return {
    categories: [category()],
    sources: [source()],
    deactivateMissing: true,
    now,
    ...overrides,
  };
}

test("valid seed plan passes", () => {
  assert.doesNotThrow(() => validateSeedSyncPlan(plan()));
});

test("missing category parents fail before writes", () => {
  assert.throws(
    () =>
      validateSeedSyncPlan(
        plan({
          categories: [category({ parentConfigKey: "missing_parent" })],
        }),
      ),
    /missing parent "missing_parent"/,
  );
});

test("category parent cycles fail before writes", () => {
  assert.throws(
    () =>
      validateSeedSyncPlan(
        plan({
          categories: [
            category({ configKey: "news", slug: "news", parentConfigKey: "research" }),
            category({ configKey: "research", slug: "research", parentConfigKey: "news" }),
          ],
        }),
      ),
    /cycle detected/,
  );
});

test("source slug and feed collisions fail against existing database rows", () => {
  assert.throws(
    () =>
      validateAgainstExistingRows(
        plan({
          sources: [source({ configKey: "new_source" })],
        }),
        [
          {
            configKey: "old_source",
            slug: "openai-news",
            feedUrl: "https://openai.com/news/rss.xml",
          },
        ],
        [],
      ),
    (error) =>
      error instanceof SeedSyncValidationError &&
      error.issues.some((issue) => issue.includes("slug: collides")) &&
      error.issues.some((issue) => issue.includes("feedUrl: collides")),
  );
});

test("category slug collisions fail against existing database rows", () => {
  assert.throws(
    () =>
      validateAgainstExistingRows(
        plan({
          categories: [category({ configKey: "renamed_news" })],
        }),
        [],
        [{ configKey: "news", slug: "news" }],
      ),
    /collides with existing category config_key "news"/,
  );
});
