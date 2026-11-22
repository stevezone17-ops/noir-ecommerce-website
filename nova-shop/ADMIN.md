# Store administration

Apply migrations before deploying the application. Confirm the operator's identity and control of the registered account through a trusted channel, then run `node --env-file=.env scripts/bootstrap-admin.mjs operator@example.com` on a trusted database host. The command invalidates existing sessions. Sign in again and open /admin. Public registration always uses the CUSTOMER database default. Restrict database access to trusted operators.

Migration preserves product IDs 1–8. Enter actual available quantities before opening checkout. Every product starts with a Standard / Original variant, which retains its numeric cart key. Additional variants have separate stock and cart keys. Stock adjustments change available units; checkout reserves units transactionally. Failed payment or cancellation releases reservations. Verified capture consumes a reservation or tries to reacquire released stock. A late capture with insufficient units remains paid on inventory hold until the administrator replenishes stock and advances fulfillment. Review abandoned unpaid orders for outstanding reservations.

Disable “Available in catalog” to archive a product. Upload JPEG, PNG or WebP images up to 800 KB; the server decodes and re-encodes them. A supplier assignment and cost apply to new purchases and are snapshotted with the item. Supplier requests and shipment tracking are recorded manually. No customer details are sent to suppliers.

The overview flags variants with five available units or fewer. Revenue includes shipping on verified non-refunded test orders. Product margin uses recorded purchase-time costs. Historical orders without known supplier costs remain outside the margin estimate.
