import { getLocalePath, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

import { LocaleSwitcher } from "./locale-switcher";

export interface SiteHeaderProps {
  readonly className?: string;
  readonly currentLocale: AppLocale;
  readonly homeLabel: string;
  readonly localeSwitcherLabel: string;
  readonly siteName: string;
}

export function SiteHeader({
  className,
  currentLocale,
  homeLabel,
  localeSwitcherLabel,
  siteName,
}: SiteHeaderProps) {
  const homePath = getLocalePath(currentLocale);

  return (
    <header className={cn("border-b border-border bg-background", className)}>
      <div className="mx-auto flex w-[min(1180px,calc(100%_-_32px))] flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <a
            aria-label={`${siteName} ${homeLabel}`}
            className="inline-flex max-w-full flex-col gap-1 outline-none focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50"
            href={homePath}
          >
            <span className="font-heading text-2xl leading-none font-semibold text-foreground">
              {siteName}
            </span>
          </a>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:justify-end">
          <LocaleSwitcher currentLocale={currentLocale} label={localeSwitcherLabel} />
        </div>
      </div>
    </header>
  );
}
