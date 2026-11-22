"""Use a disposable migrated database and production server; run from nova-shop."""
import os
import secrets
import subprocess
from playwright.sync_api import sync_playwright, expect

base=os.environ.get('NOIR_TEST_URL','http://localhost:3191')
email=secrets.token_hex(12)+'@example.test'
password=secrets.token_urlsafe(24)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
    p=browser.new_context().new_page()
    for path in ['','/products','/orders','/analytics','/suppliers']:
        assert p.goto(base+'/admin'+path).status==404
    p.goto(base+'/account')
    signup=p.locator('section').filter(has_text='Create an account')
    signup.get_by_label('Name',exact=True).fill('Admin test')
    signup.get_by_label('Email').fill(email)
    signup.get_by_label('Password').fill(password)
    signup.get_by_role('button').click()
    expect(p.get_by_role('heading',name='Profile')).to_be_visible()
    assert p.goto(base+'/admin/products').status==404
    subprocess.run(['node','--env-file=.env','scripts/bootstrap-admin.mjs',email],check=True)
    assert p.goto(base+'/admin').status==404
    p.goto(base+'/account')
    login=p.locator('section').filter(has=p.get_by_role('heading',name='Sign in'))
    login.get_by_label('Email').fill(email)
    login.get_by_label('Password').fill(password)
    login.get_by_role('button').click()
    expect(p.get_by_role('heading',name='Profile')).to_be_visible()
    p.goto(base+'/admin/suppliers')
    p.get_by_text('Add supplier',exact=True).click()
    form=p.locator('details[open] form')
    for label,value in [('Supplier name','Fixture supplier'),('Contact person','Test'),('Email',email),('Phone','9876543210'),('Estimated delivery days','3')]:
        form.get_by_label(label).fill(value)
    form.get_by_role('button').click()
    expect(p.get_by_text('Fixture supplier · 3 days').first).to_be_visible()
    p.goto(base+'/admin/products')
    p.get_by_text('Add product',exact=True).click()
    form=p.locator('details[open] form').first
    name='Fixture '+secrets.token_hex(4)
    form.get_by_label('Name',exact=True).fill(name)
    form.get_by_label('Category').fill('Fixture')
    form.get_by_label('Price').fill('1250')
    form.locator('select[name=supplier]').select_option(label='Fixture supplier')
    form.get_by_label('Unit cost').fill('750')
    import base64
    form.locator('input[type=file]').set_input_files({'name':'fixture.png','mimeType':'image/png','buffer':base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8//8/AwMDEwMDAwMDAwAkBgMB/DXemwAAAABJRU5ErkJggg==')})
    form.get_by_role('button',name='Save product').click()
    row=p.locator('details').filter(has=p.locator('summary',has_text=name))
    expect(row.locator('summary')).to_be_visible()
    entry=next(x for x in p.request.get(base+'/api/catalog').json() if x['name']==name)
    assert p.request.get(base+entry['image']).headers['content-type']=='image/webp'
    row.locator('summary').click()
    row.get_by_label('Description').fill('Updated fixture description')
    row.get_by_role('button',name='Save product').click()
    expect(row.get_by_label('Description')).to_have_value('Updated fixture description')
    row.get_by_label('Size',exact=True).fill('M')
    row.get_by_label('Color',exact=True).fill('Black')
    row.get_by_role('button',name='Add variant').click()
    expect(row.get_by_text('M / Black · 0 available')).to_be_visible()
    row.get_by_label('Stock adjustment').last.fill('4')
    row.get_by_label('Reason').last.fill('Test receipt')
    row.get_by_role('button',name='Adjust stock').last.click()
    expect(row.get_by_text('M / Black · 4 available')).to_be_visible()
    for width in [320,768,1440]:
        p.set_viewport_size({'width':width,'height':900})
        for path in ['/admin','/admin/products','/admin/orders','/admin/suppliers','/admin/analytics']:
            p.goto(base+path)
            assert p.evaluate('document.documentElement.scrollWidth===innerWidth'),(width,path)
    # Compete for one variant in two checkout sessions with different shipping addresses.
    import json, hmac, hashlib
    p.context.route('https://checkout.razorpay.com/**',lambda route:route.fulfill(content_type='application/javascript',
        body='window.Razorpay=class {constructor(o){window.gateway=o} open(){}}'))
    entry=next(x for x in p.request.get(base+'/api/catalog').json() if x['name']==name)
    variant=next(v for v in entry['variants'] if v['size']=='M')
    cart={str(entry['id'])+':'+str(variant['id']):4}
    tabs=[p.context.new_page(),p.context.new_page()]
    for i,tab in enumerate(tabs):
        tab.goto(base+'/account')
        tab.evaluate("cart=>localStorage.setItem('noir-cart',JSON.stringify(cart))",cart)
        tab.goto(base+'/checkout')
        for label,value in [('Indian mobile number','9876543210'),('Street address',str(i)+' Test Street'),('City','Mumbai'),('State or union territory','Maharashtra'),('PIN code','400001')]:
            tab.get_by_label(label,exact=True).fill(value)
        tab.wait_for_function('window.Razorpay !== undefined')
    for tab in tabs:
        tab.get_by_role('button',name='Pay ₹5,000 in test mode').evaluate('b=>b.click()')
    for tab in tabs:
        tab.wait_for_function("window.gateway || document.querySelector('[role=status]')?.textContent.includes('Unable')")
    winners=[t for t in tabs if t.evaluate('!!window.gateway')]
    assert len(winners)==1
    gateway=winners[0].evaluate('window.gateway.order_id')
    payload=json.dumps({'event':'payment.captured','payload':{'payment':{'entity':{
        'id':gateway.replace('order_','pay_'),'order_id':gateway,'amount':500000,'currency':'INR','status':'captured','captured':True}}}})
    signature=hmac.new(os.environ['RAZORPAY_WEBHOOK_SECRET'].encode(),payload.encode(),hashlib.sha256).hexdigest()
    assert p.request.post(base+'/api/razorpay/webhook',data=payload,headers={'x-razorpay-signature':signature,'x-razorpay-event-id':secrets.token_hex(12)}).status==204
    order_id=gateway.removeprefix('order_')
    p.goto(base+'/admin/orders?q='+order_id)
    row=p.locator('details').filter(has=p.locator('summary',has_text='Confirmed')).first
    number=row.locator('summary').inner_text().split(' · ')[0]
    order=p.locator('details').filter(has=p.locator('summary',has_text=number))
    order.locator('summary').click()
    for stage in ['Requested','Dispatched','Delivered']:
        assert order.locator('select[name=status]').first.input_value()==stage
        order.get_by_label('Supplier tracking').fill('MANUAL123')
        order.get_by_role('button',name='Update supplier fulfillment').click()
        expect(order.get_by_text('Supplier #',exact=False).first).to_contain_text(stage)
    for stage,title in [('PROCESSING','Processing'),('SHIPPED','Shipped'),('DELIVERED','Delivered')]:
        assert order.locator('select[name=status]').last.input_value()==stage
        order.get_by_label('Tracking number').fill('TEST123')
        order.get_by_role('button',name='Advance order').click()
        expect(order.locator('summary')).to_contain_text(title)
    p.goto(base+'/admin/analytics')
    expect(p.get_by_role('heading',name='Estimated gross profit')).to_be_visible()
    expect(p.get_by_text('Fixture · ₹',exact=False).first).to_be_visible()
    p.goto(base+'/admin/products')
    row=p.locator('details').filter(has=p.locator('summary',has_text=name))
    row.locator('summary').click()
    row.get_by_label('Available in catalog').uncheck()
    row.get_by_role('button',name='Save product').click()
    expect(row.locator('summary')).to_contain_text('Archived')
    assert not any(x['id']==entry['id'] for x in p.request.get(base+'/api/catalog').json())
    browser.close()
    print('Admin roles, bootstrap revocation, supplier, product, variant, stock, fulfillment and layouts passed.')
