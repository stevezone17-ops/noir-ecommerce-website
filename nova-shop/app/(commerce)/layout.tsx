import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { currentSession } from '../../lib/customer';
import '../account/style.css';
import './commerce.css';

export default async function Layout({children}:{children:ReactNode}) {
  if (!await currentSession()) redirect('/account');
  return <><header><a href="/">NOIR.</a><a href="/account">My account</a></header><main className="commerce">{children}</main></>;
}
