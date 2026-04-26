export const configPackageName = "@topicpress/config";

export type ConfigKey = string;
export type LocaleCode = string;
export type SourceFeedKind = "rss" | "atom" | "json_feed";
export type RobotsDirective = "index,follow" | "noindex,nofollow";
export type PublishingMode = "manual_review_required";
export type GeneratedContentStatus = "draft" | "review";
export type LocalizedText = Readonly<Record<LocaleCode, string>>;

export interface SiteConfig {
  readonly schemaVersion: 1;
  readonly metadata: SiteConfigMetadata;
  readonly identity: SiteIdentityConfig;
  readonly locales: SiteLocalesConfig;
  readonly taxonomy: readonly CategoryConfig[];
  readonly sources: readonly SourceConfig[];
  readonly editorialRules: EditorialRulesConfig;
  readonly theme: ThemeConfig;
  readonly seo: SeoDefaultsConfig;
}

export interface SiteConfigMetadata {
  readonly profile: "first_site";
  readonly source: string;
  readonly updatedAt: string;
  readonly notes: readonly string[];
}

export interface SiteIdentityConfig {
  readonly slug: string;
  readonly name: string;
  readonly tagline: LocalizedText;
  readonly domains: SiteDomainConfig;
}

export interface SiteDomainConfig {
  readonly intendedHostname: string;
  readonly localOrigin: string;
  readonly productionOriginPlaceholder: string;
}

export interface SiteLocalesConfig {
  readonly defaultLocale: LocaleCode;
  readonly supportedLocales: readonly LocaleCode[];
  readonly paths: Readonly<Record<LocaleCode, string>>;
}

export interface CategoryConfig {
  readonly key: ConfigKey;
  readonly slug: string;
  readonly labels: LocalizedText;
  readonly descriptions: LocalizedText;
  readonly parentKey?: ConfigKey;
  readonly sortOrder: number;
  readonly isActive: boolean;
}

export interface SourceConfig {
  readonly key: ConfigKey;
  readonly slug: string;
  readonly name: string;
  readonly kind: SourceFeedKind;
  readonly feedUrl: string;
  readonly homepageUrl: string;
  readonly language: string;
  readonly sourceProfile: string;
  readonly isActive: boolean;
}

export interface EditorialRulesConfig {
  readonly publishingMode: PublishingMode;
  readonly generatedContentDefaultStatus: GeneratedContentStatus;
  readonly manualReviewRequired: boolean;
  readonly tone: readonly string[];
  readonly primaryAudience: string;
  readonly contentScope: string;
  readonly topicBoundaries: {
    readonly include: readonly string[];
    readonly exclude: readonly string[];
  };
  readonly prohibitedContent: readonly string[];
  readonly attributionExpectations: readonly string[];
  readonly reviewExpectations: readonly string[];
}

export interface ThemeConfig {
  readonly designDirection: string;
  readonly logo: {
    readonly available: boolean;
    readonly approach: string;
  };
  readonly colors: {
    readonly primary: string;
    readonly accent: string;
    readonly background: string;
    readonly text: string;
    readonly secondaryUi: readonly string[];
  };
  readonly typography: {
    readonly body: readonly string[];
    readonly headings: readonly string[];
  };
}

export interface SeoDefaultsConfig {
  readonly titleTemplate: string;
  readonly descriptions: LocalizedText;
  readonly canonical: {
    readonly requireProductionOrigin: boolean;
    readonly note: string;
  };
  readonly robots: {
    readonly local: RobotsDirective;
    readonly staging: RobotsDirective;
    readonly production: RobotsDirective;
  };
}

export interface CategorySeedRecord {
  readonly configKey: ConfigKey;
  readonly slug: string;
  readonly name: string;
  readonly description?: string;
  readonly parentConfigKey?: ConfigKey;
  readonly sortOrder: number;
  readonly isActive: boolean;
}

export interface SourceSeedRecord {
  readonly configKey: ConfigKey;
  readonly slug: string;
  readonly name: string;
  readonly kind: SourceFeedKind;
  readonly feedUrl: string;
  readonly homepageUrl: string;
  readonly language: string;
  readonly isActive: boolean;
}

export interface SiteConfigValidationResult {
  readonly ok: boolean;
  readonly config?: SiteConfig;
  readonly issues: readonly string[];
}

