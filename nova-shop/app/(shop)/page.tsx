import {catalog} from '../../lib/catalog';
import {db} from '../../lib/customer';
import {Card} from './store';
import CatalogView from './catalog-view';
export const metadata={title:'NOIR — The Everyday Edit',description:'Shop the NOIR collection of clothing, accessories and everyday essentials.',openGraph:{title:'NOIR — The Everyday Edit',images:['/editorial/campaign.webp']}};
export default async function Home({searchParams}:{searchParams:Promise<{edit?:string;focus?:string}>}){
 const params=await searchParams,products=await catalog();
 const ranking=await db.orderItem.groupBy({by:['productId'],where:{order:{razorpayPaymentId:{not:null},status:{not:'REFUNDED'}}},_sum:{quantity:true}});
 const sales=new Map<number,number>();for(const r of ranking){const id=Number(r.productId.split(':')[0]);sales.set(id,(sales.get(id)||0)+(r._sum.quantity||0))}
 const trending=products.filter(p=>sales.has(p.id)).sort((a,b)=>sales.get(b.id)!-sales.get(a.id)!).slice(0,4);
 return <>{!params.edit&&!params.focus&&<><section className="campaign"><img className="campaign-image" src="/editorial/menswear.webp" alt="Menswear editorial against sculptural architecture" fetchPriority="high"/><div className="campaign-copy"><p>NOIR COLLECTION</p><h1>The Everyday<br/><em>Edit.</em></h1><a href="#shop">Shop the collection <span>↗</span></a></div></section>
 <section className="section"><div className="section-head"><h2>New arrivals</h2><a href="/?edit=New#shop">View all ↗</a></div><div className="tiles">{[...products].reverse().slice(0,4).map(p=><Card key={p.id} p={p}/>)}</div></section>
 <section className="section collections"><div className="section-head"><h2>Featured collections</h2></div><div className="edits">{[['Women','campaign'],['Men','menswear']].map(([name,img])=><a key={name} href={'/?edit='+name+'#shop'}><img src={'/editorial/'+img+'.webp'} alt="" loading="lazy"/><span>{name}’s collection <b>↗</b></span></a>)}</div></section>
 <section className="section"><div className="section-head"><h2>Trending products</h2></div>{trending.length?<div className="tiles">{trending.map(p=><Card key={p.id} p={p}/>)}</div>:<p>Popular pieces will appear here as orders are confirmed.</p>}</section>
 <aside className="promo"><img src="/editorial/wardrobe.webp" alt="" loading="lazy"/><div><h2>Finish the look.</h2><a href="/?edit=Accessories#shop">Explore accessories ↗</a></div></aside></>}
 <CatalogView edit={params.edit??''} focus={params.focus==='search'}/></>
}
