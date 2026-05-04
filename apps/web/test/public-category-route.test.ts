import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import { siteConfig } from "@topicpress/config";

import { getLocalePathSegment, routing, type AppLocale } from "../src/i18n/routing.ts";
import {
  getPublicCategoryPath,
  isCategorySlugSegment,
  resolvePublicCategoryRouteParams,
} from "../src/lib/public-category-routing.ts";
import { config as middlewareConfig } from "../src/middleware.ts";

function runTest(name: string, testBody: () => void): void {
  testBody();
  console.log(`ok - ${name}`);
}

const activeCategory = siteConfig.taxonomy.find((category) => category.isActive);

if (activeCategory === undefined) {
  throw new Error("Expected at least one active configured category for route scaffold tests.");
}

runTest("supported locale category routes derive the configured public path shape", () => {
  for (const locale of routing.locales) {
    const categoryPath = getPublicCategoryPath(locale, activeCategory.slug);

    assert.equal(
      categoryPath,
      `/${getLocalePathSegment(locale)}/categories/${activeCategory.slug}`,
    );
    assert.deepEqual(resolvePublicCategoryRouteParams({ locale, categorySlug: activeCategory.slug }), {
      locale,
      categorySlug: activeCategory.slug,
    });
  }
});

runTest("visible supported locale path segments resolve for category routes", () => {
  for (const locale of routing.locales) {
    const localeSegment = getLocalePathSegment(locale);

    assert.deepEqual(
      resolvePublicCategoryRouteParams({
        locale: localeSegment,
        categorySlug: activeCategory.slug,
      }),
      {
        locale: locale as AppLocale,
        categorySlug: activeCategory.slug,
      },
    );
  }
});

runTest("unsupported locale and invalid category slug shapes resolve to route not-found", () => {
  assert.equal(
    resolvePublicCategoryRouteParams({ locale: "fr-fr", categorySlug: activeCategory.slug }),
    null,
  );
  assert.equal(resolvePublicCategoryRouteParams({ locale: "en-gb", categorySlug: "Bad_Slug" }), null);
  assert.equal(isCategorySlugSegment("model-releases"), true);
  assert.equal(isCategorySlugSegment("model--releases"), false);
});

runTest("category route files exist without adding deferred public route surfaces", () => {
  assert.equal(
    existsSync("src/app/(public)/[locale]/categories/[categorySlug]/page.tsx"),
    true,
  );
  assert.equal(
    existsSync("src/app/(public)/[locale]/categories/[categorySlug]/loading.tsx"),
    true,
  );
  assert.equal(existsSync("src/app/(public)/[locale]/articles"), false);
  assert.equal(existsSync("src/app/(public)/[locale]/archive"), false);
  assert.equal(existsSync("src/app/robots.ts"), false);
  assert.equal(existsSync("src/app/sitemap.ts"), false);
});

runTest("existing root homepage and internal route surfaces remain present", () => {
  assert.deepEqual(middlewareConfig.matcher, ["/", "/(en-gb|uk-ua)/:path*"]);
  assert.equal(existsSync("src/app/(public)/[locale]/page.tsx"), true);
  assert.equal(existsSync("src/app/(internal)/internal/editorial/review/page.tsx"), true);
});
