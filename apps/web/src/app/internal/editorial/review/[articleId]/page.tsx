import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { getArticleReview, type ArticleReviewArticle } from "../../../../../lib/article-review";
import { ReviewActionsPanel } from "./review-actions-panel";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;

  return {
    title: `Review ${articleId} | Topicpress`,
  };
}

export default async function ArticleReviewDetailPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  const result = await getArticleReview(articleId);

  if (!result.ok) {
    if (result.error.code === "not_found") {
      notFound();
    }

    throw new Error(result.error.message);
  }

  return <ArticleReviewDetail article={result.article} />;
}

function ArticleReviewDetail({ article }: { article: ArticleReviewArticle }) {
  const localization = article.primaryLocalization;

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div>
          <p className="workspace-kicker">Internal editorial</p>
          <h1 className="workspace-title">{localization?.title ?? "Untitled generated draft"}</h1>
          <p className="workspace-subtitle">
            Generated draft inspection with review-gated publishing actions through the worker
            service boundary.
          </p>
        </div>
        <Link className="button-link" href="/internal/editorial/review">
          Back to review list
        </Link>
      </header>

      <div className="detail-grid">
        <div className="stack">
          <Panel title="Article content">
            <div className="field-grid">
              <Field label="Title" value={localization?.title} />
              <Field label="Subtitle" value={localization?.subtitle} />
            </div>
            <Field label="Excerpt" value={localization?.excerpt} />
            <div className="field">
              <p className="field-label">Body</p>
              <p className="article-body">{localization?.body ?? "Not provided"}</p>
            </div>
          </Panel>

          <Panel title="SEO fields">
            <div className="field-grid">
              <Field label="Meta title" value={localization?.metaTitle} />
              <Field label="Meta description" value={localization?.metaDescription} />
              <Field label="Keywords" value={formatKeywords(localization?.keywords)} />
              <Field label="Localization slug" value={localization?.slug} />
            </div>
          </Panel>

          <Panel title="Source lineage and citations">
            {article.sources.length === 0 ? (
              <p className="muted">No source lineage was returned.</p>
            ) : (
              <div className="source-list">
                {article.sources.map((source) => (
                  <div className="source-item" key={source.articleSourceId}>
                    <div className="badge-group">
                      <span className="badge">{source.role}</span>
                      {source.isClusterPrimary ? <span className="badge badge-ok">cluster primary</span> : null}
                      <span className={source.source.isActive ? "badge badge-ok" : "badge badge-warn"}>
                        {source.source.kind}
                      </span>
                    </div>
                    <h3 className="row-title">{source.sourceItem.title}</h3>
                    <p className="row-meta">
                      {source.source.name} - {source.source.slug} - {source.sourceItem.language}
                    </p>
                    <p>{source.sourceItem.summary ?? source.sourceItem.contentText ?? "No summary available."}</p>
                    {source.sourceItem.externalUrl === null ? (
                      <p className="muted">No external citation URL.</p>
                    ) : (
                      <a className="text-link" href={source.sourceItem.externalUrl}>
                        Open source
                      </a>
                    )}
                    <p className="row-meta">
                      Published {formatDateTime(source.sourceItem.publishedAt)} - fetched{" "}
                      {formatDateTime(source.sourceItem.fetchedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <aside className="stack" aria-label="Review metadata">
          <Panel title="Review state">
            <div className="badge-group">
              <StatusBadge status={article.status} />
              <ValidationBadge ok={article.validation.ok} issueCount={article.validation.issues.length} />
            </div>
            <div className="field-grid">
              <Field label="Article id" value={article.id} />
              <Field label="Slug" value={article.slug} />
              <Field label="Primary locale" value={article.primaryLocale} />
              <Field label="Published at" value={formatDateTime(article.publishedAt)} />
              <Field label="Updated" value={formatDateTime(article.updatedAt)} />
              <Field label="Created" value={formatDateTime(article.createdAt)} />
            </div>
          </Panel>

          <Panel title="Editorial actions">
            <ReviewActionsPanel articleId={article.id} status={article.status} />
          </Panel>

          <Panel title="Category and cluster">
            <div className="field-grid">
              <Field label="Category" value={article.category.name} />
              <Field label="Category slug" value={article.category.slug} />
              <Field label="Category active" value={article.category.isActive ? "yes" : "no"} />
              <Field label="Cluster status" value={article.storyCluster.status} />
            </div>
            <Field label="Cluster topic" value={article.storyCluster.canonicalTopic} />
            <Field label="Cluster summary" value={article.storyCluster.summary} />
          </Panel>

          <Panel title="Validation state">
            {article.validation.ok ? (
              <p className="muted">BE-401 validation reports this review draft is eligible for ready status.</p>
            ) : (
              <ul>
                {article.validation.issues.map((issue) => (
                  <li key={`${issue.code}:${issue.message}`}>
                    <strong>{issue.code}</strong>: {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Review notes">
            <p className="article-body">{article.reviewNotes ?? "No review notes recorded."}</p>
          </Panel>

          <Panel title="Generation metadata summary">
            <pre className="code-block">{formatJsonSummary(article.generationMetadata)}</pre>
          </Panel>
        </aside>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel" aria-labelledby={headingId(title)}>
      <div className="panel-header">
        <h2 className="panel-title" id={headingId(title)}>
          {title}
        </h2>
      </div>
      <div className="panel-body stack">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="field">
      <p className="field-label">{label}</p>
      <p className="field-value">{isBlank(value) ? "Not provided" : value}</p>
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

function formatKeywords(keywords: unknown): string {
  if (Array.isArray(keywords)) {
    return keywords.join(", ");
  }

  return typeof keywords === "string" ? keywords : "";
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

function formatJsonSummary(value: ArticleReviewArticle["generationMetadata"]): string {
  return JSON.stringify(value, null, 2);
}

function headingId(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function isBlank(value: string | null | undefined): boolean {
  return value === undefined || value === null || value.trim().length === 0;
}
