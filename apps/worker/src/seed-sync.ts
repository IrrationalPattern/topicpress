import {
  getCategorySeedRecords,
  getSourceSeedRecords,
  siteConfig,
  type CategorySeedRecord,
  type LocaleCode,
  type SiteConfig,
  type SourceSeedRecord,
} from "@topicpress/config";
import { categories, sources } from "@topicpress/db";
import { inArray, notInArray, sql } from "drizzle-orm";

import type { TopicpressDatabase } from "./database.js";

export interface SeedSyncOptions {
  readonly config?: SiteConfig;
  readonly locale?: LocaleCode;
  readonly deactivateMissing?: boolean;
  readonly now?: Date;
}

export interface SeedSyncPlan {
  readonly categories: readonly CategorySeedRecord[];
  readonly sources: readonly SourceSeedRecord[];
  readonly deactivateMissing: boolean;
  readonly now: Date;
}

export interface SeedSyncResult {
  readonly categories: {
    readonly upserted: number;
    readonly parentLinksUpdated: number;
    readonly deactivatedMissing: number;
  };
  readonly sources: {
    readonly upserted: number;
    readonly deactivatedMissing: number;
  };
}

export class SeedSyncValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid seed sync input:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
    this.name = "SeedSyncValidationError";
    this.issues = issues;
  }
}

type ExistingSourceIdentity = Pick<SourceSeedRecord, "configKey" | "slug" | "feedUrl">;
type ExistingCategoryIdentity = Pick<CategorySeedRecord, "configKey" | "slug">;

export function createSeedSyncPlan(options: SeedSyncOptions = {}): SeedSyncPlan {
  const config = options.config ?? siteConfig;
  const locale = options.locale ?? config.locales.defaultLocale;
  const plan = {
    categories: getCategorySeedRecords(config, locale),
    sources: getSourceSeedRecords(config),
    deactivateMissing: options.deactivateMissing ?? true,
    now: options.now ?? new Date(),
  };

  validateSeedSyncPlan(plan);

  return plan;
}

export function validateSeedSyncPlan(plan: SeedSyncPlan): void {
  const issues = collectPlanIssues(plan);

  if (issues.length > 0) {
    throw new SeedSyncValidationError(issues);
  }
}

export async function syncSiteConfig(
  db: TopicpressDatabase,
  options: SeedSyncOptions = {},
): Promise<SeedSyncResult> {
  const plan = createSeedSyncPlan(options);

  return db.transaction(async (tx) => {
    const existingSources = await tx
      .select({
        configKey: sources.configKey,
        slug: sources.slug,
        feedUrl: sources.feedUrl,
      })
      .from(sources);
    const existingCategories = await tx
      .select({
        configKey: categories.configKey,
        slug: categories.slug,
      })
      .from(categories);

    validateAgainstExistingRows(plan, existingSources, existingCategories);

    const upsertedSources = await tx
      .insert(sources)
      .values(
        plan.sources.map((source) => ({
          configKey: source.configKey,
          slug: source.slug,
          name: source.name,
          kind: source.kind,
          feedUrl: source.feedUrl,
          homepageUrl: source.homepageUrl,
          language: source.language,
          isActive: source.isActive,
          updatedAt: plan.now,
        })),
      )
      .onConflictDoUpdate({
        target: sources.configKey,
        set: {
          slug: sql`excluded.slug`,
          name: sql`excluded.name`,
          kind: sql`excluded.kind`,
          feedUrl: sql`excluded.feed_url`,
          homepageUrl: sql`excluded.homepage_url`,
          language: sql`excluded.language`,
          isActive: sql`excluded.is_active`,
          updatedAt: plan.now,
        },
      })
      .returning({ configKey: sources.configKey });

    const deactivatedMissingSources = plan.deactivateMissing
      ? await tx
          .update(sources)
          .set({ isActive: false, updatedAt: plan.now })
          .where(
            notInArray(
              sources.configKey,
              plan.sources.map((source) => source.configKey),
            ),
          )
          .returning({ configKey: sources.configKey })
      : [];

    const upsertedCategories = await tx
      .insert(categories)
      .values(
        plan.categories.map((category) => ({
          configKey: category.configKey,
          slug: category.slug,
          name: category.name,
          description: category.description,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
          updatedAt: plan.now,
        })),
      )
      .onConflictDoUpdate({
        target: categories.configKey,
        set: {
          slug: sql`excluded.slug`,
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          sortOrder: sql`excluded.sort_order`,
          isActive: sql`excluded.is_active`,
          updatedAt: plan.now,
        },
      })
      .returning({ configKey: categories.configKey });

    const categoryRows = await tx
      .select({ id: categories.id, configKey: categories.configKey })
      .from(categories)
      .where(
        inArray(
          categories.configKey,
          plan.categories.map((category) => category.configKey),
        ),
      );
    const categoryIdByConfigKey = new Map(
      categoryRows.map((category) => [category.configKey, category.id]),
    );

    const parentUpdates = await Promise.all(
      plan.categories.map((category) => {
        const parentId =
          category.parentConfigKey === undefined
            ? null
            : (categoryIdByConfigKey.get(category.parentConfigKey) ?? null);

        return tx
          .update(categories)
          .set({ parentId, updatedAt: plan.now })
          .where(inArray(categories.configKey, [category.configKey]))
          .returning({ configKey: categories.configKey });
      }),
    );

    const deactivatedMissingCategories = plan.deactivateMissing
      ? await tx
          .update(categories)
          .set({ isActive: false, updatedAt: plan.now })
          .where(
            notInArray(
              categories.configKey,
              plan.categories.map((category) => category.configKey),
            ),
          )
          .returning({ configKey: categories.configKey })
      : [];

    return {
      sources: {
        upserted: upsertedSources.length,
        deactivatedMissing: deactivatedMissingSources.length,
      },
      categories: {
        upserted: upsertedCategories.length,
        parentLinksUpdated: parentUpdates.flat().length,
        deactivatedMissing: deactivatedMissingCategories.length,
      },
    };
  });
}

