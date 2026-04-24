import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
});

const nextConfigs = compat
  .config({
    extends: ["next/core-web-vitals", "next/typescript"],
    settings: {
      next: {
        rootDir: "apps/web/",
      },
    },
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  })
  .map((config) => ({
    ...config,
    files: ["apps/web/**/*.{js,jsx,ts,tsx}", "apps/web/next.config.ts"],
  }));

export default [
  {
    ignores: ["**/.next/**", "**/.turbo/**", "**/coverage/**", "**/dist/**", "**/node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-console": "off",
    },
  },
  ...nextConfigs,
];
