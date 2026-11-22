# NOIR test checkout

Configure the database and customer accounts as described in README.md. Run all checked-in migrations with `npx prisma migrate deploy`. Configure the three server environment variables `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` using test-mode credentials. Only the rzp_test_ public key reaches the browser. In the Razorpay test dashboard, enable automatic payment capture and subscribe the HTTPS endpoint `/api/razorpay/webhook` to payment.captured and payment.failed.

The shopping bag leads to /checkout. Sign in before placing an order. Shipping within India costs ₹99, with free shipping on subtotals above ₹2,999. All catalog prices and order snapshots are calculated on the server in paise. Account → Order history shows the customer's orders. The confirmation page doubles as the order detail view.

A checkout retry with the same account, details, and browser checkout key reuses the gateway order. Payment dismissal leaves an unpaid order available to resume or cancel. An invalid callback cannot confirm an order. A correctly signed callback still requires a gateway lookup showing an exact INR capture. The signed webhook can confirm independently. A late capture takes precedence over local cancellation. Failed attempts are recorded without overwriting a confirmed payment.

For fulfillment, a trusted operator with database access runs `node --env-file=.env scripts/fulfillment.mjs ORDER_ID PROCESSING` and then advances to SHIPPED and DELIVERED in sequence. Use the database ID after the NOIR- prefix. Customer-facing pages cannot advance fulfillment.

## Integration checks

Use an isolated PostgreSQL database. Apply the migrations, run `npm run build` and `npm test`. In a separate test environment set three disposable random fixture credentials (prefix the public ID with rzp_test_). With these variables and DATABASE_URL exported, run:

```sh
node --require ./tests/gateway.cjs node_modules/next/dist/bin/next start -p 3186
```

From another shell with the same fixture variables, run `python tests/checkout.py` using Python Playwright and Chromium (set CHROMIUM_PATH if needed). The test creates disposable accounts and orders. It substitutes both the Razorpay API and hosted checkout widget. An actual Razorpay test transaction and delivery to a publicly reachable webhook require merchant test credentials and a configured dashboard.
