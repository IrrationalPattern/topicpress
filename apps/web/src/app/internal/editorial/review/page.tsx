import Link from "next/link";

import { getReviewableArticles, type ArticleReviewArticle } from "../../../../lib/article-review";

export const metadata = {
  title: "Editorial review | Topicpress",
};

export const dynamic = "force-dynamic";

export default async function EditorialReviewPage() {
  const articles = await getReviewableArticles();

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div>
          <p className="workspace-kicker">Internal editorial</p>
          <h1 className="workspace-title">Generated draft review</h1>
          <p className="workspace-subtitle">
            Inspect generated drafts and open an article to run review-gated publishing actions.
          </p>
        </div>
      </header>

      <section className="panel" aria-labelledby="review-list-title">
        <div className="panel-header">
          <div>
            <h2 className="panel-title" id="review-list-title">
              Reviewable articles
            </h2>
            <p className="row-meta">{articles.length} loaded from the BE-401 review boundary</p>
          </div>
        </div>

        {articles.length === 0 ? (
          <div className="panel-body">
            <EmptyReviewState />
          </div>
        ) : (
          <div className="review-list">
            {articles.map((article) => (
              <ReviewArticleRow key={article.id} article={article} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function ReviewArticleRow({ article }: { article: ArticleReviewArticle }) {
  const title = article.primaryLocalization?.title ?? "Untitled generated draft";
  const sourceCount = article.sources.length;
  const metadataKeys = getObjectKeys(article.generationMetadata);

  return (
    <Link className="review-row" href={`/internal/editorial/review/${article.id}`}>
      <div>
        <p className="row-title">{title}</p>
        <p className="row-meta">
          {article.slug} - {article.primaryLocale} - updated {formatDateTime(article.updatedAt)}
        </p>
      </div>
      <div className="badge-group" aria-label="Article status">
        <StatusBadge status={article.status} />
        <ValidationBadge ok={article.validation.ok} issueCount={article.validation.issues.length} />
      </div>
      <div>
        <p className="field-label">Category</p>
        <p className="field-value">{article.category.name}</p>
        <p className="row-meta">{article.category.slug}</p>
      </div>
      <div>
        <p className="field-label">Signals</p>
        <p className="field-value">
          {sourceCount} source{sourceCount === 1 ? "" : "s"}
        </p>
        <p className="row-meta">
          {metadataKeys.length} metadata key{metadataKeys.length === 1 ? "" : "s"}
        </p>
      </div>
    </Link>
  );
}

function EmptyReviewState() {
  return (
    <div className="state-box">
      <h2 className="panel-title">No reviewable drafts</h2>
      <p className="muted">
        No draft, review, or ready articles were returned. Run the M3 generation path or check the
        local database connection if drafts were expected.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: ArticleReviewArticle["status"] }) {
  const className = status === "failed" ? "badge badge-danger" : "badge";

  return <span className={className}>{status}</span>;
}

function ValidationBadge({ ok, issueCount }: { ok: boolean; issueCount: number }) {
  return (
    <span className={ok ? "badge badge-ok" : "badge badge-warn"}>
      {ok ? "ready-valid" : `${issueCount} validation issue${issueCount === 1 ? "" : "s"}`}
    </span>
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
