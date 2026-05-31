import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";

import * as schema from "@topicpress/db";
import {
  getPublicArticleDetail as getWorkerPublicArticleDetail,
  type PublicArticleDetail as WorkerPublicArticleDetail,
  type PublicArticleDetailResult,
} from "@topicpress/worker";
import { and, eq } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { AppLocale } from "@/i18n/routing";

type TopicpressWebDatabase = PostgresJsDatabase<typeof schema>;

export interface PublicArticleHeroImageDisclosure {
  readonly kind: "ai_generated";
  readonly label: "AI-generated illustration";
}

export type PublicArticleDetail = WorkerPublicArticleDetail & {
  readonly heroImageDisclosure?: PublicArticleHeroImageDisclosure;
};

export type WebPublicArticleDetailResult =
  | {
      readonly kind: "found";
      readonly article: PublicArticleDetail;
    }
  | { readonly kind: "not_found" };

interface DatabaseClient {
  readonly db: TopicpressWebDatabase;
  readonly close: () => Promise<void>;
}

export async function getPublicArticleDetail(
  locale: AppLocale,
  slug: string,
): Promise<WebPublicArticleDetailResult> {
  const client = createDatabaseClient();

  try {
    const result = await getWorkerPublicArticleDetail(client.db, { locale, slug });

    if (result.kind === "not_found") {
      return result;
    }

    return {
      kind: "found",
      article: await addHeroImageDisclosure(client.db, result.article),
    };
  } finally {
    await client.close();
  }
}

export type { PublicArticleDetailResult };

async function addHeroImageDisclosure(
  db: TopicpressWebDatabase,
  article: WorkerPublicArticleDetail,
): Promise<PublicArticleDetail> {
  const heroImageUrl = normalizeOptionalText(article.heroImageUrl);

  if (heroImageUrl === undefined) {
    return article;
  }

  const generatedHeroImageRows = await db
    .select({
      status: schema.articleHeroImageCandidates.status,
      stylePolicy: schema.articleHeroImageCandidates.stylePolicy,
    })
    .from(schema.articleHeroImageCandidates)
    .where(
      and(
        eq(schema.articleHeroImageCandidates.articleId, article.id),
        eq(schema.articleHeroImageCandidates.publicUrl, heroImageUrl),
      ),
    )
    .limit(1);
  const generatedHeroImage = generatedHeroImageRows[0];

  if (
    generatedHeroImage === undefined ||
    generatedHeroImage.stylePolicy !== "editorial_illustration" ||
    generatedHeroImage.status !== "generated"
  ) {
    return article;
  }

  return {
    ...article,
    heroImageDisclosure: {
      kind: "ai_generated",
      label: "AI-generated illustration",
    },
  };
}

function createDatabaseClient(databaseUrl = resolveDatabaseUrl()): DatabaseClient {
  const client = postgres(databaseUrl, { max: 1 });

  return {
    db: drizzle(client, { schema }),
    close: () => client.end(),
  };
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

function resolveDatabaseUrl(): string {
  loadLocalEnvFiles();

  const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;

  if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
    throw new Error(
      "Missing DATABASE_URL or SUPABASE_DB_URL. Start local Supabase and configure the local database URL in .env or .env.local.",
    );
  }

  return databaseUrl;
}

function loadLocalEnvFiles(): void {
  const root = findWorkspaceRoot();

  [".env.local", ".env"].forEach((fileName) => {
    const envPath = join(root, fileName);

    if (existsSync(envPath)) {
      loadEnvFile(envPath);
    }
  });
}

function findWorkspaceRoot(): string {
  let current = dirname(fileURLToPath(import.meta.url));
  const { root } = parse(current);

  while (current !== root) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    current = dirname(current);
  }

  return process.cwd();
}

function loadEnvFile(envPath: string): void {
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (process.env[key] === undefined) {
      process.env[key] = unquoteEnvValue(rawValue);
    }
  });
}

function unquoteEnvValue(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
