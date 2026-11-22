'use client';
import {resume} from '../../checkout/actions';
import {useEffect} from 'react';
import {usePayment} from '../../checkout/widget';
export default function Controls({order,settled,cancelled}:{order:{id:string;gateway:string;publicKey:string;total:number;finished:boolean};settled:boolean;cancelled:boolean}) {
  const payment = usePayment();
  useEffect(()=>{
    if (!settled && !cancelled) return;
    const storage = 'noir-bag-'+order.id;
    try {
      const snapshot = JSON.parse(sessionStorage.getItem(storage) || 'null');
      if (!snapshot) return;
      if (settled && JSON.stringify(snapshot.cart) === JSON.stringify(JSON.parse(localStorage.getItem('noir-cart') || '{}')))
        localStorage.removeItem('noir-cart');
      localStorage.removeItem(snapshot.storageKey); sessionStorage.removeItem(storage);
    } catch {}
  },[order.id,settled,cancelled]);
  if (order.finished || !order.publicKey || !order.gateway) return null;
  return <>{payment.script}<button disabled={payment.busy} onClick={()=>payment.pay(()=>resume(order.id))}>Resume test payment</button><p role="status">{payment.message}</p></>;
}
