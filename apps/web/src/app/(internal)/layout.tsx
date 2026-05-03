import type { Metadata } from "next";
import type { ReactNode } from "react";

import { siteConfig } from "@topicpress/config";

import { siteThemeStyle } from "@/lib/site-theme";

import "../globals.css";

export const metadata: Metadata = {
  title: "Topicpress",
  description: "Topicpress publication scaffold.",
};

export default function InternalRootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang={siteConfig.locales.defaultLocale} className="font-sans" style={siteThemeStyle}>
      <body>{children}</body>
    </html>
  );
}
