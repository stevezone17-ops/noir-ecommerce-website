import type { ReactNode } from 'react';
export const metadata = { title: 'NOIR', metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000') };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
