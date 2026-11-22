const response = await fetch('/api/catalog');
if (!response.ok) throw Error('Catalog unavailable');
const products = (await response.json()).map(p=>({...p,price:p.pricePaise/100}));
const variants = new Map(products.flatMap(p=>p.variants.map((v,i)=>[i ? p.id+':'+v.id : String(p.id), {...p,variant:v}])));

const money=n=>'₹'+n.toLocaleString('en-IN');let category='All';let cart;try{cart=JSON.parse(localStorage.getItem('noir-cart'))||{}}catch{cart={}};const $=s=>document.querySelector(s);const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const wishlistKey = 'noir-wishlist';
let wishlistOnly = false;

function readWishlist() {
  try {
    const ids = JSON.parse(localStorage.getItem(wishlistKey));
    return new Set(products.filter(p => Array.isArray(ids) && ids.includes(p.id)).map(p => p.id));
  } catch {
    return new Set();
  }
}

let wishlist = readWishlist();
for(const name of new Set(products.map(p=>p.category))){
  if([...document.querySelectorAll('[data-category]')].some(b=>b.dataset.category===name))continue;
  const button=document.createElement('button');button.dataset.category=name;button.textContent=name;
  $('#wishlistFilter').before(button);
}

function renderProducts() {
  const term = $('#search').value.toLowerCase();
  const items = products.filter(p =>
    (category === 'All' || p.category === category) &&
    (!wishlistOnly || wishlist.has(p.id)) &&
    p.name.toLowerCase().includes(term)
  );
  const sort = $('#sort').value;
  if (sort === 'low') items.sort((a, b) => a.price - b.price);
  if (sort === 'high') items.sort((a, b) => b.price - a.price);

  $('#products').innerHTML = items.map(p => `
    <article class="product">
      <div class="product-image">
        <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy">
        ${p.tag ? `<span class="tag">${escapeHTML(p.tag)}</span>` : ''}
        <button class="heart" data-wish="${p.id}" aria-label="Save ${escapeHTML(p.name)} to wishlist" aria-pressed="${wishlist.has(p.id)}">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 20.5 3.6 12A5.4 5.4 0 0 1 12 5.3 5.4 5.4 0 0 1 20.4 12Z"/></svg>
        </button>
        <button class="add" data-add="${p.id}" ${p.variants.some(v=>v.stock>0)?'':'disabled'} aria-label="Add ${escapeHTML(p.name)} to bag">${p.variants.some(v=>v.stock>0)?'Add to bag +':'Out of stock'}</button>
      </div>
      ${p.variants.length>1 ? `<label>Variant <select data-variant>${p.variants.map((v,i)=>`<option value="${i?p.id+':'+v.id:p.id}" ${v.stock?'':'disabled'}>${escapeHTML(v.size)} / ${escapeHTML(v.color)}</option>`).join('')}</select></label>` : ''}
      <div class="product-meta"><div><h3>${escapeHTML(p.name)}</h3><small>${escapeHTML(p.category)}</small><p>${escapeHTML(p.description)}</p></div><strong>${money(p.price)}</strong></div>
    </article>`).join('');
  $('#wishlistCount').textContent = wishlist.size;
  $('#empty').hidden = items.length > 0;
  $('#empty').textContent = wishlistOnly && wishlist.size === 0
    ? 'Your wishlist is empty. Turn off Wishlist and select a heart to save a piece.'
    : 'No products match your selection.';
}

$('#wishlistFilter').addEventListener('click', event => {
  wishlistOnly = !wishlistOnly;
  event.currentTarget.setAttribute('aria-pressed', wishlistOnly);
  renderProducts();
});

$('#products').addEventListener('click', event => {
  const button = event.target.closest('[data-wish]');
  if (!button) return;
  const id = Number(button.dataset.wish);
  if (wishlist.has(id)) wishlist.delete(id);
  else wishlist.add(id);
  try {
    localStorage.setItem(wishlistKey, JSON.stringify([...wishlist]));
  } catch {
    // Keep the current tab usable when storage is unavailable.
  }
  renderProducts();
  const target = document.querySelector(`[data-wish="${id}"]`) || $('.heart') || $('#wishlistFilter');
  target.focus({ preventScroll: true });
});

window.addEventListener('storage', event => {
  if (event.key === wishlistKey || event.key === null) {
    wishlist = readWishlist();
    renderProducts();
  }
});
function save(){localStorage.setItem('noir-cart',JSON.stringify(cart));renderCart()}
function renderCart(){let entries=Object.entries(cart).filter(([id,q])=>q>0&&variants.has(id));let count=entries.reduce((s,[,q])=>s+q,0);$('#cartCount').textContent=`(${count})`;$('#drawerCount').textContent=`(${count})`;$('#cartItems').innerHTML=entries.length?entries.map(([id,q])=>{let p=variants.get(id);return `<div class="cart-item"><img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}"><div><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.variant.size)} / ${escapeHTML(p.variant.color)} · ${money(p.price)}</p><div class="qty"><button data-qty="${id}" data-delta="-1" aria-label="Decrease ${escapeHTML(p.name)} quantity">−</button><span>${q}</span><button data-qty="${id}" data-delta="1" aria-label="Increase ${escapeHTML(p.name)} quantity">+</button></div></div></div>`}).join(''):'<p class="cart-empty">Your bag is empty.<br>Find something you love.</p>';$('#subtotal').textContent=money(entries.reduce((s,[id,q])=>s+variants.get(id).price*q,0));$('#checkout').disabled=!entries.length}
function toggleCart(open){$('#cart').classList.toggle('open',open);$('#cart').setAttribute('aria-hidden',String(!open));$('#overlay').hidden=!open;document.body.style.overflow=open?'hidden':'';if(open)$('#cartClose').focus()}
$('#products').addEventListener('click',e=>{let b=e.target.closest('[data-add]');if(!b)return;let id=b.closest("article").querySelector("[data-variant]")?.value || b.dataset.add;if((cart[id]||0)>=variants.get(id).variant.stock)return;cart[id]=(cart[id]||0)+1;save();toggleCart(true)});$('#cartItems').addEventListener('click',e=>{let b=e.target.closest('[data-qty]');if(!b)return;let id=b.dataset.qty;if(Number(b.dataset.delta)>0 && cart[id]>=variants.get(id).variant.stock)return;cart[id]=Math.max(0,(cart[id]||0)+Number(b.dataset.delta));if(!cart[id])delete cart[id];save()});$('#filters').addEventListener('click',e=>{let b=e.target.closest('[data-category]');if(!b)return;category=b.dataset.category;document.querySelectorAll('[data-category]').forEach(x=>x.classList.toggle('active',x===b));renderProducts()});$('#sort').addEventListener('change',renderProducts);$('#search').addEventListener('input',renderProducts);$('#searchToggle').addEventListener('click',()=>{$('#searchRow').hidden=!$('#searchRow').hidden;if(!$('#searchRow').hidden){location.hash='shop';$('#search').focus()}});$('#cartToggle').addEventListener('click',()=>toggleCart(true));$('#cartClose').addEventListener('click',()=>toggleCart(false));$('#overlay').addEventListener('click',()=>toggleCart(false));document.addEventListener('keydown',e=>{if(e.key==='Escape')toggleCart(false)});$('#checkout').addEventListener('click',()=>{location.assign('/checkout')});$('#newsletterForm').addEventListener('submit',e=>{e.preventDefault();$('#newsletterMsg').textContent='Thanks for subscribing! (Demo — no email was sent.)';e.target.reset()});renderProducts();renderCart();
