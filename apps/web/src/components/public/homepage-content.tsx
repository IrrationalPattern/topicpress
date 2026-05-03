import * as React from "react";

import type { HomepageArticle } from "@/lib/public-homepage";

import { ArticleList } from "./article-list";

export interface HomepageContentProps {
  readonly articleListAriaLabel: string;
  readonly articles: readonly HomepageArticle[];
  readonly categoryLabel: string;
  readonly dateLabel: string;
  readonly description: string;
  readonly emptyStateDescription: string;
  readonly emptyStateTitle: string;
  readonly heading: string;
  readonly kicker: string;
  readonly locale: string;
  readonly publishedCountLabel: string;
  readonly slugLabel: string;
  readonly title: string;
}

export function HomepageContent({
  articleListAriaLabel,
  articles,
  categoryLabel,
  dateLabel,
  description,
  emptyStateDescription,
  emptyStateTitle,
  heading,
  kicker,
  locale,
  publishedCountLabel,
  slugLabel,
  title,
}: HomepageContentProps) {
  return (
    <div className="flex flex-col gap-10 md:gap-12">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-6 font-medium tracking-normal text-muted-foreground uppercase">
            {kicker}
          </p>
          <h1 className="max-w-4xl text-balance font-heading text-4xl leading-tight font-semibold text-foreground md:text-6xl">
            {title}
          </h1>
        </div>
        <p className="max-w-3xl text-lg leading-8 text-muted-foreground">{description}</p>
        <p className="text-sm leading-6 font-medium text-muted-foreground">{publishedCountLabel}</p>
      </section>

      <ArticleList
        ariaLabel={articleListAriaLabel}
        articles={articles}
        categoryLabel={categoryLabel}
        dateLabel={dateLabel}
        description={description}
        emptyStateDescription={emptyStateDescription}
        emptyStateTitle={emptyStateTitle}
        heading={heading}
        locale={locale}
        slugLabel={slugLabel}
      />
    </div>
  );
}
