import { requireAdmin } from "../../lib/admin";
import { db } from "../../lib/customer";
import { money } from "../../lib/checkout";
import { paid, leaders, periods } from "../../lib/analytics";
import { Chart } from "./chart";
export default async function Overview() {
  await requireAdmin();
  const [revenue, total, customers, pending, low, recent, best, chart] =
    await Promise.all([
      db.order.aggregate({ where: paid, _sum: { totalPaise: true } }),
      db.order.count(),
      db.customer.count({ where: { role: "CUSTOMER" } }),
      db.order.count({ where: { status: "PENDING_PAYMENT" } }),
      db.variant.findMany({
        where: { stock: { lte: 5 }, product: { active: true } },
        include: { product: { select: { name: true } } },
        orderBy: { stock: "asc" },
      }),
      db.order.findMany({
        where: paid,
        orderBy: [
          { paidAt: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        take: 8,
      }),
      leaders(),
      periods("day"),
    ]);
  return (
    <>
      <h1>Store overview</h1>
      <div className="metrics">
        {[
          ["Verified revenue", money(revenue._sum.totalPaise ?? 0)],
          ["Orders", total],
          ["Customers", customers],
          ["Pending payment", pending],
          ["Low-stock products", new Set(low.map((v) => v.productId)).size],
        ].map(([key, v]) => (
          <div className="metric" key={key}>
            {key}
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <section>
        <h2>Daily sales</h2>
        <Chart rows={chart} />
        <a href="/admin/analytics">View analytics</a>
      </section>
      <section>
        <h2>Low stock</h2>
        <ul>
          {low.map((v) => (
            <li key={v.id}>
              {v.product.name} · {v.size} / {v.color} · {v.stock} available
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Recent transactions</h2>
        {recent.length ? (
          recent.map((o) => (
            <p key={o.id}>
              <a href={"/admin/orders?q=" + o.id}>NOIR-{o.id}</a> ·{" "}
              {money(o.totalPaise)}
            </p>
          ))
        ) : (
          <p>No verified payments yet.</p>
        )}
      </section>
      <section>
        <h2>Best sellers</h2>
        {best.map((p) => (
          <p key={p.title}>
            {p.title} · {String(p.units)} sold
          </p>
        ))}
      </section>
    </>
  );
}