export class SiteConfigValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid site config:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
    this.name = "SiteConfigValidationError";
    this.issues = issues;
  }
}

export const aiLandscapeBriefSiteConfig = {
  schemaVersion: 1,
  metadata: {
    profile: "first_site",
    source: "Projects/Topicpress/04-tasks/human/HUM-102",
    updatedAt: "2026-04-27",
    notes: [
      "HUM-102 provided provisional first-site inputs for M1 validation.",
      "Production domain remains a placeholder until launch-domain clearance is complete.",
      "ADR-005 overrides autopublish wording from HUM-102: generated MVP content requires manual review before publication.",
    ],
  },
  identity: {
    slug: "ai-landscape-brief",
    name: "AI Landscape Brief",
    tagline: {
      "en-GB": "Concise AI news, research, tools, and explainers from approved sources.",
      "uk-UA": "Стислі новини, дослідження, інструменти та пояснення про ШІ з перевірених джерел.",
    },
    domains: {
      intendedHostname: "ai-landscape-brief.local",
      localOrigin: "http://localhost:3000",
      productionOriginPlaceholder: "https://ai-landscape-brief.example",
    },
  },
  locales: {
    defaultLocale: "en-GB",
    supportedLocales: ["en-GB", "uk-UA"],
    paths: {
      "en-GB": "/en-gb/",
      "uk-UA": "/uk-ua/",
    },
  },
  taxonomy: [
    {
      key: "news",
      slug: "news",
      labels: {
        "en-GB": "News",
        "uk-UA": "Новини",
      },
      descriptions: {
        "en-GB": "Timely AI updates from approved sources.",
        "uk-UA": "Актуальні оновлення про ШІ з перевірених джерел.",
      },
      sortOrder: 10,
      isActive: true,
    },
    {
      key: "model_releases",
      slug: "model-releases",
      labels: {
        "en-GB": "Model Releases",
        "uk-UA": "Релізи моделей",
      },
      descriptions: {
        "en-GB": "New AI models, capabilities, updates, and availability changes.",
        "uk-UA": "Нові моделі ШІ, можливості, оновлення та зміни доступності.",
      },
      parentKey: "news",
      sortOrder: 20,
      isActive: true,
    },
    {
      key: "tools_products",
      slug: "tools-products",
      labels: {
        "en-GB": "Tools & Products",
        "uk-UA": "Інструменти та продукти",
      },
      descriptions: {
        "en-GB": "AI tools, platforms, product launches, and practical applications.",
        "uk-UA": "Інструменти, платформи, запуск продуктів і практичні застосування ШІ.",
      },
      sortOrder: 30,
      isActive: true,
    },
    {
      key: "research",
      slug: "research",
      labels: {
        "en-GB": "Research",
        "uk-UA": "Дослідження",
      },
      descriptions: {
        "en-GB": "Research papers, technical analysis, benchmarks, and model behaviour.",
        "uk-UA": "Наукові статті, технічний аналіз, бенчмарки та поведінка моделей.",
      },
      sortOrder: 40,
      isActive: true,
    },
    {
      key: "benchmarks",
      slug: "benchmarks",
      labels: {
        "en-GB": "Benchmarks",
        "uk-UA": "Бенчмарки",
      },
      descriptions: {
        "en-GB": "Evaluations, comparisons, and performance discussions.",
        "uk-UA": "Оцінювання, порівняння та обговорення продуктивності.",
      },
      parentKey: "research",
      sortOrder: 50,
      isActive: true,
    },
    {
      key: "guides_explainers",
      slug: "guides-explainers",
      labels: {
        "en-GB": "Guides & Explainers",
        "uk-UA": "Посібники та пояснення",
      },
      descriptions: {
        "en-GB": "Accessible explanations and practical learning content.",
        "uk-UA": "Доступні пояснення та практичні навчальні матеріали.",
      },
      sortOrder: 60,
      isActive: true,
    },
    {
      key: "policy_safety",
      slug: "policy-safety",
      labels: {
        "en-GB": "Policy & Safety",
        "uk-UA": "Політика та безпека",
      },
      descriptions: {
        "en-GB": "AI regulation, responsible use, governance, and safety topics.",
        "uk-UA": "Регулювання ШІ, відповідальне використання, управління та безпека.",
      },
      sortOrder: 70,
      isActive: true,
    },
    {
      key: "business_adoption",
      slug: "business-adoption",
      labels: {
        "en-GB": "Business & Adoption",
        "uk-UA": "Бізнес і впровадження",
      },
      descriptions: {
        "en-GB": "How organisations use AI, market shifts, and operational impact.",
        "uk-UA": "Як організації використовують ШІ, ринкові зміни та операційний вплив.",
      },
      sortOrder: 80,
      isActive: true,
    },
  ],
  sources: [
    {
      key: "openai_news",
      slug: "openai-news",
      name: "OpenAI News",
      kind: "rss",
      feedUrl: "https://openai.com/news/rss.xml",
      homepageUrl: "https://openai.com/news/",
      language: "en",
      sourceProfile: "official_company_news",
      isActive: true,
    },
    {
      key: "huggingface_blog",
      slug: "hugging-face-blog",
      name: "Hugging Face Blog",
      kind: "rss",
      feedUrl: "https://huggingface.co/blog/feed.xml",
      homepageUrl: "https://huggingface.co/blog",
      language: "en",
      sourceProfile: "company_and_community_blog",
      isActive: true,
    },
    {
      key: "ahead_of_ai",
      slug: "ahead-of-ai",
      name: "Ahead of AI by Sebastian Raschka",
      kind: "rss",
      feedUrl: "https://magazine.sebastianraschka.com/feed.xml",
      homepageUrl: "https://magazine.sebastianraschka.com",
      language: "en",
      sourceProfile: "independent_technical_newsletter",
      isActive: true,
    },
  ],
  editorialRules: {
    publishingMode: "manual_review_required",
    generatedContentDefaultStatus: "review",
    manualReviewRequired: true,
    tone: ["neutral", "concise", "factual", "expert_but_accessible"],
    primaryAudience: "general_readers",
    contentScope: "mixed_ai_news_research_tools_policy_business_and_explainers",
    topicBoundaries: {
      include: [
        "AI news",
        "Model releases",
        "Benchmarks",
        "AI tools and products",
        "Product launches",
        "Research papers and technical analysis",
        "Implementation guides and explainers",
        "Policy, regulation, governance, and safety",
        "Business adoption and operational impact",
      ],
      exclude: [
        "General technology news without a clear AI angle",
        "Rumours presented as fact",
        "Investment advice",
        "Medical advice",
        "Legal advice",
        "Individualised professional guidance",
        "Instructions for malware, phishing, credential abuse, or harmful automation",
        "Instructions for bypassing safety systems",
        "Deepfake impersonation guidance or deceptive synthetic media instructions",
        "Adult content",
      ],
    },
    prohibitedContent: [
      "Unverified claims presented as confirmed facts",
      "Plagiarised or full-copy republication of source articles",
      "Fabricated quotes, citations, authors, or publication dates",
      "Political persuasion targeting specific demographic groups",
      "Operational harmful cyber instructions",
      "Instructions for evading AI safety systems",
    ],
    attributionExpectations: [
      "Always link to the original approved source",
      "Show source name",
      "Show author when available",
      "Show original publication date when available",
      "Summarise source material rather than republishing it",
      "Attribute technical claims to the source, paper, release note, or benchmark",
      "Clearly separate sourced facts from editorial interpretation",
    ],
    reviewExpectations: [
      "Require original URL before publication",
      "Require title before publication",
      "Require publication date or ingestion date before publication",
      "Require category assignment from approved taxonomy",
      "Block prohibited content patterns before publication",
      "Require human approval before generated content moves to ready",
      "Flag sensitive safety, policy, medical, legal, and financial topics for optional extra review",
    ],
  },
  theme: {
    designDirection: "credible_readable_editorial_modern",
    logo: {
      available: false,
      approach:
        "Typographic wordmark or masthead first. Add a small abstract mark later only if the brand direction is confirmed.",
    },
    colors: {
      primary: "#1F3A36",
      accent: "#C66A2E",
      background: "#FAF8F3",
      text: "#1D1D1B",
      secondaryUi: ["#D8D2C4", "#6E746E", "#EDF1EA"],
    },
    typography: {
      body: ["Source Sans 3", "Inter"],
      headings: ["Source Serif 4", "Literata", "Noto Serif"],
    },
  },
  seo: {
    titleTemplate: "{article_title} | {site_name}",
    descriptions: {
      "en-GB":
        "Concise, factual AI news, model updates, tools, research, policy, and practical explainers.",
      "uk-UA":
        "Стислі та фактичні новини про ШІ, оновлення моделей, інструменти, дослідження, політику та практичні пояснення.",
    },
    canonical: {
      requireProductionOrigin: true,
      note: "Use the final production domain only. Do not generate canonical URLs pointing to localhost.",
    },
    robots: {
      local: "noindex,nofollow",
      staging: "noindex,nofollow",
      production: "index,follow",
    },
  },
} as const satisfies SiteConfig;

