import * as React from "react";

import type { HomepageArticle } from "@/lib/public-homepage";
import { cn } from "@/lib/utils";

import { ArticleCard, type ArticleCardHeadingLevel } from "./article-card";
import { HomeEmptyState, type HomeEmptyStateHeadingLevel } from "./home-empty-state";

export type ArticleListHeadingLevel = "h1" | "h2";

export interface ArticleListProps {
  readonly ariaLabel: string;
  readonly articles: readonly HomepageArticle[];
  readonly categoryLabel?: string | undefined;
  readonly className?: string | undefined;
  readonly dateLabel?: string | undefined;
  readonly description?: React.ReactNode;
  readonly emptyStateAction?: React.ReactNode;
  readonly emptyStateDescription?: React.ReactNode;
  readonly emptyStateTitle: React.ReactNode;
  readonly getCategoryHref?: ((article: HomepageArticle) => string | undefined) | undefined;
  readonly heading?: React.ReactNode;
  readonly headingAs?: ArticleListHeadingLevel | undefined;
  readonly locale: string;
  readonly slugLabel?: string | undefined;
}

export function ArticleList({
  ariaLabel,
  articles,
  categoryLabel,
  className,
  dateLabel,
  description,
  emptyStateAction,
  emptyStateDescription,
  emptyStateTitle,
  getCategoryHref,
  heading,
  headingAs: Heading = "h2",
  locale,
  slugLabel,
}: ArticleListProps) {
  const ListHeading: React.ElementType = Heading;
  const articleTitleLevel: ArticleCardHeadingLevel = heading === undefined ? "h2" : "h3";
  const emptyStateTitleLevel: HomeEmptyStateHeadingLevel = heading === undefined ? "h2" : "h3";

  return (
    <section aria-label={ariaLabel} className={cn("flex flex-col gap-6", className)}>
      {heading === undefined ? null : (
        <div className="max-w-3xl">
          <ListHeading className="font-heading text-3xl leading-tight font-semibold text-foreground md:text-4xl">
            {heading}
          </ListHeading>
          {description === undefined ? null : (
            <div className="mt-2 text-base leading-7 text-muted-foreground">{description}</div>
          )}
        </div>
      )}

      {articles.length === 0 ? (
        <HomeEmptyState
          action={emptyStateAction}
          description={emptyStateDescription}
          title={emptyStateTitle}
          titleAs={emptyStateTitleLevel}
        />
      ) : (
        <ul className="grid list-none gap-4 p-0 md:grid-cols-2 lg:gap-5">
          {articles.map((article) => (
            <li key={article.id} className="min-w-0">
              <ArticleCard
                article={article}
                categoryHref={getCategoryHref?.(article)}
                categoryLabel={categoryLabel}
                dateLabel={dateLabel}
                locale={locale}
                slugLabel={slugLabel}
                titleAs={articleTitleLevel}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
