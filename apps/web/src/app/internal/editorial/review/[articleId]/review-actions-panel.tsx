"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { ActionCopy, ActionRow } from "@/components/app/action-row";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { reviewArticleAction } from "./actions";
import {
  initialReviewActionFeedback,
  type ReviewActionFeedback,
  type ReviewActionIntent,
} from "./review-action-state";

interface ReviewActionsPanelProps {
  readonly articleId: string;
  readonly status: string;
}

export function ReviewActionsPanel({ articleId, status }: ReviewActionsPanelProps) {
  const router = useRouter();
  const [feedback, formAction, isPending] = useActionState(
    reviewArticleAction,
    initialReviewActionFeedback,
  );

  useEffect(() => {
    if (feedback.shouldRefresh && feedback.refreshToken > 0) {
      router.refresh();
    }
  }, [feedback.refreshToken, feedback.shouldRefresh, router]);

  return (
    <div className="flex flex-col gap-2">
      <ActionForm
        articleId={articleId}
        disabled={status !== "draft"}
        formAction={formAction}
        helpText={
          status === "draft"
            ? "Submit the generated draft for editorial review."
            : "Available for draft articles."
        }
        intent="request_review"
        label="Move to review"
      />
      <ActionForm
        articleId={articleId}
        disabled={status !== "review"}
        formAction={formAction}
        helpText="Backend validation decides whether the article can become ready."
        intent="approve_ready"
        label="Approve ready"
      />
      <FailedActionForm
        articleId={articleId}
        disabled={status !== "review" && status !== "ready"}
        formAction={formAction}
        isPending={isPending}
      />
      <ActionForm
        articleId={articleId}
        disabled={status !== "ready" && status !== "published"}
        formAction={formAction}
        helpText={
          status === "published"
            ? "Re-running publish returns the backend idempotency result."
            : "Publishes a ready article through the publishing workflow."
        }
        intent="publish"
        label={status === "published" ? "Check published" : "Publish"}
        variant="primary"
      />
      <ActionRow action={<Badge variant="secondary">no-op</Badge>}>
        <ActionCopy
          helpText="Visible state remains unchanged; no backend transition is submitted."
          title="Hold"
        />
      </ActionRow>
      <ActionFeedback feedback={feedback} />
    </div>
  );
}

function ActionForm({
  articleId,
  disabled,
  formAction,
  helpText,
  intent,
  label,
  variant = "secondary",
}: {
  readonly articleId: string;
  readonly disabled: boolean;
  readonly formAction: (formData: FormData) => void;
  readonly helpText: string;
  readonly intent: ReviewActionIntent;
  readonly label: string;
  readonly variant?: "primary" | "secondary";
}) {
  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 border-b py-2.5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_max-content] md:items-center"
    >
      <input name="articleId" type="hidden" value={articleId} />
      <input name="intent" type="hidden" value={intent} />
      <ActionCopy helpText={helpText} title={label} />
      <SubmitButton disabled={disabled} variant={variant}>
        {label}
      </SubmitButton>
    </form>
  );
}

function FailedActionForm({
  articleId,
  disabled,
  formAction,
  isPending,
}: {
  readonly articleId: string;
  readonly disabled: boolean;
  readonly formAction: (formData: FormData) => void;
  readonly isPending: boolean;
}) {
  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 border-b py-2.5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_max-content] md:items-end"
    >
      <input name="articleId" type="hidden" value={articleId} />
      <input name="intent" type="hidden" value="mark_failed" />
      <label className="grid min-w-0">
        <span className="font-bold">Reject failed</span>
        <span className="text-sm text-muted-foreground">
          A non-empty reason is required and stored as review notes.
        </span>
        <Textarea
          className="mt-2"
          disabled={disabled || isPending}
          name="reason"
          placeholder="Reason"
          required
          rows={3}
        />
      </label>
      <SubmitButton disabled={disabled} variant="danger">
        Mark failed
      </SubmitButton>
    </form>
  );
}

function SubmitButton({
  children,
  disabled,
  variant,
}: {
  readonly children: string;
  readonly disabled: boolean;
  readonly variant: "danger" | "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const buttonVariant =
    variant === "danger" ? "destructive" : variant === "primary" ? "default" : "outline";

  return (
    <Button disabled={disabled || pending} type="submit" variant={buttonVariant}>
      {pending ? "Working..." : children}
    </Button>
  );
}

function ActionFeedback({ feedback }: { readonly feedback: ReviewActionFeedback }) {
  if (feedback.refreshToken === 0) {
    return null;
  }

  return (
    <Alert
      aria-live="polite"
      className={cn(feedback.ok ? "border-accent bg-accent/10" : undefined)}
      variant={feedback.ok ? "default" : "destructive"}
      role="status"
    >
      <AlertTitle>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{feedback.title}</span>
          <div className="flex flex-wrap gap-1.5">
            {feedback.code === null ? null : <Badge variant="destructive">{feedback.code}</Badge>}
            {feedback.outcome === null ? null : <Badge>{feedback.outcome}</Badge>}
          </div>
        </div>
      </AlertTitle>
      <AlertDescription>
        <p>{feedback.message}</p>
        {feedback.pipelineRunId === null ? null : (
          <p className="mt-1 text-sm">
            Pipeline run {feedback.pipelineRunId} - {feedback.pipelineRunStatus}
          </p>
        )}
        {feedback.issues.length === 0 ? null : (
          <ul className="mt-2 list-disc pl-5">
            {feedback.issues.map((issue) => (
              <li key={`${issue.code}:${issue.message}`}>
                <strong>{issue.code}</strong>: {issue.message}
              </li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}