export const siteConfig = validateSiteConfig(aiLandscapeBriefSiteConfig);

export function parseSiteConfig(input: unknown): SiteConfigValidationResult {
  const issues = collectSiteConfigIssues(input);

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, config: input as SiteConfig, issues: [] };
}

export function validateSiteConfig(input: unknown): SiteConfig {
  const result = parseSiteConfig(input);

  if (!result.ok || result.config === undefined) {
    throw new SiteConfigValidationError(result.issues);
  }

  return result.config;
}

export function getCategorySeedRecords(
  config: SiteConfig = siteConfig,
  locale: LocaleCode = config.locales.defaultLocale,
): readonly CategorySeedRecord[] {
  assertSupportedLocale(config, locale);

  return config.taxonomy.map((category) => {
    const description = resolveLocalizedText(
      category.descriptions,
      locale,
      config.locales.defaultLocale,
    );
    const base = {
      configKey: category.key,
      slug: category.slug,
      name: resolveLocalizedText(category.labels, locale, config.locales.defaultLocale),
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    };

    return {
      ...base,
      ...(description.length > 0 ? { description } : {}),
      ...(category.parentKey !== undefined ? { parentConfigKey: category.parentKey } : {}),
    };
  });
}

export function getSourceSeedRecords(config: SiteConfig = siteConfig): readonly SourceSeedRecord[] {
  return config.sources.map((source) => ({
    configKey: source.key,
    slug: source.slug,
    name: source.name,
    kind: source.kind,
    feedUrl: source.feedUrl,
    homepageUrl: source.homepageUrl,
    language: source.language,
    isActive: source.isActive,
  }));
}

