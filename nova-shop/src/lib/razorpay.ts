import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqualHex(actual: string, expected: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(actual)) return false;
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("Razorpay secret is not configured");
  const expected = createHmac("sha256", secret).update(orderId + "|" + paymentId).digest("hex");
  return safeEqualHex(signature, expected);
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("Razorpay webhook secret is not configured");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(signature, expected);
}

export async function createRazorpayTestOrder(amountPaise: number, receipt: string) {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key?.startsWith("rzp_test_") || !secret) throw new Error("Razorpay TEST credentials required");
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) throw new Error("Invalid amount");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(key + ":" + secret).toString("base64"),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt }),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Razorpay order creation failed");
  const order: unknown = await response.json();
  if (!order || typeof order !== "object" || !("id" in order) || typeof order.id !== "string") throw new Error("Invalid Razorpay response");
  return { orderId: order.id, publicKey: key };
}
