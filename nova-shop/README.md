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

Customer accounts persist in PostgreSQL. Checkout supports Razorpay test payments (see [Phase 3](PHASE3.md)); newsletter signups are not submitted. Products, variants and available stock are stored in PostgreSQL. See [Store administration](ADMIN.md) for operator setup and manual fulfillment. Original product photos and fonts require internet access. Wishlist and bag selections stay in the current browser. Razorpay is restricted to test mode.
