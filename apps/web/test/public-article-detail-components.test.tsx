import assert from "node:assert/strict";

import type { PublicArticleDetail } from "@topicpress/worker";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ArticleDetailContent,
  getPlainTextParagraphs,
} from "../src/components/public/article-detail-content.tsx";

function runTest(name: string, testBody: () => void): void {
  testBody();
  console.log(`ok - ${name}`);
}

const article = {
  id: "article-1",
  slug: "published-ai-brief",
  displaySlug: "published-ai-brief",
  locale: "en-GB",
  title: "Published AI brief",
  subtitle: "Daily editorial signal",
  excerpt: "A concise public summary from durable published state.",
  body: "First paragraph with ordinary text.\nStill first paragraph.\n\n<script>alert('x')</script>\n\nFinal paragraph.",
  category: {
    configKey: "news",
    slug: "news",
    label: "News",
  },
  publishedAt: new Date("2026-05-03T09:30:00.000Z"),
  alternateSlugs: {
    "en-GB": "published-ai-brief",
  },
} satisfies PublicArticleDetail;

runTest("article detail content renders article fields, category link, and date", () => {
  const html = renderToStaticMarkup(
    <ArticleDetailContent
      article={article}
      categoryHref="/en-gb/categories/news"
      categoryLabel="Category"
      dateLabel="Published"
      locale="en-GB"
    />,
  );

  assert.match(html, /Published AI brief/);
  assert.match(html, /Daily editorial signal/);
  assert.match(html, /A concise public summary/);
  assert.match(html, /href="\/en-gb\/categories\/news"/);
  assert.match(html, /News/);
  assert.match(html, /2026-05-03T09:30:00.000Z/);
});

runTest("article detail body renders as escaped plain-text paragraphs", () => {
  const html = renderToStaticMarkup(
    <ArticleDetailContent
      article={article}
      categoryHref="/en-gb/categories/news"
      categoryLabel="Category"
      dateLabel="Published"
      locale="en-GB"
    />,
  );

  assert.deepEqual(getPlainTextParagraphs(article.body), [
    "First paragraph with ordinary text.\nStill first paragraph.",
    "<script>alert('x')</script>",
    "Final paragraph.",
  ]);
  assert.match(html, /First paragraph with ordinary text/);
  assert.match(html, /&lt;script&gt;alert/);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /dangerouslySetInnerHTML/);
});

runTest("article detail does not render deferred right-rail or attribution placeholders", () => {
  const html = renderToStaticMarkup(
    <ArticleDetailContent
      article={article}
      categoryHref="/en-gb/categories/news"
      categoryLabel="Category"
      dateLabel="Published"
      locale="en-GB"
    />,
  );

  assert.doesNotMatch(html, /Related articles/i);
  assert.doesNotMatch(html, /Newsletter/i);
  assert.doesNotMatch(html, /Source attribution/i);
  assert.doesNotMatch(html, /Advertisement/i);
});
