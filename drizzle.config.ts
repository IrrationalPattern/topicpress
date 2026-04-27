import { defineConfig, type Config } from "drizzle-kit";

const config = {
  schema: "./packages/db/src/schema/index.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
} satisfies Config;

export default defineConfig(config);
