import { products } from '../public/catalog.js';

export const money = (paise: number) => new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',maximumFractionDigits:0}).format(paise / 100);

export function quote(cart: unknown) {
  if (!cart || typeof cart !== 'object' || Array.isArray(cart)) throw Error('Invalid shopping bag.');
  const entries = Object.entries(cart).sort();
  if (!entries.length || entries.length > products.length) throw Error('Your shopping bag is empty or invalid.');
  const items = entries.map(([productId, quantity]) => {
    const p = products.find(p => String(p.id) === productId);
    if (!p || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 99)
      throw Error('Choose between 1 and 99 of each available product.');
    const unitPricePaise = p.price * 100;
    return {productId, title:p.name, quantity, unitPricePaise, lineTotalPaise:unitPricePaise * quantity};
  });
  const subtotalPaise = items.reduce((sum, item) => sum + item.lineTotalPaise, 0);
  const shippingPaise = subtotalPaise > 299900 ? 0 : 9900;
  return {items, subtotalPaise, shippingPaise, totalPaise:subtotalPaise + shippingPaise};
}

export function address(form: FormData) {
  function field(key: string, max: number, pattern?: RegExp) {
    const raw = form.get(key);
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value || value.length > max || (pattern && !pattern.test(value))) throw Error('Check your shipping details.');
    return value;
  }
  return {
    shippingName:field('shippingName',100), shippingPhone:field('shippingPhone',13,/^(?:\+91)?[6-9]\d{9}$/),
    shippingEmail:field('shippingEmail',254,/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    addressLine1:field('addressLine1',300), city:field('city',100), state:field('state',100),
    postalCode:field('postalCode',6,/^[1-9]\d{5}$/), country:field('country',2,/^IN$/)
  };
}

export const labels = {PENDING_PAYMENT:'Pending', PAID:'Confirmed', PROCESSING:'Processing', SHIPPED:'Shipped', DELIVERED:'Delivered', CANCELLED:'Cancelled', REFUNDED:'Refunded'};
