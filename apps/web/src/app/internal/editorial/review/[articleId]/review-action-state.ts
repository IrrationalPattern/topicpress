export type ReviewActionIntent =
  | "request_review"
  | "approve_ready"
  | "mark_failed"
  | "publish"
  | "hold";

export interface ReviewActionIssue {
  readonly code: string;
  readonly message: string;
}

export interface ReviewActionFeedback {
  readonly ok: boolean;
  readonly title: string;
  readonly message: string;
  readonly code: string | null;
  readonly issues: readonly ReviewActionIssue[];
  readonly pipelineRunId: string | null;
  readonly pipelineRunStatus: string | null;
  readonly outcome: string | null;
  readonly refreshToken: number;
  readonly shouldRefresh: boolean;
}

export const initialReviewActionFeedback: ReviewActionFeedback = {
  ok: false,
  title: "",
  message: "",
  code: null,
  issues: [],
  pipelineRunId: null,
  pipelineRunStatus: null,
  outcome: null,
  refreshToken: 0,
  shouldRefresh: false,
};
