export const money = (paise: number) => new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',minimumFractionDigits:0,maximumFractionDigits:2}).format(paise / 100);

export type CatalogRow = {id:number;name:string;pricePaise:number;variants:{id:number;size:string;color:string}[]};
export function quote(cart: unknown, products:CatalogRow[]) {
  if (!cart || typeof cart !== 'object' || Array.isArray(cart)) throw Error('Invalid shopping bag.');
  const entries = Object.entries(cart).sort();
  if (!entries.length || entries.length > 100) throw Error('Your shopping bag is empty or invalid.');
  const items = entries.map(([productId, quantity]) => {
    const p = products.find(p => String(p.id) === productId.split(':')[0]);
    if (!p || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 99)
      throw Error('Choose between 1 and 99 of each available product.');
    const variant=p.variants.find((v,i)=>(i?p.id+':'+v.id:String(p.id))===productId);
    if (!variant) throw Error('Unknown product option.');
    const unitPricePaise=p.pricePaise;
    return {productId, variantId:variant.id, title:p.variants.length>1 ? p.name + " · " + variant.size + " / " + variant.color : p.name, quantity, unitPricePaise, lineTotalPaise:unitPricePaise * quantity};
  });
  const subtotalPaise = items.reduce((sum, item) => sum + item.lineTotalPaise, 0);
  if(subtotalPaise>2000000000)throw Error("Order exceeds limit.");
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
