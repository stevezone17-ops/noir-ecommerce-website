import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../../lib/admin";
import { db } from "../../../../../lib/customer";
import "./sheet.css";

export default async function SupplierSheet({
  params,
}: {
  params: Promise<{ orderId: string; supplierId: string }>;
}) {
  await requireAdmin();
  const { orderId, supplierId } = await params;
  const id = Number(supplierId);
  if (!/^[1-9]\d{0,9}$/.test(supplierId) || id > 2147483647) notFound();
  const order = await db.order.findFirst({
    where: {
      id: orderId,
      razorpayPaymentId: { not: null },
      inventoryHold: false,
      status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
      items: { some: { supplierId: id } },
    },
    select: {
      id: true, shippingName: true, shippingPhone: true, addressLine1: true,
      addressLine2: true, city: true, state: true, postalCode: true, country: true,
      items: {
        where: { supplierId: id },
        select: { id: true, productId: true, title: true, quantity: true, supplier: { select: { name: true, contact: true, email: true } } },
      },
    },
  });
  const supplier = order?.items[0]?.supplier;
  if (!order || !supplier) notFound();
  return (
    <article className="supplier-sheet">
      <p className="screen-only"><a href="/admin/fulfillment">← Fulfillment queue</a> · Use your browser’s Print menu to save this sheet as a PDF.</p>
      <h1>Supplier fulfillment sheet</h1>
      <p>{supplier.name} · NOIR-{order.id}</p>
      <p className="screen-only">Supplier contact: {supplier.contact} · {supplier.email}</p>
      <h2>Ship to</h2>
      <p>{order.shippingName}<br />{order.addressLine1}{order.addressLine2 && <><br />{order.addressLine2}</>}<br />
        {order.city}, {order.state} {order.postalCode}, {order.country}<br />{order.shippingPhone}</p>
      <h2>Items</h2>
      <ul>{order.items.map((item) => <li key={item.id}>{item.title} × {item.quantity} · NOIR item {item.productId}</li>)}</ul>
    </article>
  );
}
