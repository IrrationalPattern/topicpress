import Link from "next/link";

import { ArticleStatusBadge, ValidationBadge } from "@/components/app/article-badges";
import { Panel } from "@/components/app/panel";
import { WorkspaceHeader } from "@/components/app/workspace-header";
import { WorkspaceShell } from "@/components/app/workspace-shell";

import { getReviewableArticles, type ArticleReviewArticle } from "../../../../lib/article-review";

export const metadata = {
  title: "Editorial review | Topicpress",
};

export const dynamic = "force-dynamic";

export default async function EditorialReviewPage() {
  const articles = await getReviewableArticles();

  return (
    <WorkspaceShell>
      <WorkspaceHeader
        kicker="Internal editorial"
        subtitle="Inspect generated drafts and open an article to run review-gated publishing actions."
        title="Generated draft review"
      />

      <Panel
        description={`${articles.length} reviewable article${articles.length === 1 ? "" : "s"} loaded`}
        title="Reviewable articles"
        {...(articles.length === 0 ? {} : { contentClassName: "gap-2 p-3" })}
      >
        {articles.length === 0 ? (
          <EmptyReviewState />
        ) : (
          <div className="grid gap-2">
            {articles.map((article) => (
              <ReviewArticleRow key={article.id} article={article} />
            ))}
          </div>
        )}
      </Panel>
    </WorkspaceShell>
  );
}

function ReviewArticleRow({ article }: { article: ArticleReviewArticle }) {
  const title = article.primaryLocalization?.title ?? "Untitled generated draft";
  const sourceCount = article.sources.length;
  const metadataKeys = getObjectKeys(article.generationMetadata);

  return (
    <Link
      className="grid grid-cols-1 items-center gap-3 rounded-lg border bg-card p-3 text-card-foreground no-underline transition-colors hover:border-accent md:grid-cols-[minmax(0,1.6fr)_minmax(140px,0.6fr)_minmax(150px,0.8fr)_minmax(140px,0.6fr)]"
      href={`/internal/editorial/review/${article.id}`}
    >
      <div className="min-w-0">
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {article.slug} - {article.primaryLocale} - updated {formatDateTime(article.updatedAt)}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5" aria-label="Article status">
        <ArticleStatusBadge status={article.status} />
        <ValidationBadge ok={article.validation.ok} issueCount={article.validation.issues.length} />
      </div>
      <div>
        <p className="mb-1 text-xs font-bold tracking-normal text-muted-foreground uppercase">
          Category
        </p>
        <p>{article.category.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">{article.category.slug}</p>
      </div>
      <div>
        <p className="mb-1 text-xs font-bold tracking-normal text-muted-foreground uppercase">
          Signals
        </p>
        <p>
          {sourceCount} source{sourceCount === 1 ? "" : "s"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {metadataKeys.length} metadata key{metadataKeys.length === 1 ? "" : "s"}
        </p>
      </div>
    </Link>
  );
}

function EmptyReviewState() {
  return (
    <div className="rounded-lg border border-dashed p-6">
      <h3 className="font-heading text-lg leading-snug font-semibold">No reviewable drafts</h3>
      <p className="mt-2 text-muted-foreground">
        No draft, review, or ready articles were returned. Generate draft articles or check the
        local database connection if drafts were expected.
      </p>
    </div>
  );
}

function getObjectKeys(value: ArticleReviewArticle["generationMetadata"]): readonly string[] {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.keys(value)
    : [];
}

function formatDateTime(value: Date | null): string {
  if (value === null) {
    return "not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
