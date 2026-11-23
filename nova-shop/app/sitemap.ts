import { db } from "../lib/customer";
import { siteUrl } from "../lib/site-url";
import type { MetadataRoute } from "next";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await siteUrl();
  const items = await db.product.findMany({
    where: { active: true },
    select: { id: true },
  });
  return ["/", ...items.map((i) => "/products/" + i.id)].map((path) => ({
    url: new URL(path, base).href,
  }));
}
