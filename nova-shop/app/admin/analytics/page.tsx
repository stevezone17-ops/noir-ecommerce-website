import { requireAdmin } from "../../../lib/admin";
import { db } from "../../../lib/customer";
import { paid, periods, leaders } from "../../../lib/analytics";
import { money, labels } from "../../../lib/checkout";
import { Chart } from "../chart";
export default async function Analytics() {
  await requireAdmin();
  const [day, week, month, best, orders, status, categories, margin] =
    await Promise.all([
      periods("day"),
      periods("week"),
      periods("month"),
      leaders(),
      db.order.aggregate({
        where: paid,
        _avg: { totalPaise: true },
        _count: true,
      }),
      db.order.groupBy({ by: ["status"], _count: true }),
      db.orderItem.groupBy({
        by: ["category"],
        where: { order: paid },
        _sum: { lineTotalPaise: true },
      }),
      db.$queryRaw<
        { profit: bigint | null; missing: bigint }[]
      >`SELECT SUM(("unitPricePaise"-"costPaise")::bigint*quantity) profit,COUNT(*) FILTER(WHERE "costPaise" IS NULL) missing FROM "OrderItem" i JOIN "Order" o ON o.id=i."orderId" WHERE o."razorpayPaymentId" IS NOT NULL AND o.status!='REFUNDED'`,
    ]);
  return (
    <>
      <h1>Sales analytics</h1>
      <p>
        Verified orders · {orders._count}　 Average order value ·{" "}
        {money(orders._avg.totalPaise ?? 0)}　 Delivered ·{" "}
        {status.find((s) => s.status === "DELIVERED")?._count ?? 0}
      </p>
      {(
        [
          ["Daily", day],
          ["Weekly", week],
          ["Monthly", month],
        ] as const
      ).map(([k, r]) => (
        <section key={k}>
          <h2>{k} revenue</h2>
          <Chart rows={r} />
        </section>
      ))}
      <p>
        Periods use capture dates in India. Historical payments without a
        capture timestamp contribute to lifetime totals.
      </p>
      <section>
        <h2>Sales by category</h2>
        {categories.map((c) => (
          <p key={c.category}>
            {c.category ?? "Unclassified"} · {money(c._sum.lineTotalPaise ?? 0)}
          </p>
        ))}
      </section>
      <section>
        <h2>Estimated gross profit</h2>
        <p>
          {margin[0].profit === null
            ? "No recorded costs"
            : money(Number(margin[0].profit))}{" "}
          · Merchandise margin before shipping and fees.{" "}
          {String(margin[0].missing)} paid lines lack a recorded cost and are
          excluded.
        </p>
      </section>
      <section>
        <h2>Best sellers</h2>
        {best.map((r, i) => (
          <p key={i}>
            {r.title} · {String(r.units)} units
          </p>
        ))}
      </section>
      <section>
        <h2>Fulfillment</h2>
        {status.map((s) => (
          <p key={s.status}>
            {labels[s.status]} · {s._count}
          </p>
        ))}
      </section>
    </>
  );
}
