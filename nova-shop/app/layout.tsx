import type { ReactNode } from "react";
import { siteUrl } from "../lib/site-url";
export async function generateMetadata() {
  return { title: "NOIR", metadataBase: await siteUrl() };
}
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
