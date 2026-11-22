import {catalog} from '../../../lib/catalog';
import { redirect } from 'next/navigation';
import { currentSession } from '../../../lib/customer';
import Checkout from './form';
export default async function Page() {
  const session = await currentSession();
  if (!session) redirect('/account');
  return <Checkout products={await catalog()} customer={session.customer}/>;
}
