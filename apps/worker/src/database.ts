import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";

import * as schema from "@topicpress/db";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export type TopicpressDatabase = PostgresJsDatabase<typeof schema>;

export interface DatabaseClient {
  readonly db: TopicpressDatabase;
  readonly close: () => Promise<void>;
}

export function createDatabaseClient(databaseUrl = resolveDatabaseUrl()): DatabaseClient {
  const client = postgres(databaseUrl, { max: 1 });

  return {
    db: drizzle(client, { schema }),
    close: () => client.end(),
  };
}

export function resolveDatabaseUrl(): string {
  loadLocalEnvFiles();

  const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;

  if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
    throw new Error(
      "Missing DATABASE_URL or SUPABASE_DB_URL. Start local Supabase, copy .env.example to an ignored .env file, and fill in the local database URL.",
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
