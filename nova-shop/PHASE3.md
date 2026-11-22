# Phase 3 — Checkout and orders (in progress)

This branch introduces the PostgreSQL Order, OrderItem and PaymentEvent models, a migration, and server-only Razorpay test-mode signing helpers.

## Still required before enabling checkout
- Inspect existing authentication helpers and reuse the current session identity for every order route.
- Implement server-side catalog pricing: never accept prices, totals, or order ownership from browser input.
- Build validated Indian shipping address forms and accessible order summaries.
- Add authenticated order creation, customer order history, and admin-only status transitions.
- Add Razorpay test-mode order creation, signature verification, raw-body webhook verification, idempotent event processing and atomic payment state transitions. Confirm amounts and ownership before marking paid.
- Do not fulfill orders based on the client callback alone. Handle failed and duplicate webhook deliveries.
- Verify the Prisma migration in a real deployment-like PostgreSQL environment; run `npx prisma migrate deploy`, `npm test`, and `npm run build`.
- Do not enable live Razorpay keys or commit credentials. Use `RAZORPAY_KEY_ID` (rzp_test_), `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` via a secret manager.

**Status:** This is an incomplete foundation, not a production-ready checkout. Do not merge until the remaining implementation and tests are completed.
