'use client';
import {useState} from 'react';
import {Card,useShop} from './store';
export default function CatalogView({edit,focus}:{edit:string;focus:boolean}){
 const {products,saved}=useShop(),[term,setTerm]=useState(''),[category,setCategory]=useState(edit==='Accessories'?'Accessories':''),[size,setSize]=useState(''),[color,setColor]=useState(''),[low,setLow]=useState(''),[high,setHigh]=useState(''),[sort,setSort]=useState(edit==='New'?'new':'featured'),[page,setPage]=useState(1);
 const base=products.filter(p=>(edit!=='Wishlist'||saved.includes(p.id))&&(!['Men','Women'].includes(edit)||((p.audience==='Unisex'||p.audience===edit)&&p.category!=='Lifestyle')));
 const filtered=base.filter(p=>(!category||p.category===category)&&p.name.toLowerCase().includes(term.toLowerCase().trim())&&p.pricePaise>=Number(low||0)*100&&(!high||p.pricePaise<=Number(high)*100)&&p.variants.some(v=>(!size||v.size===size)&&(!color||v.color===color)));
 if(sort==='low')filtered.sort((a,b)=>a.pricePaise-b.pricePaise);if(sort==='high')filtered.sort((a,b)=>b.pricePaise-a.pricePaise);if(sort==='new')filtered.sort((a,b)=>b.id-a.id);
 const pages=Math.max(1,Math.ceil(filtered.length/8)),current=Math.min(page,pages);
 function choices(label:string,values:string[],value:string,set:(v:string)=>void){return <label>{label}<select value={value} onChange={e=>{set(e.target.value);setPage(1)}}><option value="">All</option>{[...new Set(values)].sort().map(v=><option key={v}>{v}</option>)}</select></label>}
 return <section id="shop" className="section catalog"><div className="section-head"><h2>{edit==='Wishlist'?'Your wishlist':edit==='Men'||edit==='Women'?edit+'’s collection':edit==='New'?'New arrivals':'The collection'}</h2><small role="status">{filtered.length} pieces</small></div>
 <div className="tools"><label className="search">Search<input type="search" autoFocus={focus} placeholder="Search the collection" list="suggestions" value={term} onChange={e=>{setTerm(e.target.value);setPage(1)}}/></label><datalist id="suggestions">{base.filter(p=>p.name.toLowerCase().includes(term.toLowerCase())).slice(0,8).map(p=><option key={p.id} value={p.name}/>)}</datalist>
 {choices('Category',base.map(p=>p.category),category,setCategory)}{choices('Size',base.flatMap(p=>p.variants.map(v=>v.size)),size,setSize)}{choices('Color',base.flatMap(p=>p.variants.map(v=>v.color)),color,setColor)}
 <label>Min ₹<input min="0" type="number" value={low} onChange={e=>{setLow(e.target.value);setPage(1)}}/></label><label>Max ₹<input min="0" type="number" value={high} onChange={e=>{setHigh(e.target.value);setPage(1)}}/></label>
 <label>Sort<select value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}}><option value="featured">Featured</option><option value="new">Newest</option><option value="low">Price: low first</option><option value="high">Price: high first</option></select></label></div>
 {!filtered.length&&<p>{edit==='Wishlist'?'Save a piece using its heart button.':products.length?'No pieces match these filters.':'The collection is currently empty.'} <a href="/#shop">Browse all pieces</a></p>}
 <div className="tiles">{filtered.slice((current-1)*8,current*8).map(p=><Card p={p} key={p.id}/>)}</div>
 {pages>1&&<div className="pager"><button disabled={current===1} onClick={()=>setPage(current-1)}>Previous</button> {current} / {pages} <button disabled={current===pages} onClick={()=>setPage(current+1)}>Next</button></div>}</section>;
}
