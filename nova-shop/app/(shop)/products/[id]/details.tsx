'use client';
import {useState} from 'react';
import {photo,type Product} from '../../../../lib/shop';
import {money} from '../../../../lib/checkout';
import {Heart,useShop} from '../../store';
export default function Details({p,extra}:{p:Product;extra:boolean}){
 const shop=useShop(),[index,select]=useState(Math.max(0,p.variants.findIndex(v=>v.stock>0))),[q,quantity]=useState(1),[view,setView]=useState(0);
 const images=[...new Set([photo(p),extra?'/products-media/'+p.id:photo(p,true)].filter(Boolean))];
 const v=p.variants[index],saved=shop.saved.includes(p.id);
 return <div className="detail"><div><div className="main-photo">{images[view]?<img src={images[view]} alt={p.name+(view?' — detail':'')}/>:<p>Image coming soon</p>}</div>{images.length>1&&<div className="thumbs">{images.map((src,i)=><button key={src} aria-label={i?'Show detail image':'Show main image'} aria-pressed={view===i} onClick={()=>setView(i)}><img src={src} alt=""/></button>)}</div>}</div>
 <div className="purchase"><small>{p.category}</small><h1>{p.name}</h1><strong>{money(p.pricePaise)}</strong><p>{p.description||'Part of the NOIR '+p.category.toLowerCase()+' collection.'}</p>
 <label>Size and color<select value={index} onChange={e=>{select(Number(e.target.value));quantity(1)}}>{p.variants.map((v,i)=><option key={v.id} value={i}>{v.size} / {v.color}</option>)}</select></label>
 <p role="status">{v?.stock?v.stock+' available':'Out of stock'}</p><label>Quantity<input type="number" min={1} max={Math.min(99,v?.stock??0)} value={q||''} onChange={e=>quantity(Number(e.target.value))}/></label><button className="solid" disabled={!shop.ready||!Number.isInteger(q)||q<1||q>Math.min(99,v?.stock??0)} onClick={()=>shop.add(p,index,q)}>Add to bag</button><button className="save" disabled={!shop.ready} aria-pressed={saved} onClick={()=>shop.toggle(p.id)}><Heart filled={saved}/>{saved?'Saved to wishlist':'Save to wishlist'}</button>
 <details><summary>Shipping</summary><p>Shipping within India is ₹99, with complimentary shipping on orders over ₹2,999.</p></details></div></div>
}
