'use server';
import { db, currentSession } from '../../../lib/customer';
import { quote, address } from '../../../lib/checkout';
import { ownedOrder, paymentEntity, recordPayment } from '../../../lib/payments';
import { testKey, createRazorpayTestOrder, verifyCheckoutSignature, fetchTestPayment } from '../../../src/lib/razorpay';

export async function begin(cart: unknown, key: string, form: FormData) {
  const session = await currentSession();
  if (!session) throw Error('Sign in to check out.');
  if (typeof key !== 'string' || !/^[a-f0-9-]{36}$/.test(key)) throw Error('Invalid checkout.');

  const shipping = address(form);
  const publicKey = testKey();
  const customerId = session.customerId;
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${customerId + key}, 0))`;
    const products=await tx.product.findMany({where:{active:true},select:{id:true,name:true,pricePaise:true,category:true,supplierId:true,costPaise:true,variants:{select:{id:true,size:true,color:true},orderBy:{id:'asc'}}}});
    const pricing=quote(cart,products);
    let order = await tx.order.findUnique({where:{customerId_checkoutKey:{customerId,checkoutKey:key}}, include:{items:true}});
    if (order) {
      const saved = order;
      if (Object.entries(shipping).some(([k,v]) => saved[k as keyof typeof shipping] !== v) ||
          pricing.items.length !== saved.items.length || pricing.items.some(i => !saved.items.some(j => j.productId === i.productId && j.quantity === i.quantity)))
        throw Error('Checkout details changed.');
    } else {
      const {items,...totals} = pricing;
      const snapshots=[];
      for(const item of items){
        const reserved=await tx.variant.updateMany({where:{id:item.variantId,stock:{gte:item.quantity}},data:{stock:{decrement:item.quantity}}});
        if(!reserved.count)throw Error('Stock changed. Review the bag.');
        const product=products.find(p=>p.id===Number(item.productId.split(':')[0]))!;
        snapshots.push({...item,allocated:true,category:product.category,costPaise:product.costPaise,supplierId:product.supplierId});
      }
      order = await tx.order.create({data:{customerId,checkoutKey:key,...shipping,...totals,items:{create:snapshots}},include:{items:true}});
    }
    let gateway = order.razorpayOrderId;
    if (!gateway) {
      gateway = (await createRazorpayTestOrder(order.totalPaise,order.id)).orderId;
      await tx.order.update({where:{id:order.id},data:{razorpayOrderId:gateway}});
    }
    return {id:order.id, finished:order.status !== 'PENDING_PAYMENT', gateway, publicKey, total:order.totalPaise};
  },{timeout:15000});
}

export async function confirm(id: string, paymentId: string, signature: string) {
  const session = await currentSession();
  if (!session || typeof id !== 'string' || id.length > 80 || typeof paymentId !== 'string' ||
    !/^pay_[A-Za-z0-9]{1,80}$/.test(paymentId) || typeof signature !== 'string') return false;
  testKey();
  const order = await ownedOrder(id,session.customerId);
  if (!order?.razorpayOrderId || !verifyCheckoutSignature(order.razorpayOrderId,paymentId,signature)) return false;
  const p = paymentEntity(await fetchTestPayment(paymentId));
  if (!p || p.orderId !== order.razorpayOrderId || p.id !== paymentId || !p.captured || p.status !== 'captured' || p.amount !== order.totalPaise) return false;
  await db.$transaction(tx => recordPayment(tx,p));
  return true;
}
