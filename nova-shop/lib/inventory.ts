import type {Prisma} from '@prisma/client';

// Serialize all inventory lifecycle decisions on the order row.
export async function lockOrder(tx:Prisma.TransactionClient,id:string){
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${id} FOR UPDATE`;
}
export async function release(tx:Prisma.TransactionClient,orderId:string){
  const rows=await tx.orderItem.findMany({where:{orderId,allocated:true},orderBy:{variantId:'asc'}});
  for(const item of rows){
    if(item.variantId)await tx.variant.update({where:{id:item.variantId},data:{stock:{increment:item.quantity}}});
  }
  await tx.orderItem.updateMany({where:{orderId,allocated:true},data:{allocated:false}});
}
export async function allocate(tx:Prisma.TransactionClient,orderId:string){
  const rows=await tx.orderItem.findMany({where:{orderId,allocated:false,variantId:{not:null}},orderBy:{variantId:'asc'}});
  for(const item of rows){
    const taken=await tx.variant.updateMany({where:{id:item.variantId!,stock:{gte:item.quantity}},data:{stock:{decrement:item.quantity}}});
    if(!taken.count)return false;
    await tx.orderItem.update({where:{id:item.id},data:{allocated:true}});
  }
  return true;
}
