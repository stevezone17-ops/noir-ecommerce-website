import {redirect} from 'next/navigation';
import {currentSession,db} from '../../../lib/customer';
import {labels,money} from '../../../lib/checkout';
export default async function Orders() {
  const session = await currentSession();
  if (!session) redirect('/account');
  const orders = await db.order.findMany({where:{customerId:session.customerId},orderBy:{createdAt:'desc'},select:{id:true,createdAt:true,status:true,totalPaise:true}});
  return <><h1>Order history</h1>{orders.length ? orders.map(o=><section key={o.id}><p><a href={'/orders/'+o.id}>NOIR-{o.id}</a></p>
    <p>{o.createdAt.toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})} · {labels[o.status]} · {money(o.totalPaise)}</p></section>):<p>You haven’t placed an order yet.</p>}<a href="/#shop">Shop the collection</a></>;
}
