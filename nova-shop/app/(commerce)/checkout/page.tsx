import { redirect } from 'next/navigation';
import { currentSession } from '../../../lib/customer';
import Checkout from './form';
export default async function Page() {
  const session = await currentSession();
  if (!session) redirect('/account');
  return <Checkout customer={session.customer}/>;
}
