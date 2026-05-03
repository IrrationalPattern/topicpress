import { siteConfig } from "@topicpress/config";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { HomepageContent } from "@/components/public/homepage-content";
import { getLanguageAlternates, resolveAppLocale, routing } from "@/i18n/routing";
import { getHomepageArticles } from "@/lib/public-homepage";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = resolveAppLocale(localeParam);

  if (locale === null) {
    return {};
  }

  const description = getLocalizedSeoDescription(locale);

  return {
    title: siteConfig.identity.name,
    description,
    alternates: {
      languages: getLanguageAlternates(),
    },
    openGraph: {
      title: siteConfig.identity.name,
      description,
      siteName: siteConfig.identity.name,
      locale,
      type: "website",
    },
  };
}

export default async function PublicLocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = resolveAppLocale(localeParam);

  if (locale === null) {
    notFound();
  }

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "PublicHomePage" });
  const articles = await getHomepageArticles(locale);

  return (
    <HomepageContent
      articleListAriaLabel={t("articles.ariaLabel")}
      articles={articles}
      categoryLabel={t("articles.categoryLabel")}
      dateLabel={t("articles.dateLabel")}
      description={getLocalizedSeoDescription(locale)}
      emptyStateDescription={t("articles.emptyStateDescription")}
      emptyStateTitle={t("articles.emptyStateTitle")}
      heading={t("articles.heading")}
      kicker={t("hero.kicker")}
      locale={locale}
      publishedCountLabel={t("hero.publishedCount", { count: articles.length })}
      slugLabel={t("articles.slugLabel")}
      title={siteConfig.identity.name}
    />
  );
}

function getLocalizedSeoDescription(locale: string): string {
  return (
    siteConfig.seo.descriptions[locale] ??
    siteConfig.seo.descriptions[siteConfig.locales.defaultLocale] ??
    ""
  );
}
