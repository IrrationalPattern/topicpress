"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

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
    <div className="action-stack">
      <ActionForm
        articleId={articleId}
        disabled={status !== "draft"}
        formAction={formAction}
        helpText={status === "draft" ? "Submit the generated draft for editorial review." : "Available for draft articles."}
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
      <div className="action-row action-row-muted">
        <div>
          <p className="action-title">Hold</p>
          <p className="action-help">Visible state remains unchanged; no backend transition is submitted.</p>
        </div>
        <span className="badge">no-op</span>
      </div>
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
    <form action={formAction} className="action-row">
      <input name="articleId" type="hidden" value={articleId} />
      <input name="intent" type="hidden" value={intent} />
      <div>
        <p className="action-title">{label}</p>
        <p className="action-help">{helpText}</p>
      </div>
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
    <form action={formAction} className="action-row action-row-with-input">
      <input name="articleId" type="hidden" value={articleId} />
      <input name="intent" type="hidden" value="mark_failed" />
      <label className="reason-field">
        <span className="action-title">Reject failed</span>
        <span className="action-help">A non-empty reason is required and stored as review notes.</span>
        <textarea
          className="reason-input"
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

  return (
    <button className={`action-button action-button-${variant}`} disabled={disabled || pending} type="submit">
      {pending ? "Working..." : children}
    </button>
  );
}

function ActionFeedback({ feedback }: { readonly feedback: ReviewActionFeedback }) {
  if (feedback.refreshToken === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={feedback.ok ? "action-feedback action-feedback-ok" : "action-feedback action-feedback-error"}
      role="status"
    >
      <div className="action-feedback-header">
        <strong>{feedback.title}</strong>
        <div className="badge-group">
          {feedback.code === null ? null : <span className="badge badge-danger">{feedback.code}</span>}
          {feedback.outcome === null ? null : <span className="badge badge-ok">{feedback.outcome}</span>}
        </div>
      </div>
      <p>{feedback.message}</p>
      {feedback.pipelineRunId === null ? null : (
        <p className="row-meta">
          Pipeline run {feedback.pipelineRunId} - {feedback.pipelineRunStatus}
        </p>
      )}
      {feedback.issues.length === 0 ? null : (
        <ul className="action-issues">
          {feedback.issues.map((issue) => (
            <li key={`${issue.code}:${issue.message}`}>
              <strong>{issue.code}</strong>: {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
