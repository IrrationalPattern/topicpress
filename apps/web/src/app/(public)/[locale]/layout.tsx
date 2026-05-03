import { siteConfig } from "@topicpress/config";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  getLanguageAlternates,
  resolveAppLocale,
  routing,
  type AppLocale,
} from "@/i18n/routing";
import { siteThemeStyle } from "@/lib/site-theme";

import "../../globals.css";

interface PublicLocaleLayoutProps {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Pick<PublicLocaleLayoutProps, "params">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);

  if (locale === null) {
    return {};
  }

  return {
    title: {
      default: siteConfig.identity.name,
      template: `%s | ${siteConfig.identity.name}`,
    },
    description:
      siteConfig.seo.descriptions[locale] ??
      siteConfig.seo.descriptions[siteConfig.locales.defaultLocale],
    alternates: {
      languages: getLanguageAlternates(),
    },
  };
}

export default async function PublicLocaleLayout({ children, params }: PublicLocaleLayoutProps) {
  const locale = resolveLocale((await params).locale);

  if (locale === null) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} className="font-sans" style={siteThemeStyle}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}

function resolveLocale(locale: string): AppLocale | null {
  return resolveAppLocale(locale);
}
