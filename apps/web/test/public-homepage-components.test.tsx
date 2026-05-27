import assert from "node:assert/strict";

import type { HomepageArticle } from "@topicpress/worker";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ArticleList } from "../src/components/public/article-list.tsx";
import { LocaleSwitcher } from "../src/components/public/locale-switcher.tsx";

function runTest(name: string, testBody: () => void): void {
  testBody();
  console.log(`ok - ${name}`);
}

const article = {
  id: "article-1",
  slug: "public-market-brief",
  displaySlug: "public-market-brief",
  title: "Public market brief",
  subtitle: "Daily editorial signal",
  excerpt: "A concise summary of the latest public-market reporting.",
  category: {
    configKey: "markets",
    slug: "markets",
    label: "Markets",
  },
  publishedAt: new Date("2026-05-01T10:00:00.000Z"),
} satisfies HomepageArticle;

runTest("article list renders published article fields with article detail links", () => {
  const html = renderToStaticMarkup(
    <ArticleList
      ariaLabel="Latest articles"
      articles={[article]}
      categoryLabel="Category"
      dateLabel="Published"
      emptyStateTitle="No published articles"
      heading="Latest"
      locale="en-GB"
      slugLabel="Slug"
    />,
  );

  assert.match(html, /Public market brief/);
  assert.match(html, /Daily editorial signal/);
  assert.match(html, /A concise summary/);
  assert.match(html, /Markets/);
  assert.match(html, /public-market-brief/);
  assert.match(html, /2026-05-01T10:00:00.000Z/);
  assert.match(html, /href="\/en-gb\/articles\/public-market-brief"/);
  assert.doesNotMatch(html, /href="[^"]*\/categories\//);
});

runTest("article list renders the empty state when no articles are available", () => {
  const html = renderToStaticMarkup(
    <ArticleList
      ariaLabel="Latest articles"
      articles={[]}
      emptyStateDescription="Published articles will appear here after review."
      emptyStateTitle="No published articles"
      heading="Latest"
      locale="en-GB"
    />,
  );

  assert.match(html, /No published articles/);
  assert.match(html, /Published articles will appear here after review/);
  assert.doesNotMatch(html, /<li/);
});

runTest("locale switcher renders a selected shadcn combobox instead of language links", () => {
  const html = renderToStaticMarkup(<LocaleSwitcher currentLocale="en-GB" label="Language" />);

  assert.match(html, /role="combobox"/);
  assert.match(html, /data-slot="select-trigger"/);
  assert.match(html, /British English/);
  assert.doesNotMatch(html, /\shref=/);
});
