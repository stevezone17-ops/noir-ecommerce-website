import { OrderStatus } from "@prisma/client";
import { requireAdmin } from "../../../lib/admin";
import { db } from "../../../lib/customer";
import { labels, money } from "../../../lib/checkout";
import { fulfill, dispatch, cancelPending } from "../actions";
export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams,
    q = String(params.q ?? "")
      .trim()
      .slice(0, 120);
  const status = Object.values(OrderStatus).find((x) => x === params.status);
  const page = Math.min(
    100000,
    Math.max(1, Math.floor(Number(params.page) || 1)),
  );
  const where = {
    status,
    OR: q
      ? [
          { id: { contains: q } },
          { shippingEmail: { contains: q, mode: "insensitive" as const } },
          { shippingName: { contains: q, mode: "insensitive" as const } },
        ]
      : undefined,
  };
  const rows = await db.order.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 21,
    skip: (page - 1) * 20,
    include: { items: true, paymentEvents: true },
  });
  const audit = await db.audit.findMany({
    where: { target: { in: rows.map((o) => o.id) } },
    orderBy: { id: "asc" },
  });
  const link = (n: number) =>
    "?" + new URLSearchParams({ q, status: status ?? "", page: String(n) });
  return (
    <>
      <h1>Orders</h1>
      <form>
        <label>
          Order, customer or email
          <input name="q" defaultValue={q} />
        </label>
        <label>
          Status
          <select name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {Object.entries(labels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button>Search</button>
      </form>
      {rows.length === 0 && <p>No matching orders.</p>}
      {rows.slice(0, 20).map((o) => (
        <details key={o.id}>
          <summary>
            NOIR-{o.id} · {labels[o.status]} · {money(o.totalPaise)}
          </summary>
          <p>
            {o.razorpayPaymentId ? "Verified payment" : "Unpaid"}
            {o.inventoryHold ? " · Restock required" : ""}
          </p>
          <p>
            {o.shippingName}
            <br />
            {o.addressLine1} {o.addressLine2}
            <br />
            {o.city}, {o.state} {o.postalCode}, {o.country}
            <br />
            {o.shippingEmail} · {o.shippingPhone}
          </p>
          {o.items.map((i) => (
            <section key={i.id}>
              <strong>
                {i.title} × {i.quantity}
              </strong>
              <p>{money(i.lineTotalPaise)}</p>
              {i.supplierId && (
                <>
                  <p>
                    Supplier #{i.supplierId} · {i.supplierStatus} ·{" "}
                    {i.supplierTracking}
                  </p>
                  {o.razorpayPaymentId && i.supplierStatus !== "Delivered" && (
                    <form action={dispatch}>
                      <input type="hidden" name="id" value={i.id} />
                      <label>
                        Next supplier status
                        <select name="status">
                          <option>
                            {
                              (
                                {
                                  Awaiting: "Requested",
                                  Requested: "Dispatched",
                                  Dispatched: "Delivered",
                                } as Record<string, string>
                              )[i.supplierStatus]
                            }
                          </option>
                        </select>
                      </label>
                      <label>
                        Supplier tracking
                        <input
                          name="tracking"
                          defaultValue={i.supplierTracking ?? ""}
                        />
                      </label>
                      <button>Update supplier fulfillment</button>
                    </form>
                  )}
                </>
              )}
            </section>
          ))}
          {o.razorpayPaymentId &&
            ["PAID", "PROCESSING", "SHIPPED"].includes(o.status) && (
              <form action={fulfill}>
                <input name="id" type="hidden" value={o.id} />
                <label>
                  Next order status
                  <select name="status">
                    <option>
                      {
                        (
                          {
                            PAID: "PROCESSING",
                            PROCESSING: "SHIPPED",
                            SHIPPED: "DELIVERED",
                          } as Record<string, string>
                        )[o.status]
                      }
                    </option>
                  </select>
                </label>
                <label>
                  Tracking number
                  <input name="tracking" defaultValue={o.tracking ?? ""} />
                </label>
                <button>Advance order</button>
              </form>
            )}
          {o.status === "PENDING_PAYMENT" && (
            <form action={cancelPending}>
              <input type="hidden" name="id" value={o.id} />
              <label>
                Cancellation reason
                <input name="reason" required />
              </label>
              <button>Cancel unpaid order</button>
            </form>
          )}
          <h2>Timeline</h2>
          <ol>
            {[
              { at: o.createdAt, text: "Order created" },
              ...(o.paidAt ? [{ at: o.paidAt, text: "Verified payment" }] : []),
              ...o.paymentEvents.map((e) => ({
                at: e.createdAt,
                text: e.eventType,
              })),
              ...audit
                .filter((a) => a.target === o.id)
                .map((a) => ({
                  at: a.createdAt,
                  text: a.action + " · " + a.detail + " · " + a.actor,
                })),
            ]
              .sort((a, b) => +a.at - +b.at)
              .map((e, i) => (
                <li key={i}>
                  {e.at.toISOString()} · {e.text}
                </li>
              ))}
          </ol>
        </details>
      ))}
      {page > 1 && <a href={link(page - 1)}>Previous </a>}
      {rows.length > 20 && <a href={link(page + 1)}>Next</a>}
    </>
  );
}
