import assert from "node:assert/strict";
import { test } from "node:test";

import { getPublicArticleDetailWithStore } from "../dist/public-article-detail.js";

const publishedAt = new Date("2026-05-01T10:00:00.000Z");

test("returns a public article detail DTO for a qualifying published article", async () => {
  const store = createMemoryPublicArticleDetailStore({
    candidates: [
      candidate({
        article: article({ id: "article-public" }),
        localizations: [
          localization({
            locale: "en-GB",
            slug: "public-article",
            title: "Public article",
            subtitle: "A public subtitle",
            excerpt: "A stable excerpt.",
            body: "Paragraph one.\n\nParagraph two.",
            keywords: ["  ai ", "", "markets\0"],
            metaTitle: "Public article | AI Landscape Brief",
            metaDescription: "A public meta description.",
          }),
        ],
      }),
    ],
  });

  const result = await getPublicArticleDetailWithStore(
    store,
    { locale: "en-GB", slug: "public-article" },
    publicArticleConfig,
  );

  assert.equal(result.kind, "found");
  assert.equal(result.article.id, "article-public");
  assert.equal(result.article.slug, "public-article");
  assert.equal(result.article.displaySlug, "public-article");
  assert.equal(result.article.locale, "en-GB");
  assert.equal(result.article.title, "Public article");
  assert.equal(result.article.subtitle, "A public subtitle");
  assert.equal(result.article.excerpt, "A stable excerpt.");
  assert.equal(result.article.body, "Paragraph one.\n\nParagraph two.");
  assert.deepEqual(result.article.category, {
    configKey: "news",
    slug: "news",
    label: "News",
  });
  assert.equal(result.article.publishedAt, publishedAt);
  assert.equal(result.article.heroImageUrl, "https://example.test/hero.jpg");
  assert.equal(result.article.metaTitle, "Public article | AI Landscape Brief");
  assert.equal(result.article.metaDescription, "A public meta description.");
  assert.deepEqual(result.article.keywords, ["ai", "markets"]);
  assert.deepEqual(result.article.alternateSlugs, {
    "en-GB": "public-article",
    "uk-UA": "public-article",
  });
});

test("returns not_found for unsupported locale, invalid slug, unknown slug, or ineligible articles", async (t) => {
  await t.test("unsupported locale", async () => {
    const store = createMemoryPublicArticleDetailStore();

    const result = await getPublicArticleDetailWithStore(
      store,
      { locale: "fr-FR", slug: "public-article" },
      publicArticleConfig,
    );

    assert.deepEqual(result, { kind: "not_found" });
    assert.equal(store.calls.length, 0);
  });

  await t.test("invalid slug shape", async () => {
    const store = createMemoryPublicArticleDetailStore();

    const result = await getPublicArticleDetailWithStore(
      store,
      { locale: "en-GB", slug: "Bad_Slug" },
      publicArticleConfig,
    );

    assert.deepEqual(result, { kind: "not_found" });
    assert.equal(store.calls.length, 0);
  });

  await t.test("unknown slug", async () => {
    const store = createMemoryPublicArticleDetailStore({ candidates: [] });

    const result = await getPublicArticleDetailWithStore(
      store,
      { locale: "en-GB", slug: "unknown-slug" },
      publicArticleConfig,
    );

    assert.deepEqual(result, { kind: "not_found" });
  });

  await t.test("unpublished status", async () => {
    for (const status of ["draft", "review", "ready", "failed"]) {
      const store = createMemoryPublicArticleDetailStore({
        candidates: [candidate({ article: article({ status }) })],
        applyQueryFilters: false,
      });

      const result = await getPublicArticleDetailWithStore(
        store,
        { locale: "en-GB", slug: "public-article" },
        publicArticleConfig,
      );

      assert.deepEqual(result, { kind: "not_found" });
    }
  });

  await t.test("null published_at", async () => {
    const store = createMemoryPublicArticleDetailStore({
      candidates: [candidate({ article: article({ publishedAt: null }) })],
      applyQueryFilters: false,
    });

    const result = await getPublicArticleDetailWithStore(
      store,
      { locale: "en-GB", slug: "public-article" },
      publicArticleConfig,
    );

    assert.deepEqual(result, { kind: "not_found" });
  });

  await t.test("inactive category row", async () => {
    const store = createMemoryPublicArticleDetailStore({
      candidates: [candidate({ category: category({ isActive: false }) })],
      applyQueryFilters: false,
    });

    const result = await getPublicArticleDetailWithStore(
      store,
      { locale: "en-GB", slug: "public-article" },
      publicArticleConfig,
    );

    assert.deepEqual(result, { kind: "not_found" });
  });

  await t.test("missing required fields after fallback", async () => {
    for (const localizations of [
      [localization({ slug: "", title: "Title", excerpt: "Excerpt", body: "Body" })],
      [localization({ slug: "public-article", title: "", excerpt: "Excerpt", body: "Body" })],
      [localization({ slug: "public-article", title: "Title", excerpt: "", body: "Body" })],
      [localization({ slug: "public-article", title: "Title", excerpt: "Excerpt", body: "" })],
    ]) {
      const store = createMemoryPublicArticleDetailStore({
        candidates: [candidate({ article: article({ slug: "" }), localizations })],
        applyQueryFilters: false,
      });

      const result = await getPublicArticleDetailWithStore(
        store,
        { locale: "en-GB", slug: "public-article" },
        publicArticleConfig,
      );

      assert.deepEqual(result, { kind: "not_found" });
    }
  });
});

