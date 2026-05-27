import type { MetadataRoute } from "next";

import { buildPublicRobotsRoute } from "@/lib/public-seo-origin";

export default function robots(): MetadataRoute.Robots {
  return buildPublicRobotsRoute({
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
  });
}
