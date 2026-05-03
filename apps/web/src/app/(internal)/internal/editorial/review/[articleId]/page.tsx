import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleStatusBadge, ValidationBadge } from "@/components/app/article-badges";
import { Field, MissingValue } from "@/components/app/field";
import { Panel } from "@/components/app/panel";
import { WorkspaceHeader } from "@/components/app/workspace-header";
import { WorkspaceShell } from "@/components/app/workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { getArticleReview, type ArticleReviewArticle } from "@/lib/article-review";
import { ReviewActionsPanel } from "./review-actions-panel";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ articleId: string }> }) {
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
    <WorkspaceShell>
      <WorkspaceHeader
        action={
          <Button asChild variant="outline">
            <Link href="/internal/editorial/review">Back to review list</Link>
          </Button>
        }
        kicker="Internal editorial"
        subtitle="Generated draft inspection with review-gated publishing actions through the worker service boundary."
        title={localization?.title ?? "Untitled generated draft"}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="flex flex-col gap-4">
          <Panel title="Article content">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Title" value={<MissingValue value={localization?.title} />} />
              <Field label="Subtitle" value={<MissingValue value={localization?.subtitle} />} />
            </div>
            <Field label="Excerpt" value={<MissingValue value={localization?.excerpt} />} />
            <Field
              label="Body"
              value={<p className="whitespace-pre-wrap">{localization?.body ?? "Not provided"}</p>}
            />
          </Panel>

          <Panel title="SEO fields">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Meta title" value={<MissingValue value={localization?.metaTitle} />} />
              <Field
                label="Meta description"
                value={<MissingValue value={localization?.metaDescription} />}
              />
              <Field label="Keywords" value={formatKeywords(localization?.keywords)} />
              <Field
                label="Localization slug"
                value={<MissingValue value={localization?.slug} />}
              />
            </div>
          </Panel>

          <Panel title="Source lineage and citations">
            {article.sources.length === 0 ? (
              <p className="text-muted-foreground">No source lineage was returned.</p>
            ) : (
              <div className="grid gap-3">
                {article.sources.map((source) => (
                  <div
                    className="border-b pb-3 last:border-b-0 last:pb-0"
                    key={source.articleSourceId}
                  >
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{source.role}</Badge>
                      {source.isClusterPrimary ? <Badge>cluster primary</Badge> : null}
                      <Badge variant={source.source.isActive ? "default" : "outline"}>
                        {source.source.kind}
                      </Badge>
                    </div>
                    <h3 className="mt-2 font-bold">{source.sourceItem.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {source.source.name} - {source.source.slug} - {source.sourceItem.language}
                    </p>
                    <p>
                      {source.sourceItem.summary ??
                        source.sourceItem.contentText ??
                        "No summary available."}
                    </p>
                    {source.sourceItem.externalUrl === null ? (
                      <p className="text-muted-foreground">No external citation URL.</p>
                    ) : (
                      <a
                        className="font-bold text-accent underline-offset-4 hover:underline"
                        href={source.sourceItem.externalUrl}
                      >
                        Open source
                      </a>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">
                      Published {formatDateTime(source.sourceItem.publishedAt)} - fetched{" "}
                      {formatDateTime(source.sourceItem.fetchedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <aside className="flex flex-col gap-4" aria-label="Review metadata">
          <Panel title="Review state">
            <div className="flex flex-wrap gap-1.5">
              <ArticleStatusBadge status={article.status} />
              <ValidationBadge
                ok={article.validation.ok}
                issueCount={article.validation.issues.length}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
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
            <div className="grid gap-3 md:grid-cols-2">
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
              <p className="text-muted-foreground">
                This review draft is eligible for ready status.
              </p>
            ) : (
              <ul className="list-disc pl-5">
                {article.validation.issues.map((issue) => (
                  <li key={`${issue.code}:${issue.message}`}>
                    <strong>{issue.code}</strong>: {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Review notes">
            <p className="whitespace-pre-wrap">
              {article.reviewNotes ?? "No review notes recorded."}
            </p>
          </Panel>

          <Panel title="Generation metadata summary">
            <pre className="overflow-auto rounded-md bg-foreground p-3 text-sm whitespace-pre-wrap text-background">
              {formatJsonSummary(article.generationMetadata)}
            </pre>
          </Panel>
        </aside>
      </div>
    </WorkspaceShell>
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
