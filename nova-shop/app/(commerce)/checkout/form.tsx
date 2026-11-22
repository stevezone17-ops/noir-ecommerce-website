'use client';
import {useEffect,useState} from 'react';
import {quote,money,type CatalogRow} from '../../../lib/checkout';
import {begin} from './actions';
import {usePayment} from './widget';

const fields = [
  ['shippingName','Full name','name'],['shippingPhone','Indian mobile number','tel'],
  ['shippingEmail','Email address','email'],['addressLine1','Street address','street-address'],
  ['city','City','address-level2'],['state','State or union territory','address-level1'],['postalCode','PIN code','postal-code']
] as const;

export default function Checkout({customer,products}:{products:CatalogRow[];customer:{id:string;name:string;email:string}}) {
  const [cart,setCart] = useState<Record<string,number>>({});
  const [ready,setReady] = useState(false);
  const payment = usePayment();
  useEffect(()=>{
    try {setCart(JSON.parse(localStorage.getItem('noir-cart') || '{}'));} catch {}
    setReady(true);
  },[]);
  let summary;
  try {summary = quote(cart,products);} catch {}
  if (!summary) return <><h1>Checkout</h1><p>{ready?'Your bag is empty or needs updating.':'Loading your bag…'}</p><a href="/#shop">Return to the collection</a></>;
  return <>{payment.script}<a href="/#shop">← Collection</a><h1>Checkout</h1><div className="checkout-grid">
    <section><h2>Shipping address</h2><form onSubmit={event=>{
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void payment.pay(async ()=>{
        const fingerprint = JSON.stringify([customer.id,cart,...form.values()]);
        const hash = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(fingerprint));
        const storageKey = 'noir-checkout-' + Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
        const key = localStorage.getItem(storageKey) || crypto.randomUUID();
        localStorage.setItem(storageKey,key);
        const order = await begin(cart,key,form);
        sessionStorage.setItem('noir-bag-'+order.id,JSON.stringify({cart,storageKey}));
        return order;
      });
    }}>
    {fields.map(([key,label,auto])=><label key={key}>{label}<input name={key} autoComplete={auto} required
      defaultValue={key==='shippingName'?customer.name:key==='shippingEmail'?customer.email:''}
      type={key==='shippingEmail'?'email':key==='shippingPhone'?'tel':'text'}
      inputMode={key==='postalCode'?'numeric':undefined}
      pattern={key==='shippingPhone'?'(\\+91)?[6-9][0-9]{9}':key==='postalCode'?'[1-9][0-9]{5}':undefined}
      maxLength={key==='shippingPhone'?13:key==='postalCode'?6:key==='shippingEmail'?254:key==='addressLine1'?300:100}/></label>)}
    <label>Country<select name="country"><option value="IN">India</option></select></label>
    <button disabled={payment.busy}>{payment.busy?'Opening checkout…':'Pay '+money(summary.totalPaise)+' in test mode'}</button>
    <p role="status">{payment.message}</p></form></section>
    <aside><h2>Order summary</h2>{summary.items.map(i=><p className="line" key={i.productId}><span>{i.title} × {i.quantity}</span><strong>{money(i.lineTotalPaise)}</strong></p>)}
    <p className="line">Subtotal <span>{money(summary.subtotalPaise)}</span></p><p className="line">Shipping <span>{money(summary.shippingPaise)}</span></p>
    <p className="line total">Total <strong>{money(summary.totalPaise)}</strong></p></aside></div></>;
}