function collectSiteConfigIssues(input: unknown): string[] {
  const issues: string[] = [];
  const root = asRecord(input, "siteConfig", issues);

  if (root === undefined) {
    return issues;
  }

  validateLiteral(root, "schemaVersion", 1, "schemaVersion", issues);
  validateMetadata(root, issues);

  const identity = requireRecord(root, "identity", "identity", issues);
  validateIdentity(identity, issues);

  const locales = requireRecord(root, "locales", "locales", issues);
  const supportedLocales = validateLocales(locales, issues);
  const defaultLocale = readString(locales, "defaultLocale");

  const taxonomy = requireArray(root, "taxonomy", "taxonomy", issues);
  validateTaxonomy(taxonomy, defaultLocale, supportedLocales, issues);

  const sources = requireArray(root, "sources", "sources", issues);
  validateSources(sources, issues);

  const editorialRules = requireRecord(root, "editorialRules", "editorialRules", issues);
  validateEditorialRules(editorialRules, issues);

  const theme = requireRecord(root, "theme", "theme", issues);
  validateTheme(theme, issues);

  const seo = requireRecord(root, "seo", "seo", issues);
  validateSeo(seo, defaultLocale, supportedLocales, issues);

  return issues;
}

function validateMetadata(root: Readonly<Record<string, unknown>>, issues: string[]): void {
  const metadata = requireRecord(root, "metadata", "metadata", issues);

  if (metadata === undefined) {
    return;
  }

  validateLiteral(metadata, "profile", "first_site", "metadata.profile", issues);
  validateRequiredString(metadata, "source", "metadata.source", issues);
  validateDateString(metadata, "updatedAt", "metadata.updatedAt", issues);
  validateStringArray(metadata, "notes", "metadata.notes", issues);
}

