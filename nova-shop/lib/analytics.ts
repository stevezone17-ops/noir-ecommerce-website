import { db } from "./customer";
// Exclude refunds from revenue, include shipping in receipts and exclude it from product margin.
export const paid = {
  razorpayPaymentId: { not: null },
  status: { not: "REFUNDED" as const },
};
export async function leaders() {
  return db.$queryRaw<{ title: string; units: bigint }[]>`
    SELECT MAX(i.title) title,SUM(i.quantity) units FROM "OrderItem" i JOIN "Order" o ON o.id=i."orderId"
    WHERE o."razorpayPaymentId" IS NOT NULL AND o.status!='REFUNDED' GROUP BY i."productId" ORDER BY units DESC,title LIMIT 10`;
}
export async function periods(unit: "day" | "week" | "month") {
  return db.$queryRaw<{ period: Date; revenue: bigint }[]>`
    SELECT date_trunc(${unit}, "paidAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') period,SUM("totalPaise") revenue
    FROM "Order" WHERE "razorpayPaymentId" IS NOT NULL AND status!='REFUNDED' AND "paidAt" IS NOT NULL
    GROUP BY 1 ORDER BY 1 DESC LIMIT 12`;
}
