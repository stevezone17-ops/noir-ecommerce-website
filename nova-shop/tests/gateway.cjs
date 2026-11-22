// Load only in the integration-test server using node --require.
const originalFetch = globalThis.fetch;
const orders = new Map();
globalThis.fetch = async function(input, options) {
  const url = typeof input === 'string' ? input : input.url ?? String(input);
  if (!url.startsWith('https://api.razorpay.com/')) return originalFetch(input,options);
  if (url.endsWith('/v1/orders')) {
    const body = JSON.parse(options?.body ?? await input.text());
    const id = 'order_'+body.receipt;
    orders.set(id, body.amount);
    return Response.json({id,amount:body.amount,currency:'INR'});
  }
  const id = url.split('/').pop();
  const order_id = id.replace(/^pay_/,'order_');
  return Response.json({id,order_id,amount:orders.get(order_id),currency:'INR',status:'captured',captured:true});
};
