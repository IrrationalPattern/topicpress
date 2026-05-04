import * as React from "react";

import { Badge } from "@/components/ui/badge";
import type { HomepageArticle } from "@/lib/public-homepage";
import { cn } from "@/lib/utils";

import { ArticleList } from "./article-list";

export type CategoryListingHeadingLevel = "h1" | "h2";

export interface CategoryListingCategory {
  readonly configKey: string;
  readonly description?: string | undefined;
  readonly label: string;
  readonly slug: string;
}

export interface CategoryListingContentProps {
  readonly articleListAriaLabel: string;
  readonly articleStatus: string;
  readonly articles: readonly HomepageArticle[];
  readonly category: CategoryListingCategory;
  readonly categoryLabel: string;
  readonly className?: string | undefined;
  readonly dateLabel?: string | undefined;
  readonly emptyStateDescription?: React.ReactNode;
  readonly emptyStateTitle: React.ReactNode;
  readonly getCategoryHref?: ((article: HomepageArticle) => string | undefined) | undefined;
  readonly headingAs?: CategoryListingHeadingLevel | undefined;
  readonly locale: string;
  readonly slugLabel?: string | undefined;
}

export function CategoryListingContent({
  articleListAriaLabel,
  articleStatus,
  articles,
  category,
  categoryLabel,
  className,
  dateLabel,
  emptyStateDescription,
  emptyStateTitle,
  getCategoryHref,
  headingAs: Heading = "h1",
  locale,
  slugLabel,
}: CategoryListingContentProps) {
  const description = normalizeOptionalText(category.description);

  return (
    <div className={cn("flex flex-col gap-8 md:gap-10", className)}>
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{categoryLabel}</Badge>
          <Badge variant="secondary">{articleStatus}</Badge>
        </div>

        <div className="max-w-3xl">
          <Heading className="font-heading text-4xl leading-tight font-semibold text-foreground md:text-5xl">
            {category.label}
          </Heading>
          {description === undefined ? null : (
            <p className="mt-3 text-base leading-7 text-muted-foreground md:text-lg">
              {description}
            </p>
          )}
        </div>
      </header>

      <ArticleList
        ariaLabel={articleListAriaLabel}
        articles={articles}
        categoryLabel={categoryLabel}
        dateLabel={dateLabel}
        emptyStateDescription={emptyStateDescription}
        emptyStateTitle={emptyStateTitle}
        getCategoryHref={getCategoryHref}
        locale={locale}
        slugLabel={slugLabel}
      />
    </div>
  );
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}
