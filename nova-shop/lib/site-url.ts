import { headers } from "next/headers";
export async function siteUrl() {
  if (process.env.SITE_URL) return new URL(process.env.SITE_URL);
  const h = await headers(),
    host = h.get("host") || "localhost:3000";
  const protocol = /^(localhost|127\.0\.0\.1)(:|$)/.test(host)
    ? "http"
    : "https";
  return new URL(protocol + "://" + host);
}
