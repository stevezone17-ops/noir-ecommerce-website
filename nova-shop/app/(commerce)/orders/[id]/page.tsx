import {notFound,redirect} from 'next/navigation';
import {currentSession,db} from '../../../../lib/customer';
import {labels,money} from '../../../../lib/checkout';
import Controls from './controls';

async function cancel(id:string) {
  'use server';
  const session = await currentSession();
  if (!session) redirect('/account');
  await db.order.updateMany({where:{id,customerId:session.customerId,status:'PENDING_PAYMENT'},data:{status:'CANCELLED'}});
  redirect('/orders/'+encodeURIComponent(id));
}

export default async function Details({params}:{params:Promise<{id:string}>}) {
  const session = await currentSession();
  if (!session) redirect('/account');
  const {id} = await params;
  const o = await db.order.findFirst({where:{id,customerId:session.customerId},include:{items:true,paymentEvents:{where:{eventType:'payment.failed'},take:1}}});
  if (!o) notFound();
  const pending = o.status==='PENDING_PAYMENT';
  const publicKey = process.env.RAZORPAY_KEY_ID;
  return <><a href="/orders">← Order history</a><h1>{o.status==='PAID'?'Order confirmed':'Order details'}</h1><p>NOIR-{o.id}</p>
    <p>{labels[o.status]} · {o.status==='REFUNDED'?'Refunded':o.razorpayPaymentId?'Paid':o.paymentEvents.length?'Payment failed':'Unpaid'}</p>
    <div className="checkout-grid"><section><h2>Items</h2>{o.items.map(i=><p className="line" key={i.id}><span>{i.title} × {i.quantity} at {money(i.unitPricePaise)}</span><strong>{money(i.lineTotalPaise)}</strong></p>)}
    <p>Subtotal {money(o.subtotalPaise)} · Shipping {money(o.shippingPaise)}</p><p className="total">Total {money(o.totalPaise)}</p></section>
    <aside><h2>Ship to</h2><p>{o.shippingName}<br/>{o.addressLine1}<br/>{o.city}, {o.state} {o.postalCode}<br/>{o.country}</p><p>{o.shippingPhone}<br/>{o.shippingEmail}</p></aside></div>
    <Controls settled={!!o.razorpayPaymentId} cancelled={o.status==='CANCELLED'} order={{id:o.id,gateway:o.razorpayOrderId || '',total:o.totalPaise,publicKey:publicKey?.startsWith('rzp_test_')?publicKey:'',finished:!pending}}/>
    {pending && <><p>If you just paid, refresh this page to check confirmation.</p><form action={cancel.bind(null,id)}><button className="secondary">Cancel unpaid order</button></form></>}</>;
}
