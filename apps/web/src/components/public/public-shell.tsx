import { siteConfig } from "@topicpress/config";
import type { ReactNode } from "react";

import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export interface PublicShellProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly currentLocale: AppLocale;
  readonly footerLocaleLabel: string;
  readonly homeLabel: string;
  readonly localeSwitcherLabel: string;
  readonly primaryNavLabel: string;
  readonly skipContentLabel: string;
}

export function PublicShell({
  children,
  className,
  currentLocale,
  footerLocaleLabel,
  homeLabel,
  localeSwitcherLabel,
  primaryNavLabel,
  skipContentLabel,
}: PublicShellProps) {
  const tagline =
    siteConfig.identity.tagline[currentLocale] ??
    siteConfig.identity.tagline[siteConfig.locales.defaultLocale] ??
    "";

  return (
    <div className={cn("flex min-h-dvh flex-col bg-background text-foreground", className)}>
      <a
        className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-3 focus:ring-ring/50"
        href="#main-content"
      >
        {skipContentLabel}
      </a>
      <SiteHeader
        currentLocale={currentLocale}
        homeLabel={homeLabel}
        localeSwitcherLabel={localeSwitcherLabel}
        primaryNavLabel={primaryNavLabel}
        siteName={siteConfig.identity.name}
        tagline={tagline}
      />
      <main
        className="mx-auto w-[min(1180px,calc(100%_-_32px))] flex-1 py-8 md:py-10"
        id="main-content"
      >
        {children}
      </main>
      <SiteFooter currentLocale={currentLocale} localeLabel={footerLocaleLabel} />
    </div>
  );
}
