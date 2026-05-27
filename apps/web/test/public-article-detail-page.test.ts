import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { PublicArticleDetail, PublicArticleDetailResult } from "@topicpress/worker";

import {
  getArticleLanguageAlternates,
  getArticleMetadataDescription,
  getArticleMetadataTitle,
  getPublicArticleDetailMetadata,
} from "../src/lib/public-article-routing.ts";
import {
  getPublicArticlePath,
  isArticleSlugSegment,
  resolvePublicArticleRouteParams,
} from "../src/lib/public-article-routing.ts";

function runTest(name: string, testBody: () => void): void {
  testBody();
  console.log(`ok - ${name}`);
}

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = join(testDir, "..");

const article = {
  id: "article-1",
  slug: "published-ai-brief",
  displaySlug: "published-ai-brief",
  locale: "en-GB",
  title: "Published AI brief",
  subtitle: "Daily editorial signal",
  excerpt: "A concise public summary from durable published state.",
  body: "Article body.",
  category: {
    configKey: "news",
    slug: "news",
    label: "News",
  },
  publishedAt: new Date("2026-05-03T09:30:00.000Z"),
  heroImageUrl: "https://example.com/hero.jpg",
  metaTitle: "Published AI brief metadata",
  metaDescription: "Metadata description for the public article.",
  keywords: ["ai", "briefing"],
  alternateSlugs: {
    "en-GB": "published-ai-brief",
    "uk-UA": "uk-ai-brief",
    "fr-FR": "ignored-locale",
    "en-gb": "also-ignored",
    "uk-UA-invalid": "Bad_Slug",
  },
} satisfies PublicArticleDetail;

const foundResult = {
  kind: "found",
  article,
} satisfies PublicArticleDetailResult;

runTest("article route helper resolves supported locale segments and rejects invalid params", () => {
  assert.equal(getPublicArticlePath("en-GB", "published-ai-brief"), "/en-gb/articles/published-ai-brief");
  assert.deepEqual(resolvePublicArticleRouteParams({ locale: "en-gb", slug: "published-ai-brief" }), {
    locale: "en-GB",
    slug: "published-ai-brief",
  });
  assert.deepEqual(resolvePublicArticleRouteParams({ locale: "uk-UA", slug: "uk-ai-brief" }), {
    locale: "uk-UA",
    slug: "uk-ai-brief",
  });
  assert.equal(resolvePublicArticleRouteParams({ locale: "fr-fr", slug: "published-ai-brief" }), null);
  assert.equal(resolvePublicArticleRouteParams({ locale: "en-gb", slug: "Bad_Slug" }), null);
  assert.equal(isArticleSlugSegment("published-ai-brief"), true);
  assert.equal(isArticleSlugSegment("published--ai-brief"), false);
});

runTest("article metadata uses article meta fields, Open Graph article data, and backend alternates", () => {
  const metadata = getPublicArticleDetailMetadata("en-GB", foundResult);

  assert.notEqual(metadata, null);
  assert.equal(metadata?.title, "Published AI brief metadata | AI Landscape Brief");
  assert.equal(metadata?.description, "Metadata description for the public article.");
  assert.deepEqual(metadata?.alternates?.languages, {
    "en-GB": "/en-gb/articles/published-ai-brief",
    "uk-UA": "/uk-ua/articles/uk-ai-brief",
  });
  assert.deepEqual(metadata?.keywords, ["ai", "briefing"]);
  assert.deepEqual(metadata?.openGraph, {
    title: "Published AI brief metadata | AI Landscape Brief",
    description: "Metadata description for the public article.",
    siteName: "AI Landscape Brief",
    locale: "en-GB",
    type: "article",
    publishedTime: "2026-05-03T09:30:00.000Z",
    images: ["https://example.com/hero.jpg"],
  });
});

runTest("article metadata title suffixing is idempotent for stored complete meta titles", () => {
  const completeMetaTitleArticle = {
    ...article,
    metaTitle: "Published AI brief metadata | AI Landscape Brief",
  } satisfies PublicArticleDetail;
  const caseAndWhitespaceMetaTitleArticle = {
    ...article,
    metaTitle: " Published AI brief metadata | ai landscape brief ",
  } satisfies PublicArticleDetail;

  assert.equal(
    getArticleMetadataTitle(completeMetaTitleArticle),
    "Published AI brief metadata | AI Landscape Brief",
  );
  assert.equal(
    getArticleMetadataTitle(caseAndWhitespaceMetaTitleArticle),
    " Published AI brief metadata | ai landscape brief ",
  );

  const metadata = getPublicArticleDetailMetadata("en-GB", {
    kind: "found",
    article: completeMetaTitleArticle,
  });

  assert.equal(metadata?.title, "Published AI brief metadata | AI Landscape Brief");
  assert.deepEqual(metadata?.openGraph, {
    title: "Published AI brief metadata | AI Landscape Brief",
    description: "Metadata description for the public article.",
    siteName: "AI Landscape Brief",
    locale: "en-GB",
    type: "article",
    publishedTime: "2026-05-03T09:30:00.000Z",
    images: ["https://example.com/hero.jpg"],
  });
});

runTest("article metadata falls back to rendered title and excerpt", () => {
  const fallbackArticle = {
    ...article,
    metaTitle: undefined,
    metaDescription: undefined,
    keywords: undefined,
    heroImageUrl: undefined,
  } satisfies PublicArticleDetail;

  assert.equal(getArticleMetadataTitle(fallbackArticle), "Published AI brief | AI Landscape Brief");
  assert.equal(
    getArticleMetadataDescription("en-GB", fallbackArticle),
    "A concise public summary from durable published state.",
  );
  assert.deepEqual(getPublicArticleDetailMetadata("en-GB", { kind: "found", article: fallbackArticle })?.openGraph, {
    title: "Published AI brief | AI Landscape Brief",
    description: "A concise public summary from durable published state.",
    siteName: "AI Landscape Brief",
    locale: "en-GB",
    type: "article",
    publishedTime: "2026-05-03T09:30:00.000Z",
  });
});

runTest("article metadata returns null for not-found results", () => {
  assert.equal(getPublicArticleDetailMetadata("en-GB", { kind: "not_found" }), null);
});

runTest("article route files exist without adding the deferred archive surface", () => {
  assert.equal(
    existsSync(join(webRoot, "src/app/(public)/[locale]/articles/[slug]/page.tsx")),
    true,
  );
  assert.equal(
    existsSync(join(webRoot, "src/app/(public)/[locale]/articles/[slug]/not-found.tsx")),
    true,
  );
  assert.equal(existsSync(join(webRoot, "src/app/(public)/[locale]/archive")), false);
});

runTest("article language alternates omit invalid locale keys and invalid slugs", () => {
  assert.deepEqual(getArticleLanguageAlternates(article.alternateSlugs), {
    "en-GB": "/en-gb/articles/published-ai-brief",
    "uk-UA": "/uk-ua/articles/uk-ai-brief",
  });
});
