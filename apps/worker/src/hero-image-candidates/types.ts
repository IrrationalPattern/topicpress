import type {
  ArticleHeroImageCandidateStatus,
  ArticleStatus,
  PipelineRunStatus,
  PipelineRunType,
} from "@topicpress/db";
import type { ImageProvider } from "@topicpress/ai";

import type { JsonValue } from "../feed-types.js";

export const publicHeroImageBucket = "article-hero-images";

export type HeroImageCandidateFailureCode =
  | "not_found"
  | "ineligible_article"
  | "missing_primary_localization"
  | "provider_failed"
  | "storage_failed"
  | "persistence_failed";

export type HeroImageCandidateOutcome =
  | "created"
  | "existing_candidate"
  | "regenerated"
  | "failed"
  | "ineligible";

export interface GenerateHeroImageCandidateInput {
  readonly articleId: string;
  readonly regenerate?: boolean;
}

export interface GenerateHeroImageCandidateOptions {
  readonly now?: Date;
  readonly provider?: ImageProvider;
  readonly storage?: HeroImageCandidateStorage;
  readonly storageBucket?: string;
  readonly createCandidateId?: () => string;
}

export type GenerateHeroImageCandidateResult =
  | {
      readonly ok: true;
      readonly created: boolean;
      readonly outcome: Extract<HeroImageCandidateOutcome, "created" | "existing_candidate" | "regenerated">;
      readonly candidate: HeroImageCandidateRecord;
      readonly pipelineRunId: string;
    }
  | {
      readonly ok: false;
      readonly outcome: Extract<HeroImageCandidateOutcome, "failed" | "ineligible">;
      readonly error: HeroImageCandidateFailure;
      readonly candidate?: HeroImageCandidateRecord;
      readonly pipelineRunId: string;
    };

export interface HeroImageCandidateFailure {
  readonly code: HeroImageCandidateFailureCode;
  readonly message: string;
}

export interface HeroImageCandidateRecord {
  readonly id: string;
  readonly articleId: string;
  readonly status: ArticleHeroImageCandidateStatus;
  readonly provider: string;
  readonly model: string;
  readonly prompt: string;
  readonly promptHash: string;
  readonly stylePolicy: string;
  readonly storageBucket: string;
  readonly storagePath: string | null;
  readonly contentType: string | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly sizeBytes: number | null;
  readonly publicUrl: string | null;
  readonly reviewNotes: string | null;
  readonly generationMetadata: JsonValue;
  readonly generatedAt: Date;
  readonly reviewedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface HeroImageCandidateArticleContext {
  readonly article: {
    readonly id: string;
    readonly status: ArticleStatus;
    readonly primaryLocale: string;
    readonly heroImageUrl: string | null;
    readonly storyClusterId: string;
  };
  readonly category: {
    readonly id: string;
    readonly slug: string;
    readonly name: string;
    readonly isActive: boolean;
  };
  readonly primaryLocalization: {
    readonly locale: string;
    readonly title: string;
    readonly subtitle: string | null;
    readonly excerpt: string;
    readonly body: string;
    readonly keywords: readonly string[];
  } | null;
  readonly sources: readonly HeroImageCandidateSourceContext[];
}

export interface HeroImageCandidateSourceContext {
  readonly sourceItemId: string;
  readonly sourceName: string;
  readonly title: string;
  readonly summary: string | null;
  readonly contentText: string | null;
  readonly isPrimary: boolean;
}

export interface HeroImageCandidateStore {
  readonly transaction: <TResult>(
    callback: (tx: HeroImageCandidateTransaction) => Promise<TResult>,
  ) => Promise<TResult>;
  readonly createPipelineRun: (
    input: CreateHeroImageCandidatePipelineRunInput,
  ) => Promise<{ readonly id: string }>;
  readonly finishPipelineRun: (
    id: string,
    input: FinishHeroImageCandidatePipelineRunInput,
  ) => Promise<void>;
}

export interface HeroImageCandidateTransaction {
  readonly findArticleContext: (articleId: string) => Promise<HeroImageCandidateArticleContext | null>;
  readonly findCandidateByArticleId: (articleId: string) => Promise<HeroImageCandidateRecord | null>;
  readonly insertCandidate: (
    values: InsertHeroImageCandidateValues,
  ) => Promise<HeroImageCandidateRecord>;
  readonly updateCandidate: (
    values: UpdateHeroImageCandidateValues,
  ) => Promise<HeroImageCandidateRecord | null>;
  readonly setArticleHeroImageUrl: (
    input: SetArticleHeroImageUrlInput,
  ) => Promise<{ readonly id: string; readonly heroImageUrl: string | null } | null>;
}

export interface InsertHeroImageCandidateValues {
  readonly id: string;
  readonly articleId: string;
  readonly status: "generated" | "failed";
  readonly provider: string;
  readonly model: string;
  readonly prompt: string;
  readonly promptHash: string;
  readonly stylePolicy: "editorial_illustration";
  readonly storageBucket: string;
  readonly storagePath: string | null;
  readonly contentType: string | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly sizeBytes: number | null;
  readonly publicUrl: string | null;
  readonly reviewNotes: string | null;
  readonly generationMetadata: JsonValue;
  readonly generatedAt: Date;
  readonly reviewedAt: null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface UpdateHeroImageCandidateValues extends Omit<InsertHeroImageCandidateValues, "id" | "articleId" | "createdAt"> {
  readonly candidateId: string;
}

export interface SetArticleHeroImageUrlInput {
  readonly articleId: string;
  readonly heroImageUrl: string | null;
  readonly updatedAt: Date;
}

export interface CreateHeroImageCandidatePipelineRunInput {
  readonly runType: PipelineRunType;
  readonly articleId: string;
  readonly attempt: number;
  readonly startedAt: Date;
  readonly payload: HeroImageCandidateJsonObject;
}

export interface FinishHeroImageCandidatePipelineRunInput {
  readonly status: Extract<PipelineRunStatus, "succeeded" | "failed">;
  readonly attempt: number;
  readonly finishedAt: Date;
  readonly errorMessage?: string;
  readonly payload: HeroImageCandidateJsonObject;
}

export interface HeroImageCandidateStorage {
  readonly upload: (input: HeroImageCandidateStorageUploadInput) => Promise<HeroImageCandidateStorageUploadResult>;
}

export interface HeroImageCandidateStorageUploadInput {
  readonly bucket: string;
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly contentType: string;
}

export interface HeroImageCandidateStorageUploadResult {
  readonly bucket: string;
  readonly path: string;
  readonly publicUrl: string;
  readonly contentType: string;
  readonly sizeBytes: number;
}

export type HeroImageCandidateJsonObject = { readonly [key: string]: JsonValue };
