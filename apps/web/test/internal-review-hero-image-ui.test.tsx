import assert from "node:assert/strict";

import type { ArticleReviewArticle } from "@topicpress/worker";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { HeroImageCandidateSummary } from "../src/app/(internal)/internal/editorial/review/[articleId]/hero-image-candidate-summary.tsx";

function runTest(name: string, testBody: () => void): void {
  testBody();
  console.log(`ok - ${name}`);
}

runTest("generated hero image shows disclosure and safe metadata", () => {
  const article = articleReview({
    heroImageCandidate: heroImageCandidate({
      publicUrl: "https://cdn.example.test/articles/article-1/current.webp",
      status: "generated",
      generationMetadata: {
        provider: "openai",
        storageBucket: "article-hero-images",
        storagePath: "articles/article-1/current.webp",
      },
    }),
  });
  const html = renderToStaticMarkup(<HeroImageCandidateSummary article={article} />);

  assert.match(html, /AI-generated illustration/);
  assert.match(html, /fixture-image-model/);
  assert.match(html, /editorial_illustration/);
  assert.match(html, /Current public URL/);
  assert.doesNotMatch(html, /article-hero-images/);
});

runTest("generated hero image falls back to the article public image pointer", () => {
  const article = articleReview({
    heroImageCandidate: heroImageCandidate({
      status: "generated",
      publicUrl: null,
    }),
    heroImageUrl: "https://cdn.example.test/articles/article-1/current-from-article.webp",
  });
  const html = renderToStaticMarkup(<HeroImageCandidateSummary article={article} />);

  assert.match(html, /AI-generated illustration/);
  assert.match(html, /https:\/\/cdn.example.test\/articles\/article-1\/current-from-article.webp/);
  assert.match(html, /Current public URL/);
});

runTest("failed generated hero image can show the article public image pointer without disclosure", () => {
  const article = articleReview({
    heroImageCandidate: heroImageCandidate({
      status: "failed",
      publicUrl: "https://cdn.example.test/articles/article-1/candidate-1.webp",
    }),
  });
  const html = renderToStaticMarkup(<HeroImageCandidateSummary article={article} />);

  assert.doesNotMatch(html, /AI-generated illustration/);
  assert.match(html, /https:\/\/cdn.example.test\/articles\/article-1\/candidate-1.webp/);
  assert.match(html, /Current public URL/);
});

runTest("missing generated hero image does not surface stale image approval blockers", () => {
  const article = articleReview({
    heroImageCandidate: null,
    heroImageUrl: null,
    validation: {
      ok: false,
      issues: [
        {
          code: "missing_approved_hero_image",
          message: "Article must have an approved hero image before it can be marked ready.",
        },
      ],
    },
  });
  const html = renderToStaticMarkup(<HeroImageCandidateSummary article={article} />);

  assert.match(html, /No generated hero image/);
  assert.doesNotMatch(html, /missing_approved_hero_image/);
  assert.doesNotMatch(html, /approval/i);
});

runTest("failed generated hero image shows internal failure status without disclosure", () => {
  const article = articleReview({
    heroImageUrl: null,
    heroImageCandidate: heroImageCandidate({
      status: "failed",
      publicUrl: null,
      privatePreviewAvailable: false,
      reviewNotes: "Provider error after redaction.",
    }),
  });
  const html = renderToStaticMarkup(<HeroImageCandidateSummary article={article} />);

  assert.match(html, /Generation failed/);
  assert.match(html, /Provider error after redaction/);
  assert.doesNotMatch(html, /AI-generated illustration/);
  assert.doesNotMatch(html, /private/i);
});

function articleReview(overrides: Partial<ArticleReviewArticle> = {}): ArticleReviewArticle {
  const now = new Date("2026-05-27T12:00:00.000Z");

  return {
    id: "article-1",
    storyClusterId: "cluster-1",
    categoryId: "category-1",
    slug: "review-ai-brief",
    status: "review",
    heroImageUrl: "https://cdn.example.test/articles/article-1/candidate-1.webp",
    primaryLocale: "en-GB",
    publishedAt: null,
    reviewNotes: null,
    generationMetadata: { provider: "fixture" },
    createdAt: now,
    updatedAt: now,
    category: {
      id: "category-1",
      configKey: "news",
      slug: "news",
      name: "News",
      isActive: true,
    },
    storyCluster: {
      id: "cluster-1",
      canonicalTopic: "AI policy",
      summary: "Policy summary",
      status: "processed",
    },
    primaryLocalization: {
      id: "localization-1",
      locale: "en-GB",
      slug: "review-ai-brief",
      title: "Review AI brief",
      subtitle: "Daily signal",
      excerpt: "Summary",
      body: "Body",
      keywords: ["ai"],
      metaTitle: "Review AI brief",
      metaDescription: "Metadata",
      isMachineTranslated: false,
    },
    localizations: [],
    sources: [],
    heroImageCandidate: heroImageCandidate(),
    validation: {
      ok: true,
      issues: [],
    },
    ...overrides,
  };
}

function heroImageCandidate(
  overrides: Partial<NonNullable<ArticleReviewArticle["heroImageCandidate"]>> = {},
): NonNullable<ArticleReviewArticle["heroImageCandidate"]> {
  const now = new Date("2026-05-27T12:00:00.000Z");

  return {
    id: "candidate-1",
    status: "generated",
    provider: "openai",
    model: "fixture-image-model",
    prompt: "System:\nCreate one review-gated editorial illustration.",
    promptHash: "prompt-hash-1",
    stylePolicy: "editorial_illustration",
    contentType: "image/webp",
    width: 1536,
    height: 864,
    sizeBytes: 123456,
    publicUrl: null,
    reviewNotes: null,
    generationMetadata: { provider: "openai", model: "fixture-image-model" },
    generatedAt: now,
    reviewedAt: null,
    privatePreviewAvailable: true,
    ...overrides,
  };
}
