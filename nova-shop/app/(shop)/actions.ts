"use server";
import { db } from "../../lib/customer";
export async function subscribe(_: string, form: FormData) {
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (email.length > 254 || !/^\S+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Enter a valid email address.";
  try {
    await db.subscriber.upsert({
      where: { email },
      create: { email },
      update: {},
    });
    return "You’re on the list.";
  } catch {
    return "Subscription unavailable. Please try again.";
  }
}
