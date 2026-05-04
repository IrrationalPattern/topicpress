import assert from "node:assert/strict";

import { siteConfig } from "@topicpress/config";

import {
  getCategoryLanguageAlternates,
  getCategoryMetadataDescription,
  getCategoryMetadataTitle,
  getPublicCategoryListingMetadata,
} from "../src/lib/public-category-page.ts";
import { getPublicCategoryPath } from "../src/lib/public-category-routing.ts";
import type { CategoryListingResult } from "../src/lib/public-category-listing.ts";

function runTest(name: string, testBody: () => void): void {
  testBody();
  console.log(`ok - ${name}`);
}

const foundCategoryResult = {
  kind: "found",
  locale: "en-GB",
  category: {
    configKey: "news",
    slug: "news",
    label: "News",
    description: "Timely AI updates from approved sources.",
  },
  articles: [
    {
      id: "article-1",
      slug: "published-ai-brief",
      displaySlug: "published-ai-brief",
      title: "Published AI brief",
      excerpt: "A concise public summary from durable published state.",
      category: {
        configKey: "news",
        slug: "news",
        label: "News",
      },
      publishedAt: new Date("2026-05-03T09:30:00.000Z"),
    },
  ],
  limit: 12,
  hasMore: false,
} satisfies CategoryListingResult;

runTest("category metadata uses category label, site name, description, and website open graph", () => {
  const metadata = getPublicCategoryListingMetadata("en-GB", foundCategoryResult);

  assert.notEqual(metadata, null);
  assert.equal(metadata?.title, "News | AI Landscape Brief");
  assert.equal(metadata?.description, "Timely AI updates from approved sources.");
  assert.deepEqual(metadata?.openGraph, {
    title: "News | AI Landscape Brief",
    description: "Timely AI updates from approved sources.",
    siteName: "AI Landscape Brief",
    locale: "en-GB",
    type: "website",
  });
});

runTest("category metadata emits locale alternates only for a resolved found category", () => {
  const metadata = getPublicCategoryListingMetadata("en-GB", foundCategoryResult);
  const expectedAlternates = Object.fromEntries(
    siteConfig.locales.supportedLocales.map((locale) => [
      locale,
      getPublicCategoryPath(locale, foundCategoryResult.category.slug),
    ]),
  );

  assert.deepEqual(metadata?.alternates?.languages, expectedAlternates);
  assert.equal(getPublicCategoryListingMetadata("en-GB", { kind: "not_found" }), null);
});

runTest("category metadata description falls back to locale SEO defaults", () => {
  assert.equal(
    getCategoryMetadataDescription("en-GB", "   "),
    siteConfig.seo.descriptions["en-GB"],
  );
  assert.equal(
    getCategoryMetadataDescription("uk-UA", undefined),
    siteConfig.seo.descriptions["uk-UA"],
  );
});

runTest("category metadata title and alternates derive from configured site and route helpers", () => {
  assert.equal(getCategoryMetadataTitle("Research"), "Research | AI Landscape Brief");
  assert.deepEqual(getCategoryLanguageAlternates("model-releases"), {
    "en-GB": "/en-gb/categories/model-releases",
    "uk-UA": "/uk-ua/categories/model-releases",
  });
});