test("uses requested-locale fields before default-locale fallback", async () => {
  const store = createMemoryPublicArticleDetailStore({
    candidates: [
      candidate({
        localizations: [
          localization({
            locale: "en-GB",
            slug: "default-slug",
            title: "Default title",
            subtitle: "Default subtitle",
            excerpt: "Default excerpt",
            body: "Default body",
            keywords: ["default-keyword"],
            metaTitle: "Default meta title",
            metaDescription: "Default meta description",
          }),
          localization({
            id: "localization-uk",
            locale: "uk-UA",
            slug: "requested-slug",
            title: "Requested title",
            subtitle: "",
            excerpt: "",
            body: "Requested body",
            keywords: [],
            metaTitle: "Requested meta title",
            metaDescription: null,
          }),
        ],
      }),
    ],
  });

  const result = await getPublicArticleDetailWithStore(
    store,
    { locale: "uk-UA", slug: "requested-slug" },
    publicArticleFallbackConfig,
  );

  assert.equal(result.kind, "found");
  assert.equal(result.article.slug, "requested-slug");
  assert.equal(result.article.title, "Requested title");
  assert.equal(result.article.subtitle, "Default subtitle");
  assert.equal(result.article.excerpt, "Default excerpt");
  assert.equal(result.article.body, "Requested body");
  assert.deepEqual(result.article.keywords, ["default-keyword"]);
  assert.equal(result.article.metaTitle, "Requested meta title");
  assert.equal(result.article.metaDescription, "Default meta description");
  assert.equal(result.article.category.label, "News");
});

test("resolves lookup precedence before default and canonical slug matches", async () => {
  const store = createMemoryPublicArticleDetailStore({
    candidates: [
      candidate({
        article: article({ id: "default-tier", slug: "canonical-default" }),
        localizations: [
          localization({ articleId: "default-tier", locale: "en-GB", slug: "shared-slug" }),
        ],
      }),
      candidate({
        article: article({ id: "requested-tier", slug: "canonical-requested" }),
        localizations: [
          localization({
            id: "localization-requested-default",
            articleId: "requested-tier",
            locale: "en-GB",
            slug: "requested-default",
          }),
          localization({
            id: "localization-requested-uk",
            articleId: "requested-tier",
            locale: "uk-UA",
            slug: "shared-slug",
            title: "Requested tier title",
          }),
        ],
      }),
      candidate({
        article: article({ id: "canonical-tier", slug: "shared-slug" }),
        localizations: [
          localization({
            id: "localization-canonical",
            articleId: "canonical-tier",
            locale: "en-GB",
            slug: "canonical-localized",
          }),
        ],
      }),
    ],
  });

  const result = await getPublicArticleDetailWithStore(
    store,
    { locale: "uk-UA", slug: "shared-slug" },
    publicArticleConfig,
  );

  assert.equal(result.kind, "found");
  assert.equal(result.article.id, "requested-tier");
  assert.equal(result.article.title, "Requested tier title");
});

test("uses canonical article slug only when no usable localization slug exists", async () => {
  const store = createMemoryPublicArticleDetailStore({
    candidates: [
      candidate({
        article: article({ slug: "canonical-only" }),
        localizations: [
          localization({
            locale: "en-GB",
            slug: null,
            title: "Canonical title",
            excerpt: "Canonical excerpt",
            body: "Canonical body",
          }),
        ],
      }),
    ],
  });

  const result = await getPublicArticleDetailWithStore(
    store,
    { locale: "en-GB", slug: "canonical-only" },
    publicArticleConfig,
  );

  assert.equal(result.kind, "found");
  assert.equal(result.article.slug, "canonical-only");
  assert.equal(result.article.title, "Canonical title");
});

