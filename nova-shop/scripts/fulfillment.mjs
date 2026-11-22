// Operator CLI: run on a trusted host with database credentials.
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const [id, next, tracking] = process.argv.slice(2);
const previous = new Map([['PROCESSING','PAID'],['SHIPPED','PROCESSING'],['DELIVERED','SHIPPED']]).get(next);
if (!id || !previous) throw Error('Usage: node scripts/fulfillment.mjs ORDER_ID PROCESSING|SHIPPED|DELIVERED');
const db = new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
try {
  if(next==='SHIPPED'&&(!tracking||tracking.length>120))throw Error('Supply a tracking number for shipment');
  await db.$transaction(async tx=>{
  const {count} = await tx.order.updateMany({where:{id,status:previous,inventoryHold:false,razorpayPaymentId:{not:null}},data:{status:next,...(tracking?{tracking}:{})}});
  if (!count) throw Error('Order missing or ineligible for this transition.');
  await tx.audit.create({data:{actor:'database operator',action:'Fulfillment',target:id,detail:previous+' → '+next}});
  });
  console.log('Order updated to', next);
} finally {await db.$disconnect();}
