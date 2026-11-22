'use client';
import Script from 'next/script';
import { useState } from 'react';
import { confirm } from './actions';

type Result = {razorpay_payment_id:string; razorpay_signature:string};
type Payment = {id:string;gateway:string;total:number;publicKey:string;finished:boolean};
type Options = {key:string;order_id:string;amount:number;currency:string;name:string;handler:(result:Result)=>void;modal:{ondismiss:()=>void};theme:{color:string}};
declare global { interface Window { Razorpay?: new(options:Options)=>{open:()=>void} } }

export function usePayment() {
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const script = <Script src="https://checkout.razorpay.com/v1/checkout.js" onError={()=>setMessage('Payment service unavailable. Please try again later.')}/>;
  async function pay(prepare:()=>Promise<Payment>) {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      if (!window.Razorpay) throw Error();
      const order = await prepare();
      const details = '/orders/' + encodeURIComponent(order.id);
      if (order.finished) {location.assign(details); return;}
      new window.Razorpay({key:order.publicKey,order_id:order.gateway,amount:order.total,currency:'INR',name:'NOIR',theme:{color:'#191919'},
        handler:async result=>{
          try { await confirm(order.id,result.razorpay_payment_id,result.razorpay_signature); }
          finally {location.assign(details);}
        },
        modal:{ondismiss:()=>location.assign(details)}
      }).open();
    } catch {setMessage('Unable to open test checkout. Check your bag and shipping details, then try again.');setBusy(false);}
  }
  return {busy,message,pay,script};
}
