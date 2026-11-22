import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const globalDb = globalThis as typeof globalThis & { noirDb?: PrismaClient };
export const db = globalDb.noirDb ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
if (process.env.NODE_ENV !== 'production') globalDb.noirDb = db;

const production = process.env.NODE_ENV === 'production';
const cookieName = production ? '__Host-noir-session' : 'noir-session';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
      (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + (await derive(password, salt)).toString('hex');
}

export async function matches(password: string, encoded?: string) {
  const [salt, expected] = encoded?.split(':') ?? ['unregistered', '0'.repeat(128)];
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex')) && Boolean(encoded);
}

export async function currentSession() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  return db.session.findFirst({
    where: { digest: digest(token), expiresAt: { gt: new Date() } },
    include: { customer: { select: { id: true, email: true, name: true } } },
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await db.session.deleteMany({ where: { digest: digest(token) } });
  jar.delete(cookieName);
}

export async function startSession(customerId: string) {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 7 * 86400000);
  await endSession();
  await db.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  await db.session.create({ data: { digest: digest(token), customerId, expiresAt: expires } });
  (await cookies()).set(cookieName, token, { httpOnly: true, secure: production, sameSite: 'lax', path: '/', expires });
}

// A single PostgreSQL statement reserves each attempt across app instances.
export async function allowAttempt(email: string) {
  await db.authAttempt.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  const rows = await db.$queryRaw<{count: number}[]>`
    INSERT INTO "AuthAttempt" ("key", "count", "expiresAt")
    VALUES (${digest(email)}, 1, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
    ON CONFLICT ("key") DO UPDATE SET "count" = "AuthAttempt"."count" + 1
    WHERE "AuthAttempt"."count" < 10 RETURNING "count"
  `;
  return rows.length > 0;
}
