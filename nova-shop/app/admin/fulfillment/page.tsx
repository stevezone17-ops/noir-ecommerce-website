import { requireAdmin } from "../../../lib/admin";
import { db } from "../../../lib/customer";

export default async function Fulfillment({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const page = Math.min(10000, Math.max(1, Math.floor(Number((await searchParams).page) || 1)));
  const orders = await db.order.findMany({
    where: {
      razorpayPaymentId: { not: null },
      status: { in: ["PAID", "PROCESSING", "SHIPPED"] },
      items: { some: { supplierStatus: { not: "Delivered" } } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    skip: (page - 1) * 25,
    take: 26,
    include: { items: { include: { supplier: { select: { id: true, name: true } } } } },
  });

  return (
    <>
      <h1>Supplier fulfillment</h1>
      <p>Open a supplier sheet to place the order manually, then record progress and tracking in Orders.</p>
      {!orders.length && <p>There are no paid orders awaiting fulfillment on this page.</p>}
      {orders.slice(0, 25).map((order) => {
        const suppliers = new Map(order.items.flatMap((item) =>
          item.supplier && item.supplierStatus !== "Delivered" ? [[item.supplier.id, item.supplier.name] as const] : [],
        ));
        return (
          <section key={order.id}>
            <h2>NOIR-{order.id}</h2>
            {order.inventoryHold && <p>Stock hold. Replenish inventory and advance the order before requesting fulfillment.</p>}
            {order.items.some((item) => !item.supplierId) && <p>Some items have no supplier on the order. Review them separately.</p>}
            {suppliers.size > 0 && !order.inventoryHold && (
              <ul>{Array.from(suppliers, ([id, name]) => (
                <li key={id}><a href={`/admin/fulfillment/${order.id}/${id}`}>{name} · fulfillment sheet</a></li>
              ))}</ul>
            )}
            <a href={`/admin/orders?q=${order.id}`}>Manage order and tracking</a>
          </section>
        );
      })}
      {page > 1 && <a href={`?page=${page - 1}`}>Previous</a>}{" "}
      {orders.length > 25 && <a href={`?page=${page + 1}`}>Next</a>}
    </>
  );
}
