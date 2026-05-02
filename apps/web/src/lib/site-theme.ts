import { siteConfig } from "@topicpress/config";
import type { CSSProperties } from "react";

type SiteThemeStyle = CSSProperties & Record<`--${string}`, string>;

const theme = siteConfig.theme;
const colors = theme.colors;

function secondaryUiColor(index: number, fallback: string): string {
  return colors.secondaryUi[index] ?? fallback;
}

function cssFontFamily(fonts: readonly string[], fallbacks: readonly string[]): string {
  return [...fonts, ...fallbacks].map((font) => JSON.stringify(font)).join(", ");
}

const border = secondaryUiColor(0, "#D8D2C4");
const mutedForeground = secondaryUiColor(1, "#6E746E");
const muted = secondaryUiColor(2, "#EDF1EA");

export const siteThemeTokenMapping = {
  background: "siteConfig.theme.colors.background",
  foreground: "siteConfig.theme.colors.text",
  primary: "siteConfig.theme.colors.primary",
  accent: "siteConfig.theme.colors.accent",
  muted: "siteConfig.theme.colors.secondaryUi[2]",
  mutedForeground: "siteConfig.theme.colors.secondaryUi[1]",
  border: "siteConfig.theme.colors.secondaryUi[0]",
  card: "conservative surface derived for readable editorial cards",
  cardForeground: "siteConfig.theme.colors.text",
  typographyBody: "siteConfig.theme.typography.body",
  typographyHeadings: "siteConfig.theme.typography.headings",
} as const;

export const siteThemeStyle: SiteThemeStyle = {
  "--background": colors.background,
  "--foreground": colors.text,
  "--card": "#FFFFFF",
  "--card-foreground": colors.text,
  "--popover": "#FFFFFF",
  "--popover-foreground": colors.text,
  "--primary": colors.primary,
  "--primary-foreground": colors.background,
  "--secondary": muted,
  "--secondary-foreground": colors.text,
  "--muted": muted,
  "--muted-foreground": mutedForeground,
  "--accent": colors.accent,
  "--accent-foreground": colors.background,
  "--destructive": "#B42318",
  "--border": border,
  "--input": border,
  "--ring": colors.primary,
  "--chart-1": colors.primary,
  "--chart-2": colors.accent,
  "--chart-3": mutedForeground,
  "--chart-4": border,
  "--chart-5": muted,
  "--radius": "0.5rem",
  "--sidebar": colors.background,
  "--sidebar-foreground": colors.text,
  "--sidebar-primary": colors.primary,
  "--sidebar-primary-foreground": colors.background,
  "--sidebar-accent": muted,
  "--sidebar-accent-foreground": colors.text,
  "--sidebar-border": border,
  "--sidebar-ring": colors.primary,
  "--surface": "#FFFFFF",
  "--surface-muted": muted,
  "--text": colors.text,
  "--accent-muted": "#F4E1D4",
  "--danger": "#B42318",
  "--danger-muted": "#FEE4E2",
  "--warning": "#A15C07",
  "--warning-muted": "#FFF4D6",
  "--font-sans": cssFontFamily(theme.typography.body, ["Arial", "Helvetica", "sans-serif"]),
  "--font-heading": cssFontFamily(theme.typography.headings, ["Georgia", "serif"]),
};
