import * as React from "react";

import type { HomepageArticle } from "@/lib/public-homepage";

import { ArticleList } from "./article-list";
import { getActiveCategoryRouteHref } from "./category-links";

export interface HomepageContentProps {
  readonly articleListAriaLabel: string;
  readonly articles: readonly HomepageArticle[];
  readonly categoryLabel: string;
  readonly dateLabel: string;
  readonly description: string;
  readonly emptyStateDescription: string;
  readonly emptyStateTitle: string;
  readonly heading: string;
  readonly locale: string;
  readonly slugLabel: string;
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
  locale,
  slugLabel,
}: HomepageContentProps) {
  return (
    <div className="flex flex-col gap-10 md:gap-12">
      <ArticleList
        ariaLabel={articleListAriaLabel}
        articles={articles}
        categoryLabel={categoryLabel}
        dateLabel={dateLabel}
        description={description}
        emptyStateDescription={emptyStateDescription}
        emptyStateTitle={emptyStateTitle}
        getCategoryHref={(article) => getActiveCategoryRouteHref(locale, article.category)}
        heading={heading}
        headingAs="h1"
        locale={locale}
        slugLabel={slugLabel}
      />
    </div>
  );
}