function validateIdentity(
  identity: Readonly<Record<string, unknown>> | undefined,
  issues: string[],
): void {
  if (identity === undefined) {
    return;
  }

  validateSlug(readString(identity, "slug"), "identity.slug", issues);
  validateRequiredString(identity, "name", "identity.name", issues);

  const tagline = requireRecord(identity, "tagline", "identity.tagline", issues);
  validateLocalizedText(tagline, "identity.tagline", undefined, issues);

  const domains = requireRecord(identity, "domains", "identity.domains", issues);

  if (domains !== undefined) {
    validateHostname(
      readString(domains, "intendedHostname"),
      "identity.domains.intendedHostname",
      issues,
    );
    validateUrl(readString(domains, "localOrigin"), "identity.domains.localOrigin", issues);
    validateUrl(
      readString(domains, "productionOriginPlaceholder"),
      "identity.domains.productionOriginPlaceholder",
      issues,
    );
  }
}

function validateLocales(
  locales: Readonly<Record<string, unknown>> | undefined,
  issues: string[],
): readonly string[] {
  if (locales === undefined) {
    return [];
  }

  const defaultLocale = readString(locales, "defaultLocale");
  validateLocale(defaultLocale, "locales.defaultLocale", issues);

  const supportedLocales = readStringArray(locales, "supportedLocales");
  validateStringArray(locales, "supportedLocales", "locales.supportedLocales", issues);

  if (supportedLocales.length > 0) {
    validateUnique(supportedLocales, "locales.supportedLocales", issues);
    supportedLocales.forEach((locale, index) =>
      validateLocale(locale, `locales.supportedLocales[${index}]`, issues),
    );

    if (defaultLocale !== undefined && !supportedLocales.includes(defaultLocale)) {
      issues.push("locales.defaultLocale: must be included in locales.supportedLocales");
    }
  }

  const paths = requireRecord(locales, "paths", "locales.paths", issues);

  if (paths !== undefined) {
    supportedLocales.forEach((locale) => {
      const localePath = readString(paths, locale);

      if (localePath === undefined) {
        issues.push(`locales.paths.${locale}: missing path for supported locale`);
      } else if (!localePath.startsWith("/") || !localePath.endsWith("/")) {
        issues.push(`locales.paths.${locale}: must start and end with "/"`);
      }
    });
  }

  return supportedLocales;
}

function validateTaxonomy(
  taxonomy: readonly unknown[] | undefined,
  defaultLocale: string | undefined,
  supportedLocales: readonly string[],
  issues: string[],
): void {
  if (taxonomy === undefined) {
    return;
  }

  if (taxonomy.length === 0) {
    issues.push("taxonomy: must include at least one category");
    return;
  }

  const keys: string[] = [];
  const slugs: string[] = [];

  taxonomy.forEach((entry, index) => {
    const path = `taxonomy[${index}]`;
    const category = asRecord(entry, path, issues);

    if (category === undefined) {
      return;
    }

    const key = readString(category, "key");
    const slug = readString(category, "slug");
    const parentKey = readString(category, "parentKey");

    validateConfigKey(key, `${path}.key`, issues);
    validateSlug(slug, `${path}.slug`, issues);
    validateOptionalConfigKey(parentKey, `${path}.parentKey`, issues);
    validateSortOrder(category, "sortOrder", `${path}.sortOrder`, issues);
    validateBoolean(category, "isActive", `${path}.isActive`, issues);

    const labels = requireRecord(category, "labels", `${path}.labels`, issues);
    validateLocalizedText(labels, `${path}.labels`, defaultLocale, issues);

    const descriptions = requireRecord(category, "descriptions", `${path}.descriptions`, issues);
    validateLocalizedText(descriptions, `${path}.descriptions`, defaultLocale, issues);

    supportedLocales.forEach((locale) => {
      if (labels !== undefined && readString(labels, locale) === undefined) {
        issues.push(`${path}.labels.${locale}: missing label for supported locale`);
      }
    });

    if (key !== undefined) {
      keys.push(key);
    }

    if (slug !== undefined) {
      slugs.push(slug);
    }

    if (key !== undefined && parentKey === key) {
      issues.push(`${path}.parentKey: category cannot be its own parent`);
    }
  });

  validateUnique(keys, "taxonomy.key", issues);
  validateUnique(slugs, "taxonomy.slug", issues);

  const keySet = new Set(keys);
  taxonomy.forEach((entry, index) => {
    if (!isRecord(entry)) {
      return;
    }

    const parentKey = readString(entry, "parentKey");

    if (parentKey !== undefined && !keySet.has(parentKey)) {
      issues.push(`taxonomy[${index}].parentKey: references unknown category key "${parentKey}"`);
    }
  });
}

