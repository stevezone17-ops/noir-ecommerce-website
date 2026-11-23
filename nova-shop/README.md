# NOIR — E-commerce storefront

The original NOIR storefront is served at `/` by Next.js. Customer accounts at `/account` use TypeScript, Prisma and PostgreSQL.

## Run locally

From this directory, use Node.js 22 LTS or newer and a PostgreSQL database.
Set `DATABASE_URL` in an ignored local `.env` file or through your deployment secret manager. Give each environment its own database.

```sh
npm ci
npx prisma migrate deploy
npm run dev
```

Open http://localhost:3000. Run `npm run build` and `npm test` to compile and type-check. For deployment, apply the migration and run `npm start` behind HTTPS. Production session cookies require HTTPS.

## Features

- Customer signup, sign-in, profile name editing, and sign-out
- Persistent wishlist with a catalog filter
- Responsive landing page and product catalog
- Category filters, product search, and price sorting
- Shopping bag with quantity controls and subtotal
- Cart persistence using browser localStorage
- Demo newsletter form

## Important

Customer accounts persist in PostgreSQL. Checkout supports Razorpay test payments (see [Phase 3](PHASE3.md)); newsletter opt-ins persist in PostgreSQL. Products, variants and available stock are stored in PostgreSQL. See [Store administration](ADMIN.md) for operator setup and manual fulfillment. Original catalog photos are served locally as WebP images. Wishlist and bag selections stay in the current browser. Razorpay is restricted to test mode.

## Storefront deployment

Serve the Next.js application at the root URL and apply the migrations to its configured PostgreSQL database. Serving only the public directory cannot run the catalog or checkout. Set SITE_URL to the public HTTPS origin for canonical Open Graph images and the sitemap. The Phase 4 migration creates the original eight products once; no runtime seed or production reset is required. Zero-stock products stay visible. Enter verified stock in the admin, and set the collection audience and additional image there. For original single-photo products the second gallery view is a labeled detail crop. The newsletter form records opt-ins in PostgreSQL; mail delivery is outside the storefront.
