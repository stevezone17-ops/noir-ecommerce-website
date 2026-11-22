"use server";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/admin";
import { db } from "../../lib/customer";
import { allocate, lockOrder, release } from "../../lib/inventory";
import type { Prisma } from "@prisma/client";

function field(f: FormData, k: string, max = 120, required = true) {
  const value = f.get(k);
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    throw Error("Invalid " + k);
  return value.trim();
}
function integer(f: FormData, k: string, min: number, max = 1000000) {
  const value = field(f, k);
  if (!/^-?\d+$/.test(value) || Number(value) < min || Number(value) > max)
    throw Error("Invalid " + k);
  return Number(value);
}
function price(f: FormData, k: string) {
  const v = field(f, k);
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(v)) throw Error("Invalid INR amount");
  return Math.round(Number(v) * 100);
}
type Tx = Prisma.TransactionClient;
function log(
  tx: Tx,
  actor: string,
  action: string,
  target: string,
  detail: string,
) {
  return tx.audit.create({ data: { actor, action, target, detail } });
}
function refresh() {
  revalidatePath("/admin", "layout");
}
export async function product(f: FormData) {
  const actor = await requireAdmin();
  const id = integer(f, "id", 0),
    name = field(f, "name"),
    category = field(f, "category", 60),
    description = field(f, "description", 3000, false);
  const pricePaise = price(f, "price");
  if (!pricePaise) throw Error("Price must be positive");
  const supplierId = integer(f, "supplier", 0) || null;
  const costPaise = field(f, "cost", 20, false) ? price(f, "cost") : null;
  const data = {
    name,
    category,
    description,
    pricePaise,
    costPaise,
    supplierId,
    active: f.get("active") === "on",
  };
  const image = f.get("image");
  let photo: Uint8Array<ArrayBuffer> | undefined;
  if (image instanceof File && image.size) {
    if (image.size > 800000) throw Error("Image exceeds 800 KB");
    const decoder = sharp(Buffer.from(await image.arrayBuffer()), {
      limitInputPixels: 16000000,
    });
    const meta = await decoder.metadata();
    if (!["jpeg", "png", "webp"].includes(meta.format ?? ""))
      throw Error("Unsupported image");
    photo = new Uint8Array(
      await decoder
        .rotate()
        .resize(1200, 1500, { fit: "inside", withoutEnlargement: true })
        .webp()
        .toBuffer(),
    );
  }
  await db.$transaction(async (tx) => {
    const p = id
      ? await tx.product.update({ where: { id }, data })
      : await tx.product.create({
          data: {
            ...data,
            variants: { create: { size: "Standard", color: "Original" } },
          },
        });
    if (photo)
      await tx.product.update({
        where: { id: p.id },
        data: { photo, image: "/images/" + p.id },
      });
    await log(
      tx,
      actor,
      id ? "Product edited" : "Product created",
      "product:" + p.id,
      JSON.stringify(data),
    );
  });
  refresh();
}
export async function stock(f: FormData) {
  const actor = await requireAdmin(),
    id = integer(f, "id", 1),
    delta = integer(f, "delta", -100000),
    reason = field(f, "reason", 240);
  if (!delta) throw Error("Enter a nonzero adjustment");
  await db.$transaction(async (tx) => {
    const result = await tx.variant.updateMany({
      where: {
        id,
        stock: {
          gte: Math.max(0, -delta),
          lte: 2000000000 - Math.max(0, delta),
        },
      },
      data: { stock: { increment: delta } },
    });
    if (!result.count) throw Error("Insufficient available stock");
    await log(
      tx,
      actor,
      "Stock adjusted",
      "variant:" + id,
      delta + " · " + reason,
    );
  });
  refresh();
}
export async function variant(f: FormData) {
  const actor = await requireAdmin(),
    productId = integer(f, "product", 1),
    size = field(f, "size", 40),
    color = field(f, "color", 40);
  await db.$transaction(async (tx) => {
    const v = await tx.variant.create({ data: { productId, size, color } });
    await log(
      tx,
      actor,
      "Variant created",
      "product:" + productId,
      v.id + " · " + size + " / " + color,
    );
  });
  refresh();
}
export async function supplier(f: FormData) {
  const actor = await requireAdmin(),
    id = integer(f, "id", 0);
  const data = {
    name: field(f, "name"),
    contact: field(f, "contact"),
    email: field(f, "email", 254),
    phone: field(f, "phone", 32),
    deliveryDays: integer(f, "days", 0, 730),
  };
  if (
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email) ||
    !/^\+?[0-9 ()-]{6,32}$/.test(data.phone)
  )
    throw Error("Invalid contact details");
  await db.$transaction(async (tx) => {
    const s = id
      ? await tx.supplier.update({ where: { id }, data })
      : await tx.supplier.create({ data });
    await log(tx, actor, "Supplier saved", "supplier:" + s.id, data.name);
  });
  refresh();
}
export async function fulfill(f: FormData) {
  const actor = await requireAdmin(),
    id = field(f, "id"),
    next = field(f, "status"),
    tracking = field(f, "tracking", 120, false);
  await db.$transaction(async (tx) => {
    await lockOrder(tx, id);
    const order = await tx.order.findUniqueOrThrow({ where: { id } });
    if (!order.razorpayPaymentId) throw Error("Verified payment required");
    if (!(
      (order.status === "PAID" && next === "PROCESSING") ||
      (order.status === "PROCESSING" && next === "SHIPPED") ||
      (order.status === "SHIPPED" && next === "DELIVERED")
    ))
      throw Error("Invalid status transition");
    if (next === "SHIPPED" && !tracking) throw Error("Tracking required");
    if (!(await allocate(tx, id))) throw Error("Restock before fulfillment");
    await tx.order.update({
      where: { id },
      data: {
        status: next as "PROCESSING" | "SHIPPED" | "DELIVERED",
        tracking: tracking || order.tracking,
        inventoryHold: false,
      },
    });
    await log(
      tx,
      actor,
      "Fulfillment",
      id,
      order.status + " → " + next + (tracking ? " · " + tracking : ""),
    );
  });
  refresh();
}
export async function dispatch(f: FormData) {
  const actor = await requireAdmin(),
    id = field(f, "id"),
    status = field(f, "status"),
    tracking = field(f, "tracking", 120, false);
  const stages = ["Awaiting", "Requested", "Dispatched", "Delivered"];
  await db.$transaction(async (tx) => {
    const item = await tx.orderItem.findUniqueOrThrow({
      where: { id },
      include: { order: true },
    });
    if (
      !item.supplierId ||
      !item.order.razorpayPaymentId ||
      item.order.inventoryHold ||
      !["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(
        item.order.status,
      ) ||
      stages.indexOf(status) !== stages.indexOf(item.supplierStatus) + 1 ||
      !stages.includes(status) ||
      (status === "Dispatched" && !tracking)
    )
      throw Error("Invalid supplier update");
    const changed = await tx.orderItem.updateMany({
      where: { id, supplierStatus: item.supplierStatus },
      data: {
        supplierStatus: status,
        supplierTracking: tracking || item.supplierTracking,
      },
    });
    if (!changed.count) throw Error("Refresh order");
    await log(
      tx,
      actor,
      "Supplier fulfillment",
      item.orderId,
      item.title + " · " + status + " " + tracking,
    );
  });
  refresh();
}

export async function cancelPending(f: FormData) {
  const actor = await requireAdmin(),
    id = field(f, "id"),
    reason = field(f, "reason", 240);
  await db.$transaction(async (tx) => {
    await lockOrder(tx, id);
    const changed = await tx.order.updateMany({
      where: { id, status: "PENDING_PAYMENT", razorpayPaymentId: null },
      data: { status: "CANCELLED" },
    });
    if (!changed.count)
      throw Error("Only unpaid pending orders can be cancelled.");
    await release(tx, id);
    await log(tx, actor, "Order cancelled", id, reason);
  });
  refresh();
}
