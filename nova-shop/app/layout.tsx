import type { ReactNode } from 'react';
export const metadata = { title: 'Customer account | NOIR' };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