function validateSources(sources: readonly unknown[] | undefined, issues: string[]): void {
  if (sources === undefined) {
    return;
  }

  if (sources.length === 0) {
    issues.push("sources: must include at least one approved source");
    return;
  }

  const keys: string[] = [];
  const slugs: string[] = [];
  const feedUrls: string[] = [];

  sources.forEach((entry, index) => {
    const path = `sources[${index}]`;
    const source = asRecord(entry, path, issues);

    if (source === undefined) {
      return;
    }

    const key = readString(source, "key");
    const slug = readString(source, "slug");
    const feedUrl = readString(source, "feedUrl");

    validateConfigKey(key, `${path}.key`, issues);
    validateSlug(slug, `${path}.slug`, issues);
    validateRequiredString(source, "name", `${path}.name`, issues);
    validateSourceKind(readString(source, "kind"), `${path}.kind`, issues);
    validateUrl(feedUrl, `${path}.feedUrl`, issues);
    validateUrl(readString(source, "homepageUrl"), `${path}.homepageUrl`, issues);
    validateLanguage(readString(source, "language"), `${path}.language`, issues);
    validateConfigKey(readString(source, "sourceProfile"), `${path}.sourceProfile`, issues);
    validateBoolean(source, "isActive", `${path}.isActive`, issues);

    if (key !== undefined) {
      keys.push(key);
    }

    if (slug !== undefined) {
      slugs.push(slug);
    }

    if (feedUrl !== undefined) {
      feedUrls.push(feedUrl);
    }
  });

  validateUnique(keys, "sources.key", issues);
  validateUnique(slugs, "sources.slug", issues);
  validateUnique(feedUrls, "sources.feedUrl", issues);
}

function validateEditorialRules(
  editorialRules: Readonly<Record<string, unknown>> | undefined,
  issues: string[],
): void {
  if (editorialRules === undefined) {
    return;
  }

  validateLiteral(
    editorialRules,
    "publishingMode",
    "manual_review_required",
    "editorialRules.publishingMode",
    issues,
  );
  validateGeneratedContentStatus(
    readString(editorialRules, "generatedContentDefaultStatus"),
    "editorialRules.generatedContentDefaultStatus",
    issues,
  );
  validateLiteral(
    editorialRules,
    "manualReviewRequired",
    true,
    "editorialRules.manualReviewRequired",
    issues,
  );
  validateStringArray(editorialRules, "tone", "editorialRules.tone", issues);
  validateRequiredString(
    editorialRules,
    "primaryAudience",
    "editorialRules.primaryAudience",
    issues,
  );
  validateRequiredString(editorialRules, "contentScope", "editorialRules.contentScope", issues);

  const topicBoundaries = requireRecord(
    editorialRules,
    "topicBoundaries",
    "editorialRules.topicBoundaries",
    issues,
  );

  if (topicBoundaries !== undefined) {
    validateStringArray(
      topicBoundaries,
      "include",
      "editorialRules.topicBoundaries.include",
      issues,
    );
    validateStringArray(
      topicBoundaries,
      "exclude",
      "editorialRules.topicBoundaries.exclude",
      issues,
    );
  }

  validateStringArray(
    editorialRules,
    "prohibitedContent",
    "editorialRules.prohibitedContent",
    issues,
  );
  validateStringArray(
    editorialRules,
    "attributionExpectations",
    "editorialRules.attributionExpectations",
    issues,
  );
  validateStringArray(
    editorialRules,
    "reviewExpectations",
    "editorialRules.reviewExpectations",
    issues,
  );
}

function validateTheme(
  theme: Readonly<Record<string, unknown>> | undefined,
  issues: string[],
): void {
  if (theme === undefined) {
    return;
  }

  validateRequiredString(theme, "designDirection", "theme.designDirection", issues);

  const logo = requireRecord(theme, "logo", "theme.logo", issues);

  if (logo !== undefined) {
    validateBoolean(logo, "available", "theme.logo.available", issues);
    validateRequiredString(logo, "approach", "theme.logo.approach", issues);
  }

  const colors = requireRecord(theme, "colors", "theme.colors", issues);

  if (colors !== undefined) {
    ["primary", "accent", "background", "text"].forEach((field) =>
      validateHexColor(readString(colors, field), `theme.colors.${field}`, issues),
    );

    const secondaryUi = readStringArray(colors, "secondaryUi");
    validateStringArray(colors, "secondaryUi", "theme.colors.secondaryUi", issues);
    secondaryUi.forEach((color, index) =>
      validateHexColor(color, `theme.colors.secondaryUi[${index}]`, issues),
    );
  }

  const typography = requireRecord(theme, "typography", "theme.typography", issues);

  if (typography !== undefined) {
    validateStringArray(typography, "body", "theme.typography.body", issues);
    validateStringArray(typography, "headings", "theme.typography.headings", issues);
  }
}

