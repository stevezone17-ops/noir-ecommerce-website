# Store administration

Apply migrations before deploying the application. Confirm the operator's identity and control of the registered account through a trusted channel, then run `node --env-file=.env scripts/bootstrap-admin.mjs operator@example.com` on a trusted database host. The command invalidates existing sessions. Sign in again and open /admin. Public registration always uses the CUSTOMER database default. Restrict database access to trusted operators.

Migration preserves product IDs 1–8. Enter actual available quantities before opening checkout. Every product starts with a Standard / Original variant, which retains its numeric cart key. Additional variants have separate stock and cart keys. Stock adjustments change available units; checkout reserves units transactionally. Failed payment or cancellation releases reservations. Verified capture consumes a reservation or tries to reacquire released stock. A late capture with insufficient units remains paid on inventory hold until the administrator replenishes stock and advances fulfillment. Review abandoned unpaid orders for outstanding reservations.

Disable “Available in catalog” to archive a product. Upload JPEG, PNG or WebP images up to 800 KB; the server decodes and re-encodes them. A supplier assignment and cost apply to new purchases and are snapshotted with the item. Supplier requests and shipment tracking are recorded manually. No customer details are sent to suppliers.

The overview flags variants with five available units or fewer. Revenue includes shipping on verified non-refunded test orders. Product margin uses recorded purchase-time costs. Historical orders without known supplier costs remain outside the margin estimate.

## Regression checks

On a disposable migrated database, add at least two test units of the original linen shirt before running the Phase 3 checkout suite. Start the production build with the test gateway as described in PHASE3.md. With the same fixture environment and NOIR_TEST_URL pointing at the local server, run `python tests/checkout.py` and `python tests/admin.py` from nova-shop. The admin test creates its own customer, elevates it using the bootstrap CLI, and creates its own supplier, product and inventory.

## Place a dropship order

1. Under Suppliers, add your supplier's contact details. In Products & stock, assign the supplier and unit cost, then enter the actual available units for each option.
2. Open **Supplier fulfillment** after a verified payment. Check the order for any stock holds or unassigned items.
3. Open the sheet for each supplier. Use your browser's Print menu to save it as a PDF if needed. Place the order through your supplier's agreed channel, using only that supplier's sheet.
4. In Orders, mark each item Requested when the supplier order has been placed. Add tracking when marking an item Dispatched. Customers can see individual package tracking in their order details.
5. Advance the overall order in Orders once the corresponding fulfillment milestones have been reached for all items.

Supplier assignments are saved when the customer places the order. Changing the product's supplier applies to future orders.
