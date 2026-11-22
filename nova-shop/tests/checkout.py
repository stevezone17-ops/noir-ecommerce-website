"""Run against the local production build with tests/gateway.cjs preloaded."""
import hashlib
import hmac
import json
import os
import secrets
from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get('NOIR_TEST_URL','http://localhost:3186')
gateway_secret = os.environ['RAZORPAY_KEY_SECRET'].encode()
webhook_secret = os.environ['RAZORPAY_WEBHOOK_SECRET'].encode()

def sign(secret, data):
    return hmac.new(secret, data.encode(), hashlib.sha256).hexdigest()

def signup(page):
    page.goto(BASE + '/account')
    form = page.locator('section').filter(has=page.get_by_role('heading', name='Create an account'))
    form.get_by_label('Name', exact=True).fill('Checkout Tester')
    form.get_by_label('Email').fill(secrets.token_hex(10) + '@example.test')
    form.get_by_label('Password').fill(secrets.token_urlsafe(20))
    form.get_by_role('button').click()
    expect(page.get_by_role('heading', name='Profile')).to_be_visible()

def event(page, gateway, event_type, event_id, amount=199800, valid=True):
    status = event_type.split('.')[1]
    payload = json.dumps(dict(event=event_type, payload=dict(payment=dict(entity=dict(
        id=gateway.replace('order_', 'pay_'), order_id=gateway, amount=amount, currency='INR',
        status=status, captured=status == 'captured')))))
    return page.request.post(BASE + '/api/razorpay/webhook', data=payload, headers={
        'x-razorpay-event-id':event_id, 'x-razorpay-signature':sign(webhook_secret,payload) if valid else ''}).status

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
    p = browser.new_page()
    p.route('https://**/*',lambda route:route.fulfill(body='',status=200))
    p.route('https://checkout.razorpay.com/**',lambda route:route.fulfill(content_type='application/javascript',
        body='window.Razorpay=class {constructor(o){window.gateway=o} open(){}}'))
    p.goto(BASE+'/checkout')
    expect(p).to_have_url(BASE+'/account')
    signup(p)
    p.goto(BASE)
    p.click('[data-add="1"]')
    p.click('#checkout')
    expect(p.get_by_role('heading',name='Checkout')).to_be_visible()
    for width in (320,768,1440):
        p.set_viewport_size({'width':width,'height':900})
        assert p.evaluate('document.documentElement.scrollWidth === innerWidth')
        expect(p.get_by_role('heading',name='Order summary')).to_be_visible()
    p.get_by_label('Indian mobile number').fill('9876543210')
    p.get_by_label('Street address').fill('12 Market Road')
    p.get_by_label('City',exact=True).fill('Mumbai')
    p.get_by_label('State or union territory').fill('Maharashtra')
    p.get_by_label('PIN code').fill('400001')
    pay_button = p.get_by_role('button', name='Pay ₹1,998 in test mode')
    pay_button.click()
    p.wait_for_function('window.gateway?.order_id')
    gateway = p.evaluate('window.gateway.order_id')
    p.evaluate('window.gateway.modal.ondismiss()')
    expect(p.get_by_text('Pending · Unpaid')).to_be_visible()
    details = p.url
    # Retry the same bag, address and customer.
    p.goto(BASE+'/checkout')
    for name,value in [('Indian mobile number','9876543210'),('Street address','12 Market Road'),('City','Mumbai'),
                       ('State or union territory','Maharashtra'),('PIN code','400001')]:
        p.get_by_label(name,exact=True).fill(value)
    pay_button.click()
    p.wait_for_function('window.gateway?.order_id')
    assert p.evaluate('window.gateway.order_id') == gateway
    payment_id = gateway.replace('order_', 'pay_')
    p.evaluate("id=>window.gateway.handler({razorpay_payment_id:id,razorpay_signature:'invalid'})",payment_id)
    expect(p.get_by_text('Pending · Unpaid')).to_be_visible()
    assert event(p,gateway,'payment.captured',secrets.token_hex(8),valid=False)==401
    assert event(p,gateway,'payment.failed',secrets.token_hex(8))==204
    p.reload()
    expect(p.get_by_text('Pending · Payment failed')).to_be_visible()
    p.get_by_role('button',name='Resume test payment').click()
    p.wait_for_function('window.gateway?.order_id')
    signature = sign(gateway_secret,gateway+'|'+payment_id)
    p.evaluate('r=>window.gateway.handler(r)',{'razorpay_payment_id':payment_id,'razorpay_signature':signature})
    expect(p.get_by_role('heading',name='Order confirmed')).to_be_visible()
    eid = secrets.token_hex(12)
    assert event(p,gateway,'payment.captured',eid)==204
    assert event(p,gateway,'payment.captured',eid)==204
    p.goto(BASE+'/orders')
    expect(p.locator('section')).to_have_count(1)
    expect(p.get_by_text('Confirmed',exact=False)).to_be_visible()
    other = browser.new_page()
    signup(other)
    assert other.goto(details).status == 404
    other.goto(BASE+'/orders')
    expect(other.get_by_text('You haven’t placed an order yet.')).to_be_visible()
    p.goto(BASE)
    p.click('[data-add="1"]')
    p.click('#checkout')
    for name,value in [('Indian mobile number','9876543210'),('Street address','12 Market Road'),('City','Mumbai'),
                       ('State or union territory','Maharashtra'),('PIN code','400001')]:
        p.get_by_label(name,exact=True).fill(value)
    pay_button.click()
    p.wait_for_function('window.gateway?.order_id')
    second = p.evaluate('window.gateway.order_id')
    assert second != gateway
    p.evaluate('window.gateway.modal.ondismiss()')
    expect(p.get_by_text('Pending · Unpaid')).to_be_visible()
    p.get_by_role('button',name='Cancel unpaid order').click()
    expect(p.get_by_text('Cancelled · Unpaid')).to_be_visible()
    # A late verified capture still needs reconciliation after checkout dismissal/cancellation.
    assert event(p,second,'payment.captured',secrets.token_hex(8),amount=1) != 204
    p.reload()
    expect(p.get_by_text('Cancelled · Unpaid')).to_be_visible()
    assert event(p,second,'payment.captured',secrets.token_hex(8))==204
    p.reload()
    expect(p.get_by_text('Confirmed · Paid')).to_be_visible()
    browser.close()
    print('Checkout, layout, retry, callback verification, failed payment, webhook replay and ownership passed.')