export function validateAgainstExistingRows(
  plan: SeedSyncPlan,
  existingSources: readonly ExistingSourceIdentity[],
  existingCategories: readonly ExistingCategoryIdentity[],
): void {
  const issues = [
    ...collectDuplicateIssues(existingSources, "database.sources", [
      "configKey",
      "slug",
      "feedUrl",
    ]),
    ...collectDuplicateIssues(existingCategories, "database.categories", ["configKey", "slug"]),
    ...collectSourceCollisionIssues(plan.sources, existingSources),
    ...collectCategoryCollisionIssues(plan.categories, existingCategories),
  ];

  if (issues.length > 0) {
    throw new SeedSyncValidationError(issues);
  }
}

function collectPlanIssues(plan: SeedSyncPlan): string[] {
  return [
    ...collectDuplicateIssues(plan.sources, "sources", ["configKey", "slug", "feedUrl"]),
    ...collectDuplicateIssues(plan.categories, "categories", ["configKey", "slug"]),
    ...collectParentIssues(plan.categories),
  ];
}

function collectParentIssues(seedCategories: readonly CategorySeedRecord[]): string[] {
  const issues: string[] = [];
  const keys = new Set(seedCategories.map((category) => category.configKey));
  const parentByConfigKey = new Map<string, string>();

  seedCategories.forEach((category) => {
    if (category.parentConfigKey === undefined) {
      return;
    }

    if (!keys.has(category.parentConfigKey)) {
      issues.push(
        `categories.${category.configKey}.parentConfigKey: missing parent "${category.parentConfigKey}"`,
      );
      return;
    }

    parentByConfigKey.set(category.configKey, category.parentConfigKey);
  });

  const visited = new Set<string>();
  const visiting = new Set<string>();

  seedCategories.forEach((category) => {
    visitCategoryParent(category.configKey, parentByConfigKey, visited, visiting, [], issues);
  });

  return issues;
}

function visitCategoryParent(
  configKey: string,
  parentByConfigKey: ReadonlyMap<string, string>,
  visited: Set<string>,
  visiting: Set<string>,
  path: readonly string[],
  issues: string[],
): void {
  if (visited.has(configKey)) {
    return;
  }

  if (visiting.has(configKey)) {
    issues.push(`categories.parentConfigKey: cycle detected ${[...path, configKey].join(" -> ")}`);
    return;
  }

  visiting.add(configKey);

  const parentConfigKey = parentByConfigKey.get(configKey);

  if (parentConfigKey !== undefined) {
    visitCategoryParent(
      parentConfigKey,
      parentByConfigKey,
      visited,
      visiting,
      [...path, configKey],
      issues,
    );
  }

  visiting.delete(configKey);
  visited.add(configKey);
}

function collectSourceCollisionIssues(
  seedSources: readonly SourceSeedRecord[],
  existingSources: readonly ExistingSourceIdentity[],
): string[] {
  const issues: string[] = [];

  seedSources.forEach((seedSource) => {
    existingSources.forEach((existingSource) => {
      if (existingSource.configKey === seedSource.configKey) {
        return;
      }

      if (existingSource.slug === seedSource.slug) {
        issues.push(
          `sources.${seedSource.configKey}.slug: collides with existing source config_key "${existingSource.configKey}"`,
        );
      }

      if (existingSource.feedUrl === seedSource.feedUrl) {
        issues.push(
          `sources.${seedSource.configKey}.feedUrl: collides with existing source config_key "${existingSource.configKey}"`,
        );
      }
    });
  });

  return issues;
}

function collectCategoryCollisionIssues(
  seedCategories: readonly CategorySeedRecord[],
  existingCategories: readonly ExistingCategoryIdentity[],
): string[] {
  const issues: string[] = [];

  seedCategories.forEach((seedCategory) => {
    existingCategories.forEach((existingCategory) => {
      if (existingCategory.configKey === seedCategory.configKey) {
        return;
      }

      if (existingCategory.slug === seedCategory.slug) {
        issues.push(
          `categories.${seedCategory.configKey}.slug: collides with existing category config_key "${existingCategory.configKey}"`,
        );
      }
    });
  });

  return issues;
}

function collectDuplicateIssues<TRecord extends object>(
  records: readonly TRecord[],
  label: string,
  fields: readonly (keyof TRecord & string)[],
): string[] {
  const issues: string[] = [];

  fields.forEach((field) => {
    const seen = new Set<unknown>();
    const duplicates = new Set<unknown>();

    records.forEach((record) => {
      const value = record[field];

      if (value === undefined || value === null) {
        return;
      }

      if (seen.has(value)) {
        duplicates.add(value);
      }

      seen.add(value);
    });

    duplicates.forEach((value) => {
      issues.push(`${label}.${field}: duplicate value "${String(value)}"`);
    });
  });

  return issues;
}
