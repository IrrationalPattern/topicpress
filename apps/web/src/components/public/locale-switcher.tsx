"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLocalePath, routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export interface LocaleSwitcherProps {
  readonly className?: string;
  readonly currentLocale: AppLocale;
  readonly label: string;
}

export function LocaleSwitcher({ className, currentLocale, label }: LocaleSwitcherProps) {
  const currentLocaleName = formatLocaleName(currentLocale, currentLocale);

  return (
    <nav
      aria-label={label}
      className={cn("flex flex-wrap items-center gap-2 text-sm text-muted-foreground", className)}
    >
      <Select
        onValueChange={(value) => {
          const nextLocale = value as AppLocale;

          if (nextLocale !== currentLocale) {
            window.location.assign(getLocalePath(nextLocale));
          }
        }}
        value={currentLocale}
      >
        <SelectTrigger
          aria-label={label}
          className="min-w-44 bg-secondary text-secondary-foreground hover:bg-secondary/80"
          size="sm"
        >
          <SelectValue placeholder={currentLocaleName}>{currentLocaleName}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            {routing.locales.map((locale) => (
              <SelectItem key={locale} lang={locale} value={locale}>
                {formatLocaleName(locale, currentLocale)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </nav>
  );
}

function formatLocaleName(locale: AppLocale, displayLocale: AppLocale): string {
  try {
    return new Intl.DisplayNames([displayLocale], { type: "language" }).of(locale) ?? locale;
  } catch {
    return locale;
  }
}
