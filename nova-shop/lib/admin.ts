import { notFound } from "next/navigation";
import { currentSession } from "./customer";
export async function requireAdmin() {
  const session = await currentSession();
  if (session?.customer.role !== "ADMIN") notFound();
  return session.customer.id;
}
