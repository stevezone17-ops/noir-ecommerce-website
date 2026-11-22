import {allocate,release,lockOrder} from './inventory';
import type { Prisma } from '@prisma/client';
import { db } from './customer';

export function paymentEntity(input: unknown) {
  if (!input || typeof input !== 'object') return null;
  const p = input as Record<string, unknown>;
  if (typeof p.id !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(p.id) ||
      typeof p.order_id !== 'string' || !/^order_[A-Za-z0-9]+$/.test(p.order_id) ||
      p.currency !== 'INR' || typeof p.amount !== 'number' || !Number.isSafeInteger(p.amount)) return null;
  return {id:p.id, orderId:p.order_id, amount:p.amount, status:p.status, captured:p.captured === true};
}

export async function recordPayment(tx: Prisma.TransactionClient, p: NonNullable<ReturnType<typeof paymentEntity>>, eventId?: string) {
  const order = await tx.order.findUnique({where:{razorpayOrderId:p.orderId}});
  if (!order || order.totalPaise !== p.amount) throw Error('Unmatched payment.');
  await lockOrder(tx,order.id);
  const current=await tx.order.findUniqueOrThrow({where:{id:order.id}});
  if (eventId) {
    const result = await tx.paymentEvent.createMany({data:[{providerEventId:eventId, orderId:order.id, eventType:'payment.' + p.status}], skipDuplicates:true});
    if (!result.count) return;
  }
  if(current.razorpayPaymentId)return;
  if(p.status==='failed' && current.status==='PENDING_PAYMENT')await release(tx,order.id);
  if (p.status === 'captured' && p.captured) {
    const available=await allocate(tx,order.id);
    await tx.order.updateMany({where:{id:order.id, status:{in:['PENDING_PAYMENT','CANCELLED']}, razorpayPaymentId:null},
      data:{status:'PAID', paidAt:new Date(), inventoryHold:!available, razorpayPaymentId:p.id}});
  }
}

export async function ownedOrder(id: string, customerId: string) {
  return db.order.findFirst({where:{id, customerId},include:{items:true}});
}
