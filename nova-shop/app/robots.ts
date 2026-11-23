import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/site-url";
export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/orders", "/checkout", "/api/"],
    },
    sitemap: new URL("/sitemap.xml", await siteUrl()).href,
  };
}
