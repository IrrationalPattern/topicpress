import type { Metadata } from "next";
import type { ReactNode } from "react";

import { siteThemeStyle } from "@/lib/site-theme";

import "./globals.css";

export const metadata: Metadata = {
  title: "Topicpress",
  description: "Topicpress publication scaffold.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="font-sans" style={siteThemeStyle}>
      <body>{children}</body>
    </html>
  );
}
