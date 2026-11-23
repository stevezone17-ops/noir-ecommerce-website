'use client';
import {createContext,useContext,useEffect,useRef,useState,useActionState} from 'react';
import {money} from '../../lib/checkout';
import {photo,variantKey,type Product} from '../../lib/shop';
import {subscribe} from './actions';
type Store={products:Product[];saved:number[];toggle:(id:number)=>void;add:(p:Product,i:number,q:number)=>void;ready:boolean};
const Context=createContext<Store|null>(null);
export function useShop(){return useContext(Context)!}
export function Heart({filled=false}:{filled?:boolean}){return <svg viewBox="0 0 24 24" width="20" height="20" fill={filled?'currentColor':'none'} stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M12 20.2 3.8 12a5.2 5.2 0 0 1 8.2-6.4 5.2 5.2 0 0 1 8.2 6.4Z"/></svg>}
export function Photo({p,detail=false}:{p:Product;detail?:boolean}){const src=photo(p,detail);return src?<img loading="lazy" src={src} alt={p.name}/>:<span className="placeholder">Image coming soon</span>}
function read(key:string){try{return JSON.parse(localStorage.getItem(key)??'null')}catch{return null}}
function persist(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
export function ShopFrame({products,children}:{products:Product[];children:React.ReactNode}){
 const [bag,setBag]=useState<Record<string,number>>({}),[saved,setSaved]=useState<number[]>([]),[ready,setReady]=useState(false),[menu,setMenu]=useState(false);
 const [note,setNote]=useState(''),[newsletter,submit,pending]=useActionState(subscribe,'');
 const drawer=useRef<HTMLDialogElement>(null);
 useEffect(()=>{function sync(){const b=read('noir-cart'),s=read('noir-wishlist');setBag(b&&typeof b==='object'&&!Array.isArray(b)?Object.fromEntries(Object.entries(b).filter(([,q])=>typeof q==='number'&&Number.isInteger(q)&&q>0)) as Record<string,number>:{});setSaved(Array.isArray(s)?s.filter(Number.isInteger):[]);setReady(true)}sync();window.addEventListener('storage',sync);window.addEventListener('pageshow',sync);return()=>{window.removeEventListener('storage',sync);window.removeEventListener('pageshow',sync)}},[]);
 function change(key:string,q:number){const next={...bag};if(q)next[key]=q;else delete next[key];setBag(next);persist('noir-cart',next)}
 function add(p:Product,i:number,q:number){const v=p.variants[i];if(!v||!ready)return;const key=variantKey(p,i),amount=(bag[key]||0)+q;if(amount>Math.min(v.stock,99)){setNote('The bag already contains the available quantity.')}else{change(key,amount);setNote('')}drawer.current?.showModal()}
 function toggle(id:number){const next=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];setSaved(next);persist('noir-wishlist',next)}
 const entries=Object.entries(bag).map(([key,q])=>{const p=products.find(p=>p.id===Number(key.split(':')[0]));return {key,q,p,v:p?.variants.find((_,i)=>variantKey(p,i)===key)}});
 const invalid=entries.some(e=>!e.v||e.q>Math.min(99,e.v.stock));
 return <Context.Provider value={{products,saved,toggle,add,ready}}><div className="boutique"><a className="skip" href="#content">Skip to content</a>
 <div className="announcement">Complimentary shipping on orders over ₹2,999</div>
 <header className="mast"><button className="mobile-toggle" aria-expanded={menu} onClick={()=>setMenu(!menu)}>Menu</button><a className="wordmark" href="/">NOIR<span>.</span></a>
 <nav className={menu?'expanded':''} aria-label="Collections">{[['New arrivals','New'],['Women','Women'],['Men','Men'],['Accessories','Accessories']].map(([label,value])=><a key={label} href={'/?edit='+value+'#shop'}>{label}</a>)}</nav>
 <div className="utilities"><a href="/?focus=search#shop" aria-label="Search catalog">⌕</a><a href="/?edit=Wishlist#shop" aria-label={'Wishlist, '+saved.length+' items'}><Heart/></a><a href="/account" className="account-link">Account</a><button onClick={()=>{setNote('');drawer.current?.showModal()}} aria-label="Open shopping bag">Bag <span>({entries.reduce((n,e)=>n+e.q,0)})</span></button></div></header>
 <main id="content">{children}</main><footer><div><a className="wordmark" href="/">NOIR.</a><p>Everyday essentials, thoughtfully selected.</p><a href="/#shop">Collection</a> · <a href="/orders">Order history</a> · <a href="/account">Account</a></div><form action={submit}><label htmlFor="letter">Letters from NOIR</label><p>Sign up for collection news.</p><div><input id="letter" type="email" name="email" required maxLength={254} placeholder="Email address"/><button disabled={pending}>Subscribe ↗</button></div><small role="status">{newsletter}</small></form></footer>
 <dialog ref={drawer} className="bag" aria-labelledby="bag-heading" onClick={e=>{if(e.target===drawer.current&&e.clientX<drawer.current!.getBoundingClientRect().left)drawer.current?.close()}}><div className="bag-head"><h2 id="bag-heading">Shopping bag</h2><button onClick={()=>drawer.current?.close()} aria-label="Close shopping bag">✕</button></div>
 {entries.map(({key,q,p,v})=><article className="bag-row" key={key}>{p&&<Photo p={p}/>}<div><strong>{p?.name??'Unavailable product'}</strong><p>{v?v.size+' / '+v.color:'Unavailable variant'}</p><p>{p&&money(p.pricePaise)}</p><button aria-label="Decrease quantity" onClick={()=>change(key,q-1)}>−</button> {q} <button aria-label="Increase quantity" disabled={!v||q>=Math.min(v.stock,99)} onClick={()=>change(key,q+1)}>+</button> <button className="text-button" onClick={()=>change(key,0)}>Remove</button></div></article>)}
 {!entries.length&&<p>Your bag is empty. Explore the collection to find your first piece.</p>}
 <p role="status">{note|| (invalid?'Update unavailable quantities before checkout.':'')}</p>
 <div className="bag-total">Subtotal <strong>{money(entries.reduce((n,e)=>n+(e.p?.pricePaise??0)*e.q,0))}</strong></div>
 <button id="checkout" className="solid" disabled={!entries.length||invalid} onClick={()=>location.assign('/checkout')}>Continue to checkout →</button></dialog>
 </div></Context.Provider>
}
export function Card({p}:{p:Product}){
 const s=useShop(),available=p.variants.some(v=>v.stock>0);
 return <article className="tile"><div className="tile-photo"><a href={'/products/'+p.id}><Photo p={p}/></a><button className="heart" aria-label={'Save '+p.name} aria-pressed={s.saved.includes(p.id)} disabled={!s.ready} onClick={()=>s.toggle(p.id)}><Heart filled={s.saved.includes(p.id)}/></button></div>
 <div className="caption"><small>{p.category}</small><strong>{money(p.pricePaise)}</strong></div><h3><a href={'/products/'+p.id}>{p.name}</a></h3>
 {p.variants.length===1?<button className="quick" data-add={p.id} disabled={!s.ready||!available} onClick={()=>s.add(p,0,1)}>{available?'Add to bag +':'Out of stock'}</button>:<a className="quick" href={'/products/'+p.id}>{available?'Select options →':'Out of stock'}</a>}</article>;
}
