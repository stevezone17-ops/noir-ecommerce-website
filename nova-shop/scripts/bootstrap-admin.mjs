// Trusted database operator only. Invalidate all sessions so promotion requires a fresh sign-in.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const email = process.argv[2]?.trim().toLowerCase();
if (!email)
  throw Error("Supply the verified email of an existing operator account.");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  await db.$transaction(async (tx) => {
    const c = await tx.customer.update({
      where: { email },
      data: { role: "ADMIN" },
    });
    await tx.session.deleteMany({ where: { customerId: c.id } });
    await tx.audit.create({
      data: {
        actor: "database operator",
        action: "Admin bootstrap",
        target: c.id,
        detail: "Granted ADMIN and revoked sessions",
      },
    });
  });
} finally {
  await db.$disconnect();
}
