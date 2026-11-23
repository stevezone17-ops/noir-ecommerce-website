import {db} from '../../../lib/customer';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const id=Number((await params).id);
  if(!Number.isSafeInteger(id)||id<1||id>2147483647)return new Response(null,{status:404});
  const p=await db.product.findFirst({where:{id,active:true},select:{detailPhoto:true}});
  return p?.detailPhoto?new Response(new Uint8Array(p.detailPhoto),{headers:{'Content-Type':'image/webp','X-Content-Type-Options':'nosniff'}}):new Response(null,{status:404});
}
