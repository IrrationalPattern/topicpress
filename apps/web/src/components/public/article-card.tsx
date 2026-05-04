import { CalendarDays, FileText } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HomepageArticle } from "@/lib/public-homepage";
import { cn } from "@/lib/utils";

export type ArticleCardHeadingLevel = "h2" | "h3";

export interface ArticleCardProps {
  readonly article: HomepageArticle;
  readonly categoryHref?: string | undefined;
  readonly categoryLabel?: string | undefined;
  readonly className?: string | undefined;
  readonly dateLabel?: string | undefined;
  readonly locale: string;
  readonly slugLabel?: string | undefined;
  readonly titleAs?: ArticleCardHeadingLevel | undefined;
}

export function ArticleCard({
  article,
  categoryHref,
  categoryLabel,
  className,
  dateLabel,
  locale,
  slugLabel,
  titleAs: Heading = "h2",
}: ArticleCardProps) {
  const ArticleHeading: React.ElementType = Heading;
  const formattedDate = formatPublishedDate(article.publishedAt, locale);
  const heroImageUrl = normalizeOptionalText(article.heroImageUrl);
  const subtitle = normalizeOptionalText(article.subtitle);
  const displaySlug = normalizeOptionalText(article.displaySlug) ?? article.slug;

  return (
    <article className={cn("h-full", className)}>
      <Card className="h-full rounded-lg py-0">
        {heroImageUrl === undefined ? null : (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
            <Image
              alt=""
              className="size-full object-cover"
              fill
              sizes="(min-width: 1024px) 560px, (min-width: 768px) 50vw, 100vw"
              src={heroImageUrl}
              unoptimized
            />
          </div>
        )}

        <CardHeader className="gap-3 pt-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <ArticleCategoryBadge
              href={categoryHref}
              label={categoryLabel}
              value={article.category.label}
            />
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
              <time
                aria-label={
                  dateLabel === undefined ? undefined : `${dateLabel}: ${formattedDate}`
                }
                dateTime={article.publishedAt.toISOString()}
              >
                {formattedDate}
              </time>
            </span>
          </div>

          <CardTitle className="text-xl leading-tight md:text-2xl">
            <ArticleHeading className="text-balance">{article.title}</ArticleHeading>
          </CardTitle>

          {subtitle === undefined ? null : (
            <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>
          )}
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4 pb-4">
          <p className="line-clamp-4 text-base leading-7 text-card-foreground/90">
            {article.excerpt}
          </p>
          <div className="mt-auto flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <FileText aria-hidden="true" className="size-3.5 shrink-0" />
            {slugLabel === undefined ? null : <span className="sr-only">{slugLabel}: </span>}
            <span className="truncate font-mono">{displaySlug}</span>
          </div>
        </CardContent>
      </Card>
    </article>
  );
}

interface ArticleCategoryBadgeProps {
  readonly href?: string | undefined;
  readonly label?: string | undefined;
  readonly value: string;
}

function ArticleCategoryBadge({ href, label, value }: ArticleCategoryBadgeProps) {
  const content = (
    <>
      {label === undefined ? null : <span className="sr-only">{label}: </span>}
      <span className="truncate">{value}</span>
    </>
  );

  if (href === undefined) {
    return (
      <Badge className="max-w-full" variant="secondary">
        {content}
      </Badge>
    );
  }

  return (
    <Badge asChild className="max-w-full" variant="secondary">
      <Link href={href}>{content}</Link>
    </Badge>
  );
}

function formatPublishedDate(date: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}
