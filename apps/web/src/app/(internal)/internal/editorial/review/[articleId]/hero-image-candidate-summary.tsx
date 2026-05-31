import { ImageIcon } from "lucide-react";
import * as React from "react";

import type { ArticleReviewArticle } from "@topicpress/worker";

import { Field, MissingValue } from "@/components/app/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function HeroImageCandidateSummary({ article }: { readonly article: ArticleReviewArticle }) {
  const candidate = article.heroImageCandidate;

  if (candidate === null) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyHeroImageState heroImageUrl={article.heroImageUrl} />
      </div>
    );
  }

  const publicUrl = normalizeOptionalText(candidate.publicUrl) ?? normalizeOptionalText(article.heroImageUrl);
  const showDisclosure = candidate.status === "generated";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <HeroImagePreview publicUrl={publicUrl} status={candidate.status} />
        <div className="flex flex-wrap gap-1.5">
          <Badge>{formatHeroImageStatus(candidate.status)}</Badge>
          {showDisclosure ? <Badge variant="secondary">AI-generated illustration</Badge> : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Provider" value={<MissingValue value={candidate.provider} />} />
        <Field label="Model" value={<MissingValue value={candidate.model} />} />
        <Field label="Style policy" value={<MissingValue value={candidate.stylePolicy} />} />
        <Field label="Prompt hash" value={<MissingValue value={candidate.promptHash} />} />
        <Field label="Content type" value={<MissingValue value={candidate.contentType} />} />
        <Field label="Dimensions" value={formatDimensions(candidate.width, candidate.height)} />
        <Field label="File size" value={formatFileSize(candidate.sizeBytes)} />
        <Field label="Generated" value={formatDateTime(candidate.generatedAt)} />
      </div>

      {publicUrl === undefined ? null : (
        <Field
          label="Current public URL"
          value={
            <a className="font-bold text-accent underline-offset-4 hover:underline" href={publicUrl}>
              {publicUrl}
            </a>
          }
        />
      )}

      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer font-bold">Sanitized prompt</summary>
        <pre className="mt-3 overflow-auto rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
          {redactUnsafeText(candidate.prompt)}
        </pre>
      </details>

      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer font-bold">Sanitized generation metadata</summary>
        <pre className="mt-3 overflow-auto rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
          {formatSafeJsonSummary(candidate.generationMetadata)}
        </pre>
      </details>

      <Field
        label="Image notes"
        value={<p className="whitespace-pre-wrap">{candidate.reviewNotes ?? "No image notes recorded."}</p>}
      />
    </div>
  );
}

function HeroImagePreview({
  publicUrl,
  status,
}: {
  readonly publicUrl: string | undefined;
  readonly status: string;
}) {
  if (publicUrl !== undefined) {
    return (
      <div
        aria-label="Generated hero image preview"
        className="aspect-[16/9] w-full rounded-lg bg-muted bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url("${publicUrl}")` }}
      />
    );
  }

  const copy = copyForPreviewState(status);

  return (
    <div className="flex aspect-[16/9] w-full flex-col items-center justify-center rounded-lg border border-dashed bg-muted p-4 text-center">
      <ImageIcon aria-hidden="true" className="mb-2 size-8 text-muted-foreground" />
      <p className="font-bold">{copy.title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{copy.description}</p>
    </div>
  );
}

function EmptyHeroImageState({
  heroImageUrl,
}: {
  readonly heroImageUrl: string | null;
}) {
  const existingPublicUrl = normalizeOptionalText(heroImageUrl);

  return (
    <Alert>
      <AlertTitle>No generated hero image</AlertTitle>
      <AlertDescription>
        {existingPublicUrl === undefined
          ? "No generated hero image is attached to this article yet."
          : "This article has a public hero image URL, but no generated image metadata was returned."}
      </AlertDescription>
    </Alert>
  );
}

function copyForPreviewState(status: string): { readonly title: string; readonly description: string } {
  if (status === "failed") {
    return {
      title: "Generation failed",
      description: "No generated image object is available. Use the explicit action to try again.",
    };
  }

  return {
    title: "No public preview URL",
    description: "Generation metadata was returned without a public hero image URL.",
  };
}

function formatHeroImageStatus(status: string): string {
  if (status === "failed") {
    return "failed";
  }

  return "generated";
}

function formatDimensions(width: number | null, height: number | null): string {
  return width === null || height === null ? "Not provided" : `${width} x ${height}`;
}

function formatFileSize(sizeBytes: number | null): string {
  if (sizeBytes === null) {
    return "Not provided";
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  return `${(sizeBytes / 1024).toFixed(1)} KB`;
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

function formatSafeJsonSummary(value: ArticleReviewArticle["generationMetadata"]): string {
  return redactUnsafeText(JSON.stringify(value, null, 2));
}

function redactUnsafeText(value: string): string {
  return value
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted]")
    .replace(/\barticle-hero-image-candidates\b/g, "[private-storage]")
    .replace(/\barticle-hero-images\b/g, "[hero-image-storage]")
    .replace(/\barticles\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.(?:webp|png)\b/g, "[private-object]")
    .replace(
      /\b(api[-_ ]?key|secret|token|password|service[-_ ]?role)\s*[:=]\s*\S+/gi,
      "$1=[redacted]",
    );
}

function normalizeOptionalText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}