test("alternateSlugs includes only supported locales that resolve the same public article", async () => {
  const store = createMemoryPublicArticleDetailStore({
    candidates: [
      candidate({
        article: article({ id: "target-article", slug: "target-canonical" }),
        localizations: [
          localization({
            articleId: "target-article",
            locale: "en-GB",
            slug: "target-en",
          }),
          localization({
            id: "localization-target-uk",
            articleId: "target-article",
            locale: "uk-UA",
            slug: null,
            title: " ",
            excerpt: "Fallback excerpt",
            body: "Fallback body",
          }),
        ],
      }),
      candidate({
        article: article({ id: "shadow-article", slug: "shadow-canonical" }),
        localizations: [
          localization({
            id: "localization-shadow-en",
            articleId: "shadow-article",
            locale: "en-GB",
            slug: "shadow-en",
          }),
          localization({
            id: "localization-shadow-uk",
            articleId: "shadow-article",
            locale: "uk-UA",
            slug: "target-en",
          }),
        ],
      }),
    ],
  });

  const result = await getPublicArticleDetailWithStore(
    store,
    { locale: "en-GB", slug: "target-en" },
    publicArticleConfig,
  );

  assert.equal(result.kind, "found");
  assert.equal(result.article.id, "target-article");
  assert.deepEqual(result.article.alternateSlugs, {
    "en-GB": "target-en",
  });
});

function createMemoryPublicArticleDetailStore(overrides = {}) {
  const candidates = (overrides.candidates ?? [candidate()]).map(cloneCandidate);
  const calls = [];

  const tx = {
    findArticleDetailCandidatesBySlug: async (options) => {
      calls.push({
        slug: options.slug,
        requestedLocale: options.requestedLocale,
        defaultLocale: options.defaultLocale,
        supportedLocales: [...options.supportedLocales],
      });

      const rows = candidates
        .filter((row) => matchesLookup(row, options))
        .filter((row) =>
          overrides.applyQueryFilters === false
            ? true
            : row.article.status === "published" &&
              row.article.publishedAt !== null &&
              row.category.isActive,
        );

      return rows.map((row) => ({
        article: { ...row.article },
        category: { ...row.category },
        localizations: row.localizations
          .filter((currentLocalization) =>
            options.supportedLocales.includes(currentLocalization.locale),
          )
          .map((currentLocalization) => ({ ...currentLocalization })),
      }));
    },
  };

  return {
    calls,
    transaction: async (callback) => callback(tx),
  };
}

function matchesLookup(row, options) {
  return (
    row.article.slug === options.slug ||
    row.localizations.some(
      (currentLocalization) =>
        currentLocalization.slug === options.slug &&
        (currentLocalization.locale === options.requestedLocale ||
          currentLocalization.locale === options.defaultLocale),
    )
  );
}

function cloneCandidate(row) {
  return {
    article: { ...row.article },
    category: { ...row.category },
    localizations: row.localizations.map((currentLocalization) => ({
      ...currentLocalization,
      keywords: [...currentLocalization.keywords],
    })),
  };
}

function candidate(overrides = {}) {
  const currentArticle = overrides.article ?? article();

  return {
    article: currentArticle,
    category: overrides.category ?? category(),
    localizations: overrides.localizations ?? [
      localization({ articleId: currentArticle.id, slug: "public-article" }),
    ],
  };
}

function article(overrides = {}) {
  return {
    id: "article-1",
    slug: "canonical-article",
    status: "published",
    publishedAt,
    heroImageUrl: "https://example.test/hero.jpg",
    ...overrides,
  };
}

function category(overrides = {}) {
  return {
    configKey: "news",
    slug: "news",
    name: "News",
    isActive: true,
    ...overrides,
  };
}

function localization(overrides = {}) {
  return {
    id: "localization-1",
    articleId: "article-1",
    locale: "en-GB",
    slug: "public-article",
    title: "Published article",
    subtitle: "Public subtitle",
    excerpt: "A stable public excerpt.",
    body: "A stable public body.",
    keywords: ["ai", "news"],
    metaTitle: "Published article | AI Landscape Brief",
    metaDescription: "A stable public meta description.",
    ...overrides,
  };
}

const publicArticleConfig = {
  locales: {
    defaultLocale: "en-GB",
    supportedLocales: ["en-GB", "uk-UA"],
  },
  taxonomy: [
    {
      key: "news",
      slug: "news",
      labels: {
        "en-GB": "News",
        "uk-UA": "Novyny",
      },
      isActive: true,
    },
  ],
};

const publicArticleFallbackConfig = {
  ...publicArticleConfig,
  taxonomy: [
    {
      key: "news",
      slug: "news",
      labels: {
        "en-GB": "News",
      },
      isActive: true,
    },
  ],
};
