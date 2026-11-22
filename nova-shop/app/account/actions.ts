'use server';
import { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import { allowAttempt, currentSession, db, endSession, hashPassword, matches, startSession } from '../../lib/customer';

const value = (form: FormData, key: string) => {
  const input = form.get(key);
  return typeof input === 'string' ? input : '';
};
const report = (code: string): never => redirect('/account?message=' + code);

export async function authenticate(form: FormData) {
  const email = value(form, 'email').trim().toLowerCase();
  const password = value(form, 'password');
  const signup = value(form, 'mode') === 'signup';
  const name = value(form, 'name').trim();
  if (!/^\S+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254 || !password || password.length > 128) report('invalid');
  if (signup && (!name || name.length > 100 || password.length < 15)) report('signup');
  if (!await allowAttempt(email)) report('wait');
  let id: string;
  if (signup) {
    try {
      const customer = await db.customer.create({ data: { email, name, passwordHash: await hashPassword(password) } });
      id = customer.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') report('unavailable');
      throw error;
    }
  } else {
    const customer = await db.customer.findUnique({ where: { email } });
    const valid = await matches(password, customer?.passwordHash);
    if (!customer || !valid) return report('invalid');
    id = customer.id;
  }
  await startSession(id);
  redirect('/account');
}

export async function updateProfile(form: FormData) {
  const session = await currentSession();
  if (!session) redirect('/account');
  const name = value(form, 'name').trim();
  if (!name || name.length > 100) report('name');
  await db.customer.update({ where: { id: session.customerId }, data: { name } });
  report('saved');
}

export async function logout() {
  await endSession();
  redirect('/account');
}
