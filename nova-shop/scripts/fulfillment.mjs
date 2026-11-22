// Operator CLI: run on a trusted host with database credentials.
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const [id, next] = process.argv.slice(2);
const previous = new Map([['PROCESSING','PAID'],['SHIPPED','PROCESSING'],['DELIVERED','SHIPPED']]).get(next);
if (!id || !previous) throw Error('Usage: node scripts/fulfillment.mjs ORDER_ID PROCESSING|SHIPPED|DELIVERED');
const db = new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
try {
  const {count} = await db.order.updateMany({where:{id,status:previous,razorpayPaymentId:{not:null}},data:{status:next}});
  if (!count) throw Error('Order missing or ineligible for this transition.');
  console.log('Order updated to', next);
} finally {await db.$disconnect();}
