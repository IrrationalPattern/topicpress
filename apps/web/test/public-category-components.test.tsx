import assert from "node:assert/strict";

import type { HomepageArticle } from "@topicpress/worker";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { getActiveCategoryRouteHref } from "../src/components/public/category-links.ts";
import { CategoryListingContent } from "../src/components/public/category-listing-content.tsx";

function runTest(name: string, testBody: () => void): void {
  testBody();
  console.log(`ok - ${name}`);
}

const article = {
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
} satisfies HomepageArticle;

const category = {
  configKey: "news",
  slug: "news",
  label: "News",
  description: "Timely AI updates from approved sources.",
};

runTest("category listing renders populated category state with active category links", () => {
  const html = renderToStaticMarkup(
    <CategoryListingContent
      articleListAriaLabel="Published articles in News"
      articleStatus="1 published article in this category"
      articles={[article]}
      category={category}
      categoryLabel="Category"
      dateLabel="Published"
      emptyStateTitle="No articles in this category yet"
      getCategoryHref={(entry) => getActiveCategoryRouteHref("en-GB", entry.category)}
      locale="en-GB"
      slugLabel="Slug"
    />,
  );

  assert.match(html, /News/);
  assert.match(html, /Timely AI updates from approved sources/);
  assert.match(html, /1 published article in this category/);
  assert.match(html, /Published AI brief/);
  assert.match(html, /href="\/en-gb\/categories\/news"/);
  assert.match(html, /href="\/en-gb\/articles\/published-ai-brief"/);
});

runTest("category listing renders explicit empty state", () => {
  const html = renderToStaticMarkup(
    <CategoryListingContent
      articleListAriaLabel="Published articles in News"
      articleStatus="No published articles in this category yet"
      articles={[]}
      category={category}
      categoryLabel="Category"
      emptyStateDescription="Published News articles will appear here after review."
      emptyStateTitle="No articles in this category yet"
      locale="en-GB"
    />,
  );

  assert.match(html, /No published articles in this category yet/);
  assert.match(html, /No articles in this category yet/);
  assert.match(html, /Published News articles will appear here after review/);
  assert.doesNotMatch(html, /<li/);
  assert.doesNotMatch(html, /\shref=/);
});

runTest("category route helper returns hrefs only for supported active configured categories", () => {
  assert.equal(getActiveCategoryRouteHref("en-GB", article.category), "/en-gb/categories/news");
  assert.equal(
    getActiveCategoryRouteHref("en-GB", {
      configKey: "news",
      slug: "stale-news",
    }),
    undefined,
  );
  assert.equal(
    getActiveCategoryRouteHref("en-GB", {
      configKey: "missing",
      slug: "missing",
    }),
    undefined,
  );
  assert.equal(getActiveCategoryRouteHref("fr-FR", article.category), undefined);
});