function validateSeo(
  seo: Readonly<Record<string, unknown>> | undefined,
  defaultLocale: string | undefined,
  supportedLocales: readonly string[],
  issues: string[],
): void {
  if (seo === undefined) {
    return;
  }

  validateRequiredString(seo, "titleTemplate", "seo.titleTemplate", issues);

  const descriptions = requireRecord(seo, "descriptions", "seo.descriptions", issues);
  validateLocalizedText(descriptions, "seo.descriptions", defaultLocale, issues);
  supportedLocales.forEach((locale) => {
    if (descriptions !== undefined && readString(descriptions, locale) === undefined) {
      issues.push(`seo.descriptions.${locale}: missing description for supported locale`);
    }
  });

  const canonical = requireRecord(seo, "canonical", "seo.canonical", issues);

  if (canonical !== undefined) {
    validateLiteral(
      canonical,
      "requireProductionOrigin",
      true,
      "seo.canonical.requireProductionOrigin",
      issues,
    );
    validateRequiredString(canonical, "note", "seo.canonical.note", issues);
  }

  const robots = requireRecord(seo, "robots", "seo.robots", issues);

  if (robots !== undefined) {
    validateRobots(readString(robots, "local"), "seo.robots.local", issues);
    validateRobots(readString(robots, "staging"), "seo.robots.staging", issues);
    validateRobots(readString(robots, "production"), "seo.robots.production", issues);
  }
}

function assertSupportedLocale(config: SiteConfig, locale: LocaleCode): void {
  if (!config.locales.supportedLocales.includes(locale)) {
    throw new SiteConfigValidationError([`locale: unsupported locale "${locale}"`]);
  }
}

function resolveLocalizedText(
  text: LocalizedText,
  locale: LocaleCode,
  fallbackLocale: LocaleCode,
): string {
  return text[locale] ?? text[fallbackLocale] ?? "";
}

function asRecord(
  input: unknown,
  path: string,
  issues: string[],
): Readonly<Record<string, unknown>> | undefined {
  if (!isRecord(input)) {
    issues.push(`${path}: expected object`);
    return undefined;
  }

  return input;
}

function isRecord(input: unknown): input is Readonly<Record<string, unknown>> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function requireRecord(
  input: Readonly<Record<string, unknown>> | undefined,
  key: string,
  path: string,
  issues: string[],
): Readonly<Record<string, unknown>> | undefined {
  if (input === undefined) {
    return undefined;
  }

  const value = input[key];

  if (!isRecord(value)) {
    issues.push(`${path}: expected object`);
    return undefined;
  }

  return value;
}

function requireArray(
  input: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: string[],
): readonly unknown[] | undefined {
  const value = input[key];

  if (!Array.isArray(value)) {
    issues.push(`${path}: expected array`);
    return undefined;
  }

  return value;
}

function readString(
  input: Readonly<Record<string, unknown>> | undefined,
  key: string,
): string | undefined {
  const value = input?.[key];
  return typeof value === "string" ? value : undefined;
}

function readStringArray(
  input: Readonly<Record<string, unknown>> | undefined,
  key: string,
): readonly string[] {
  const value = input?.[key];
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : [];
}

function validateRequiredString(
  input: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: string[],
): void {
  const value = input[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`${path}: expected non-empty string`);
  }
}

function validateStringArray(
  input: Readonly<Record<string, unknown>> | undefined,
  key: string,
  path: string,
  issues: string[],
): void {
  const value = input?.[key];

  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((entry) => typeof entry === "string")
  ) {
    issues.push(`${path}: expected non-empty string array`);
    return;
  }

  value.forEach((entry, index) => {
    if (entry.trim().length === 0) {
      issues.push(`${path}[${index}]: expected non-empty string`);
    }
  });
}

