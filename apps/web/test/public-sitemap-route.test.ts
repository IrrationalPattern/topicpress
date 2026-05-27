import assert from "node:assert/strict";

import { siteConfig, type SiteConfig } from "@topicpress/config";
import type { PublicSitemapInventory } from "@topicpress/worker";

import {
  buildCanonicalUrl,
  buildPublicSitemapRouteEntries,
  getCanonicalOrigin,
  getCanonicalSitemapUrl,
} from "../src/lib/public-seo-origin.ts";

function runTest(name: string, testBody: () => void): void {
  testBody();
  console.log(`ok - ${name}`);
}

const canonicalOrigin = "https://ai-landscape-brief.example";

const inventory = {
  categories: [
    {
      source: "category",
      locale: "en-GB",
      categorySlug: "news",
      lastModified: "2026-05-20T10:00:00.000Z",
    },
    {
      source: "category",
      locale: "uk-UA",
      categorySlug: "research",
      lastModified: "2026-05-21T10:00:00.000Z",
    },
    {
      source: "category",
      locale: "fr-FR",
      categorySlug: "news",
    },
    {
      source: "category",
      locale: "en-GB",
      categorySlug: "Bad_Slug",
    },
  ],
  articles: [
    {
      source: "article",
      articleId: "article-1",
      locale: "en-GB",
      slug: "published-ai-brief",
      publishedAt: "2026-05-22T09:00:00.000Z",
      updatedAt: "2026-05-23T09:00:00.000Z",
    },
    {
      source: "article",
      articleId: "article-1",
      locale: "uk-UA",
      slug: "uk-ai-brief",
      publishedAt: "2026-05-22T09:00:00.000Z",
    },
    {
      source: "article",
      articleId: "article-2",
      locale: "en-GB",
      slug: "Bad_Slug",
      publishedAt: "2026-05-22T09:00:00.000Z",
    },
    {
      source: "article",
      articleId: "article-3",
      locale: "fr-FR",
      slug: "ignored-locale",
      publishedAt: "2026-05-22T09:00:00.000Z",
    },
  ],
} satisfies PublicSitemapInventory;

runTest("sitemap entries use the configured production placeholder canonical origin", () => {
  const entries = buildPublicSitemapRouteEntries(inventory);
  const urls = entries.map((entry) => entry.url);

  assert.equal(getCanonicalOrigin(), canonicalOrigin);
  assert.equal(getCanonicalSitemapUrl(), `${canonicalOrigin}/sitemap.xml`);
  assert.equal(buildCanonicalUrl("//en-gb//categories//news//"), `${canonicalOrigin}/en-gb/categories/news`);
  assert.equal(urls.every((url) => url.startsWith(`${canonicalOrigin}/`)), true);
  assert.equal(urls.some((url) => url.includes("localhost")), false);
});

runTest("sitemap entries include supported locale homepages, category paths, and article paths", () => {
  const entries = buildPublicSitemapRouteEntries(inventory);
  const urls = entries.map((entry) => entry.url);

  assert.deepEqual(urls, [
    `${canonicalOrigin}/en-gb`,
    `${canonicalOrigin}/uk-ua`,
    `${canonicalOrigin}/en-gb/categories/news`,
    `${canonicalOrigin}/uk-ua/categories/research`,
    `${canonicalOrigin}/en-gb/articles/published-ai-brief`,
    `${canonicalOrigin}/uk-ua/articles/uk-ai-brief`,
  ]);
  assert.deepEqual(entries.find((entry) => entry.url.endsWith("/categories/news"))?.lastModified, "2026-05-20T10:00:00.000Z");
  assert.deepEqual(entries.find((entry) => entry.url.endsWith("/articles/published-ai-brief"))?.lastModified, "2026-05-23T09:00:00.000Z");
});

runTest("sitemap entries omit redirect, internal, archive, unsupported-locale, and invalid-slug routes", () => {
  const urls = buildPublicSitemapRouteEntries(inventory).map((entry) => entry.url);

  assert.equal(urls.includes(canonicalOrigin), false);
  assert.equal(urls.includes(`${canonicalOrigin}/`), false);
  assert.equal(urls.some((url) => url.includes("/internal/editorial/review")), false);
  assert.equal(urls.some((url) => url.includes("/archive")), false);
  assert.equal(urls.some((url) => url.includes("/fr-fr/")), false);
  assert.equal(urls.some((url) => url.includes("Bad_Slug")), false);
});

runTest("canonical origin ignores localOrigin and rejects localhost canonical placeholders", () => {
  const configWithDifferentLocalOrigin = {
    ...siteConfig,
    identity: {
      ...siteConfig.identity,
      domains: {
        ...siteConfig.identity.domains,
        localOrigin: "http://localhost:4999",
        productionOriginPlaceholder: "https://canonical.example/",
      },
    },
  } satisfies SiteConfig;
  const configWithLocalhostPlaceholder = {
    ...siteConfig,
    identity: {
      ...siteConfig.identity,
      domains: {
        ...siteConfig.identity.domains,
        productionOriginPlaceholder: "http://localhost:3000",
      },
    },
  } satisfies SiteConfig;

  assert.equal(getCanonicalOrigin(configWithDifferentLocalOrigin), "https://canonical.example");
  assert.equal(buildCanonicalUrl("/sitemap.xml", configWithDifferentLocalOrigin), "https://canonical.example/sitemap.xml");
  assert.throws(() => getCanonicalOrigin(configWithLocalhostPlaceholder), /must not use localhost/);
});
