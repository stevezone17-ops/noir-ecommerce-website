import type { ReactNode } from "react";
import { requireAdmin } from "../../lib/admin";
import "./style.css";
export default async function Layout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="studio">
      <header>
        <a href="/">NOIR.</a>
        <span>Administration</span>
        <a href="/account">Account</a>
      </header>
      <nav>
        {[
          ["", "Overview"],
          ["products", "Products & stock"],
          ["orders", "Orders"],
          ["suppliers", "Suppliers"],
          ["analytics", "Analytics"],
        ].map(([url, label]) => (
          <a key={url} href={"/admin/" + url}>
            {label}
          </a>
        ))}
      </nav>
      <main>{children}</main>
    </div>
  );
}
