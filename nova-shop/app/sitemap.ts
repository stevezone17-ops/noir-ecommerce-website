import {db} from '../lib/customer';
import type {MetadataRoute} from 'next';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const base=process.env.SITE_URL;if(!base)return [];
 const items=await db.product.findMany({where:{active:true},select:{id:true}});
 return ['/',...items.map(i=>'/products/'+i.id)].map(path=>({url:new URL(path,base).href}));
}
