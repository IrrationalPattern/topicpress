import { relations } from "drizzle-orm";

import { articleLocalizations, articleSources, articles } from "./articles.js";
import { sourceItems, storyClusterItems, storyClusters } from "./ingestion.js";
import { pipelineRuns } from "./pipeline.js";
import { sources } from "./sources.js";
import { categories } from "./taxonomy.js";

export const sourcesRelations = relations(sources, ({ many }) => ({
  sourceItems: many(sourceItems),
  pipelineRuns: many(pipelineRuns),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryHierarchy",
  }),
  children: many(categories, {
    relationName: "categoryHierarchy",
  }),
  articles: many(articles),
}));

export const sourceItemsRelations = relations(sourceItems, ({ one, many }) => ({
  source: one(sources, {
    fields: [sourceItems.sourceId],
    references: [sources.id],
  }),
  storyClusterItem: one(storyClusterItems),
  articleSources: many(articleSources),
  pipelineRuns: many(pipelineRuns),
}));

export const storyClustersRelations = relations(storyClusters, ({ many, one }) => ({
  items: many(storyClusterItems),
  article: one(articles),
  pipelineRuns: many(pipelineRuns),
}));

export const storyClusterItemsRelations = relations(storyClusterItems, ({ one }) => ({
  storyCluster: one(storyClusters, {
    fields: [storyClusterItems.storyClusterId],
    references: [storyClusters.id],
  }),
  sourceItem: one(sourceItems, {
    fields: [storyClusterItems.sourceItemId],
    references: [sourceItems.id],
  }),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  storyCluster: one(storyClusters, {
    fields: [articles.storyClusterId],
    references: [storyClusters.id],
  }),
  category: one(categories, {
    fields: [articles.categoryId],
    references: [categories.id],
  }),
  localizations: many(articleLocalizations),
  sources: many(articleSources),
  pipelineRuns: many(pipelineRuns),
}));

export const articleLocalizationsRelations = relations(articleLocalizations, ({ one }) => ({
  article: one(articles, {
    fields: [articleLocalizations.articleId],
    references: [articles.id],
  }),
}));

export const articleSourcesRelations = relations(articleSources, ({ one }) => ({
  article: one(articles, {
    fields: [articleSources.articleId],
    references: [articles.id],
  }),
  sourceItem: one(sourceItems, {
    fields: [articleSources.sourceItemId],
    references: [sourceItems.id],
  }),
}));

export const pipelineRunsRelations = relations(pipelineRuns, ({ one }) => ({
  source: one(sources, {
    fields: [pipelineRuns.sourceId],
    references: [sources.id],
  }),
  sourceItem: one(sourceItems, {
    fields: [pipelineRuns.sourceItemId],
    references: [sourceItems.id],
  }),
  storyCluster: one(storyClusters, {
    fields: [pipelineRuns.storyClusterId],
    references: [storyClusters.id],
  }),
  article: one(articles, {
    fields: [pipelineRuns.articleId],
    references: [articles.id],
  }),
}));
