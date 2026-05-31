"use client";

import { ImagePlus, RefreshCw } from "lucide-react";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { ActionCopy } from "@/components/app/action-row";
import { Button } from "@/components/ui/button";

import { reviewArticleAction } from "./actions";
import { ActionFeedback } from "./review-actions-panel";
import { initialReviewActionFeedback } from "./review-action-state";

interface HeroImageCandidateActionsPanelProps {
  readonly articleId: string;
  readonly articleStatus: string;
  readonly hasCurrentImage: boolean;
}

export function HeroImageCandidateActionsPanel({
  articleId,
  articleStatus,
  hasCurrentImage,
}: HeroImageCandidateActionsPanelProps) {
  const router = useRouter();
  const [feedback, formAction] = useActionState(
    reviewArticleAction,
    initialReviewActionFeedback,
  );

  useEffect(() => {
    if (feedback.shouldRefresh && feedback.refreshToken > 0) {
      router.refresh();
    }
  }, [feedback.refreshToken, feedback.shouldRefresh, router]);

  const disabled = articleStatus !== "review";
  const label = hasCurrentImage ? "Regenerate hero image" : "Generate hero image";

  return (
    <div className="flex flex-col gap-2">
      <HeroImageActionForm
        articleId={articleId}
        disabled={disabled}
        formAction={formAction}
        helpText={
          disabled
            ? "Available while the article is in review."
            : hasCurrentImage
              ? "Creates a replacement generated illustration through the worker image pipeline."
              : "Creates the first generated illustration through the worker image pipeline."
        }
        label={label}
        mode={hasCurrentImage ? "regenerate" : "generate"}
      />
      <ActionFeedback feedback={feedback} />
    </div>
  );
}

function HeroImageActionForm({
  articleId,
  disabled,
  formAction,
  helpText,
  label,
  mode,
}: {
  readonly articleId: string;
  readonly disabled: boolean;
  readonly formAction: (formData: FormData) => void;
  readonly helpText: string;
  readonly label: string;
  readonly mode: "generate" | "regenerate";
}) {
  const Icon = mode === "regenerate" ? RefreshCw : ImagePlus;

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 border-b py-2.5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_max-content] md:items-center"
    >
      <input name="articleId" type="hidden" value={articleId} />
      <input name="intent" type="hidden" value="generate_hero_image" />
      <ActionCopy helpText={helpText} title={label} />
      <HeroImageSubmitButton disabled={disabled} icon={Icon} label={label} />
    </form>
  );
}

function HeroImageSubmitButton({
  disabled,
  icon: Icon,
  label,
}: {
  readonly disabled: boolean;
  readonly icon: typeof ImagePlus;
  readonly label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={disabled || pending} type="submit">
      <Icon aria-hidden="true" className="size-4" />
      {pending ? "Working..." : label}
    </Button>
  );
}
