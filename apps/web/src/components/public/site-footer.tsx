import { siteConfig } from "@topicpress/config";

import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export interface SiteFooterProps {
  readonly className?: string;
  readonly currentLocale: AppLocale;
  readonly localeLabel: string;
}

export function SiteFooter({ className, currentLocale, localeLabel }: SiteFooterProps) {
  return (
    <footer className={cn("border-t border-border bg-background", className)}>
      <div className="mx-auto flex w-[min(1180px,calc(100%_-_32px))] flex-col gap-2 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>
          &copy; {new Date().getUTCFullYear()} {siteConfig.identity.name}
        </p>
        <p>
          {localeLabel}:{" "}
          <span className="font-medium text-foreground" lang={currentLocale}>
            {formatLocaleName(currentLocale)}
          </span>
        </p>
      </div>
    </footer>
  );
}

function formatLocaleName(locale: AppLocale): string {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(locale) ?? locale;
  } catch {
    return locale;
  }
}
