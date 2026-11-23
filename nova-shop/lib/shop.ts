import type {catalog} from './catalog';
export type Product = Awaited<ReturnType<typeof catalog>>[number];
const bundled=new Set(['photo-1598032895397-b9472444bf93','photo-1544816155-12df9643f363','photo-1523275335684-37898b6baf30','photo-1514228742587-6b1558fcca3d','photo-1521572163474-6864f9cf17ab','photo-1547949003-9792a18a2601','photo-1507473885765-e6ed057f782c','photo-1525966222134-fcfa99b8ae77']);
export function photo(p:Product,detail=false){
  const file=p.image.match(/^https:\/\/images\.unsplash\.com\/(photo-[\w-]+)\?/)?.[1];
  if(file&&bundled.has(file))return '/editorial/'+file+(detail?'-detail':'')+'.webp';
  return p.image || undefined;
}
export function variantKey(p:Product,index:number){return index===0?String(p.id):p.id+':'+p.variants[index].id;}