function validateLocalizedText(
  input: Readonly<Record<string, unknown>> | undefined,
  path: string,
  requiredLocale: string | undefined,
  issues: string[],
): void {
  if (input === undefined) {
    return;
  }

  const entries = Object.entries(input);

  if (entries.length === 0) {
    issues.push(`${path}: expected at least one locale entry`);
    return;
  }

  entries.forEach(([locale, value]) => {
    validateLocale(locale, `${path}.${locale}`, issues);

    if (typeof value !== "string" || value.trim().length === 0) {
      issues.push(`${path}.${locale}: expected non-empty string`);
    }
  });

  if (requiredLocale !== undefined && readString(input, requiredLocale) === undefined) {
    issues.push(`${path}.${requiredLocale}: missing default locale value`);
  }
}

function validateLiteral(
  input: Readonly<Record<string, unknown>>,
  key: string,
  expected: string | number | boolean,
  path: string,
  issues: string[],
): void {
  if (input[key] !== expected) {
    issues.push(`${path}: expected ${JSON.stringify(expected)}`);
  }
}

function validateBoolean(
  input: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: string[],
): void {
  if (typeof input[key] !== "boolean") {
    issues.push(`${path}: expected boolean`);
  }
}

function validateSortOrder(
  input: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: string[],
): void {
  const value = input[key];

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    issues.push(`${path}: expected non-negative integer`);
  }
}

function validateConfigKey(value: string | undefined, path: string, issues: string[]): void {
  if (value === undefined || !/^[a-z][a-z0-9_]*$/.test(value)) {
    issues.push(`${path}: expected stable config key matching /^[a-z][a-z0-9_]*$/`);
  }
}

function validateOptionalConfigKey(
  value: string | undefined,
  path: string,
  issues: string[],
): void {
  if (value !== undefined) {
    validateConfigKey(value, path, issues);
  }
}

function validateSlug(value: string | undefined, path: string, issues: string[]): void {
  if (value === undefined || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    issues.push(`${path}: expected URL slug matching /^[a-z0-9]+(?:-[a-z0-9]+)*$/`);
  }
}

function validateLocale(value: string | undefined, path: string, issues: string[]): void {
  if (value === undefined || !/^[a-z]{2,3}-[A-Z]{2}$/.test(value)) {
    issues.push(`${path}: expected BCP-47 locale like en-GB`);
  }
}

function validateLanguage(value: string | undefined, path: string, issues: string[]): void {
  if (value === undefined || !/^[a-z]{2,3}$/.test(value)) {
    issues.push(`${path}: expected ISO language code like en`);
  }
}

function validateHostname(value: string | undefined, path: string, issues: string[]): void {
  if (
    value === undefined ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(value)
  ) {
    issues.push(`${path}: expected hostname`);
  }
}

function validateUrl(value: string | undefined, path: string, issues: string[]): void {
  if (value === undefined) {
    issues.push(`${path}: expected URL`);
    return;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      issues.push(`${path}: expected http or https URL`);
    }
  } catch {
    issues.push(`${path}: expected URL`);
  }
}

function validateDateString(
  value: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
  issues: string[],
): void {
  const date = readString(value, key);

  if (date === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    issues.push(`${path}: expected YYYY-MM-DD date string`);
  }
}

function validateHexColor(value: string | undefined, path: string, issues: string[]): void {
  if (value === undefined || !/^#[0-9A-Fa-f]{6}$/.test(value)) {
    issues.push(`${path}: expected #RRGGBB color`);
  }
}

function validateSourceKind(value: string | undefined, path: string, issues: string[]): void {
  if (value !== "rss" && value !== "atom" && value !== "json_feed") {
    issues.push(`${path}: expected one of rss, atom, json_feed`);
  }
}

function validateGeneratedContentStatus(
  value: string | undefined,
  path: string,
  issues: string[],
): void {
  if (value !== "draft" && value !== "review") {
    issues.push(`${path}: expected draft or review`);
  }
}

function validateRobots(value: string | undefined, path: string, issues: string[]): void {
  if (value !== "index,follow" && value !== "noindex,nofollow") {
    issues.push(`${path}: expected index,follow or noindex,nofollow`);
  }
}

function validateUnique(values: readonly string[], path: string, issues: string[]): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  });

  duplicates.forEach((value) => issues.push(`${path}: duplicate value "${value}"`));
}
