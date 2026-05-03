import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getLocalePath, routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export interface LocaleSwitcherProps {
  readonly className?: string;
  readonly currentLocale: AppLocale;
  readonly homeLabel: string;
  readonly label: string;
}

export function LocaleSwitcher({ className, currentLocale, homeLabel, label }: LocaleSwitcherProps) {
  return (
    <nav
      aria-label={label}
      className={cn("flex flex-wrap items-center gap-2 text-sm text-muted-foreground", className)}
    >
      <span className="inline-flex items-center gap-1.5 font-medium">
        <Globe aria-hidden="true" className="size-4" />
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1">
        {routing.locales.map((locale) => {
          const isActive = locale === currentLocale;

          return (
            <Button
              asChild
              key={locale}
              size="sm"
              variant={isActive ? "secondary" : "ghost"}
            >
              <a
                aria-current={isActive ? "page" : undefined}
                aria-label={formatLocaleLinkLabel(locale, currentLocale, homeLabel)}
                href={getLocalePath(locale)}
                hrefLang={locale}
                lang={locale}
              >
                <span className="hidden sm:inline">{formatLocaleName(locale, currentLocale)}</span>
                <span aria-hidden="true" className="sm:hidden">
                  {formatShortLocale(locale)}
                </span>
              </a>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

function formatLocaleLinkLabel(
  locale: AppLocale,
  displayLocale: AppLocale,
  homeLabel: string,
): string {
  return `${formatLocaleName(locale, displayLocale)} ${homeLabel}`;
}

function formatLocaleName(locale: AppLocale, displayLocale: AppLocale): string {
  try {
    return new Intl.DisplayNames([displayLocale], { type: "language" }).of(locale) ?? locale;
  } catch {
    return locale;
  }
}

function formatShortLocale(locale: AppLocale): string {
  return locale.split("-")[0]?.toUpperCase() ?? locale.toUpperCase();
}
