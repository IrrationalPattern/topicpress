import { CalendarDays } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import type { PublicArticleDetail } from "@/lib/public-article-detail";
import { cn } from "@/lib/utils";

export interface ArticleDetailContentProps {
  readonly article: PublicArticleDetail;
  readonly categoryHref: string;
  readonly categoryLabel: string;
  readonly className?: string | undefined;
  readonly dateLabel: string;
  readonly locale: string;
}

export function ArticleDetailContent({
  article,
  categoryHref,
  categoryLabel,
  className,
  dateLabel,
  locale,
}: ArticleDetailContentProps) {
  const formattedDate = formatPublishedDate(article.publishedAt, locale);
  const heroImageUrl = normalizeOptionalText(article.heroImageUrl);
  const subtitle = normalizeOptionalText(article.subtitle);
  const paragraphs = getPlainTextParagraphs(article.body);

  return (
    <article className={cn("mx-auto flex w-full max-w-3xl flex-col gap-8", className)}>
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge asChild className="max-w-full" variant="secondary">
            <Link href={categoryHref}>
              <span className="sr-only">{categoryLabel}: </span>
              <span className="truncate">{article.category.label}</span>
            </Link>
          </Badge>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
            <time
              aria-label={`${dateLabel}: ${formattedDate}`}
              dateTime={article.publishedAt.toISOString()}
            >
              {formattedDate}
            </time>
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="font-heading text-4xl leading-tight font-semibold text-foreground md:text-5xl">
            {article.title}
          </h1>
          {subtitle === undefined ? null : (
            <p className="text-lg leading-8 text-muted-foreground md:text-xl">{subtitle}</p>
          )}
          <p className="text-base leading-7 text-foreground md:text-lg">{article.excerpt}</p>
        </div>
      </header>

      {heroImageUrl === undefined ? null : (
        <figure className="flex flex-col gap-2">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted">
            {React.createElement("img", {
              alt: "",
              className: "size-full object-cover",
              decoding: "async",
              loading: "eager",
              src: heroImageUrl,
            })}
          </div>
          {article.heroImageDisclosure === undefined ? null : (
            <figcaption>
              <Badge variant="secondary">{article.heroImageDisclosure.label}</Badge>
            </figcaption>
          )}
        </figure>
      )}

      <div className="flex flex-col gap-5 text-base leading-8 text-foreground md:text-lg md:leading-9">
        {paragraphs.map((paragraph, index) => (
          <p key={`${index}-${paragraph.slice(0, 32)}`} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}

export function getPlainTextParagraphs(body: string): readonly string[] {
  return body
    .replace(/\0/g, "")
    .trim()
    .split(/\r?\n(?:[ \t]*\r?\n)+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

function formatPublishedDate(date: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
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
