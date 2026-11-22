import { db } from '../../../../lib/customer';
import { paymentEntity, recordPayment } from '../../../../lib/payments';
import { testKey, verifyWebhookSignature } from '../../../../src/lib/razorpay';

export async function POST(request: Request) {
  testKey();
  const reader = request.body?.getReader();
  if (!reader) return new Response(null,{status:400});
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const {done,value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 256 * 1024) {
      await reader.cancel();
      return new Response(null,{status:413});
    }
    chunks.push(value);
  }
  const raw = Buffer.concat(chunks);
  if (!verifyWebhookSignature(raw,request.headers.get('x-razorpay-signature') ?? '')) return new Response(null,{status:401});
  let event;
  try { event = JSON.parse(raw.toString('utf8')); } catch { return new Response(null,{status:400}); }
  if (!event || typeof event.event !== 'string') return new Response(null,{status:400});
  if (!['payment.captured','payment.failed'].includes(event.event)) return new Response(null,{status:204});
  const p = paymentEntity(event.payload?.payment?.entity);
  const id = request.headers.get('x-razorpay-event-id');
  if (!p || !id || id.length > 200 || event.event !== 'payment.' + p.status || (p.status === 'captured' && !p.captured))
    return new Response(null,{status:400});
  await db.$transaction(tx => recordPayment(tx,p,id));
  return new Response(null,{status:204});
}
