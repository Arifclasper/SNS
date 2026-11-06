# SNS Collection

Owner-managed catalogue and storefront for SNS Collection — a small shop selling
ballerina shoes, bags and sweet little extras for girls.

Built with Next.js 15 (App Router), React 19 and Tailwind CSS 4. Product data
lives in a MongoDB Atlas database accessed through Mongoose, and uploaded images
are stored in Cloudinary.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

You need a MongoDB Atlas connection string and Cloudinary credentials before the
app can start serving data. Copy the environment template first if you do not
have `.env.local`:

```bash
cp .env.example .env.local
```

A fresh database is seeded with the demo catalogue on first request (see
[Seeding](#seeding)). Uploaded images go to Cloudinary; nothing is written to the
local filesystem.

Production build locally:

```bash
npm run build
npm start
```

## Environment variables

Create `.env.local` for local development, and set the same keys in your
deployment project settings.

| Variable | Required | Purpose |
| --- | --- | --- |
| `ADMIN_PASSWORD` | Yes | Owner console password. |
| `JWT_SECRET` | Yes | Signs the admin JWT (HS256). Required, 32+ characters. |
| `SESSION_COOKIE_NAME` | No | Admin cookie name. Defaults to `sns_session`. |
| `SESSION_MAX_AGE_SECONDS` | No | Admin session lifetime. Defaults to 43200 (12 hours). |
| `APP_BASE_URL` | Scripts | Base URL used by `scripts/verify-*.mjs`. |
| `PORT` | No | Port for `next dev` / `next start`. Defaults to 3000. |
| `MONGODB_URI` | Yes* | Full MongoDB Atlas connection string. When set it takes precedence over the three credential variables below. |
| `MONGODB_USER` | Yes* | Atlas database username (used when `MONGODB_URI` is empty). |
| `MONGODB_PASSWORD` | Yes* | Atlas database password (used when `MONGODB_URI` is empty). URL-encoding is applied automatically. |
| `MONGODB_HOST` | Yes* | Atlas cluster host, for example `your-cluster.mongodb.net`. |
| `MONGODB_HOSTS` | No | Optional comma-separated `host:port` seed list. Use when a local resolver blocks SRV lookups; takes precedence over `MONGODB_HOST`. |

\* Set either `MONGODB_URI`, or all three of `MONGODB_USER`, `MONGODB_PASSWORD`, `MONGODB_HOST` (optionally with `MONGODB_HOSTS`).
| `MONGODB_DB` | Yes | Database name inside the cluster. Use `SNS_Collection`. |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret. |
| `CLOUDINARY_URL` | Alternative | A single `cloudinary://<api_key>:<api_secret>@<cloud_name>` URL instead of the three keys above. |
| `CLOUDINARY_FOLDER` | No | Folder for uploaded images inside Cloudinary. Defaults to `sns-shoes`. |
| `SEED_DEMO_DATA` | No | Set to `false` to start with an empty database instead of the demo catalogue. |
| `STORE_TIME_ZONE` | No | IANA timezone for order-number days and displayed dates. Defaults to `Asia/Dhaka`. |
| `NEXT_PUBLIC_STORE_NAME` | No | Store name used in metadata, header, footer and receipts. |
| `NEXT_PUBLIC_STORE_SHORT_NAME` | No | Short brand mark (e.g. `SNS`). |
| `NEXT_PUBLIC_STORE_DESCRIPTION` | No | Store description used in metadata and the footer. |
| `NEXT_PUBLIC_STORE_LOGO` | No | Logo path or URL. Defaults to `/logo.jpeg`. |
| `NEXT_PUBLIC_STORE_LANG` | No | `<html lang>` value. Defaults to `en`. |
| `NEXT_PUBLIC_STORE_PHONE` | No | Footer phone link (`tel:`). |
| `NEXT_PUBLIC_STORE_PHONE_DISPLAY` | No | Footer phone text. |
| `NEXT_PUBLIC_CURRENCY_SYMBOL` | No | Currency symbol. Defaults to `৳`. |
| `NEXT_PUBLIC_CURRENCY_CODE` | No | Currency code shown in settings. Defaults to `BDT`. |
| `NEXT_PUBLIC_STORE_NUMBER_LOCALE` | No | Number formatting locale. Defaults to `en-US`. |
| `NEXT_PUBLIC_STORE_DATE_LOCALE` | No | Date formatting locale. Defaults to `en-GB`. |
| `STORE_ISO_LOCALE` | No | Locale used for order-code day keys. Defaults to `en-CA`. |
| `NEXT_PUBLIC_DELIVERY_FEE_DHAKA` | No | Header delivery fee inside Dhaka. Defaults to `80`. |
| `NEXT_PUBLIC_DELIVERY_FEE_OUTSIDE` | No | Header delivery fee outside Dhaka. Defaults to `150`. |
| `DEFAULT_SHIPPING_FEE` | No | Fallback shipping fee when the setting is missing. Defaults to `80`. |
| `DEFAULT_FREE_SHIPPING_THRESHOLD` | No | Fallback free-delivery threshold. Defaults to `3000`. |
| `ORDER_CODE_PREFIX` | No | Prefix for order codes. Defaults to `SNS`. |
| `DEFAULT_LOW_STOCK_THRESHOLD` | No | Default low-stock threshold. Defaults to `5`. |
| `MAX_QTY_PER_LINE` | No | Maximum quantity per cart line. Defaults to `20`. |
| `COURIERS` | No | Comma-separated courier options in the admin order page. |
| `NEXT_PUBLIC_MAX_UPLOAD_BYTES` | No | Maximum upload size in bytes. Defaults to 4194304 (4 MB). |
| `NEXT_PUBLIC_UPLOAD_ACCEPT` | No | Comma-separated MIME types for the file picker. |
| `UPLOAD_ALLOWED_MIME_TYPES` | No | Comma-separated MIME types accepted by the upload API. |
| `STOREFRONT_PAGE_SIZE` | No | Products per storefront page. Defaults to `12`. |
| `CATALOG_PAGE_SIZE` | No | Default catalogue page size. Defaults to `24`. |
| `ADMIN_PRODUCTS_PAGE_SIZE` | No | Products per admin page. Defaults to `20`. |
| `ADMIN_ORDERS_PAGE_SIZE` | No | Orders per admin page. Defaults to `20`. |
| `ADMIN_STOCK_PAGE_SIZE` | No | Stock rows per admin page. Defaults to `25`. |
| `HOMEPAGE_PRODUCT_PICKER_LIMIT` | No | Products loaded in the homepage picker. Defaults to `200`. |
| `RELATED_PRODUCTS_LIMIT` | No | Related products shown on a product page. Defaults to `4`. |
| `NEW_ARRIVALS_LIMIT` | No | New arrivals shown on the homepage. Defaults to `8`. |
| `MONGODB_MAX_POOL_SIZE` | No | Mongo connection pool size. Defaults to `10`. |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | No | Mongo server-selection timeout. Defaults to `10000`. |

## Data storage

The app uses the MongoDB Atlas database named by `MONGODB_DB` (`SNS_Collection`).
These collections are created automatically as needed:

- `categories`
- `products`
- `product_colors`
- `stock_moves`
- `orders`
- `order_items`
- `counters`
- `settings`
- `media`

Uploaded product, colour and hero images are stored in Cloudinary. MongoDB keeps
their URLs and Cloudinary `public_id` values (the `media` collection is the
upload record; products and colours store their image URL directly). There is no
local data folder or database file.

## Seeding

A fresh database is seeded with the demo catalogue and default settings on the
first request, unless `SEED_DEMO_DATA=false` is set. Seeding is claimed
atomically, so concurrent cold starts cannot create the catalogue twice.

With `SEED_DEMO_DATA=false` the app starts empty: create your first category and
product from the owner console. To start over, point the app at an empty
database (or drop the collections) and request the site again.

## Owner console

- Storefront: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

Set `ADMIN_PASSWORD` to your own value in `.env.local`. Production requires a
16+ character password, and the app refuses known placeholders. Set a 32+
character `JWT_SECRET`; there is no fallback secret.

The admin session is a 12-hour JWT signed with `JWT_SECRET` and stored in the
HttpOnly `sns_session` cookie. `middleware.ts` verifies it before `/admin/*`
pages and `/api/admin/*` routes run; the admin layout and server actions verify
it again as defence in depth. Logging out clears the cookie. Because JWTs are
stateless, rotating `JWT_SECRET` invalidates every existing session.

Admin detail pages use MongoDB ObjectId strings in the URL, for example
`/admin/products/<objectid>` and `/admin/orders/<objectid>`. The cart is stored
in the browser under the localStorage key `sns_cart_v2`; cart lines reference
products by ObjectId string.

## Deploy to Vercel

1. **Create the database.** In MongoDB Atlas, create a cluster and a database
   user, then copy the `mongodb+srv://...` connection string. The application
   creates its collections and indexes on demand.

2. **Create a Cloudinary account.** Copy the cloud name, API key and API secret
   (or the single `CLOUDINARY_URL`). Uploads will not work without them.

3. **Push the project to Git.** This folder is not a Git repository yet.

   ```bash
   git init
   git add .
   git commit -m "Prepare SNS Collection for deployment"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

4. **Import the repository on Vercel.** Framework preset: Next.js. Build command
   `npm run build`, output is detected automatically. Set the project's Node.js
   version to **22.x**. `vercel.json` contains only `"framework": "nextjs"`; do
   not add a catch-all rewrite to `index.html` — Next.js is server-rendered and
   has no `index.html`.

5. **Add environment variables** in Vercel → Project → Settings → Environment
   Variables:

   - `ADMIN_PASSWORD` — 16+ characters, unique
   - `JWT_SECRET` — 32+ characters, unique
   - `MONGODB_URI` — the Atlas SRV URI
   - `MONGODB_DB` (`SNS_Collection`)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
     (or `CLOUDINARY_URL`)
   - `SEED_DEMO_DATA=false`
   - `STORE_TIME_ZONE` (`Asia/Dhaka`)
   - the `NEXT_PUBLIC_*` store, currency and delivery values

   `NEXT_PUBLIC_*` values are baked in at build time: set them before the build,
   and redeploy after changing them. Do not set `MONGODB_HOSTS`, `PORT` or
   `APP_BASE_URL` in Vercel. Do not commit real secrets.

   With the Vercel CLI, deploy a preview first with `vercel`, then production
   with `vercel --prod`. `.vercelignore` keeps `.env.local` out of CLI uploads.

6. **Allow Vercel to reach Atlas.** In Atlas → Network Access, add the Vercel
   egress ranges or allow `0.0.0.0/0` (typical for Vercel's dynamic IPs).

7. **Deploy.** No persistent filesystem is required: product data lives in
   Atlas and images live in Cloudinary, so serverless instances can be created
   and discarded freely. If `SEED_DEMO_DATA` is not `false`, an empty database
   receives the demo catalogue and default settings; edit or delete those from
   the owner console.

8. **Smoke-test the deployment.** Visit `/`, `/products`, log in at `/admin`, and
   place a test order through `/checkout`.

### Notes

- Vercel's Hobby plan is intended for non-commercial projects. A real shop should
  use a Pro plan.
- Atlas free tiers are enough to start. Back up the cluster before large changes.
- Keep Atlas Network Access restricted once your deployment addresses are known.
- Cloudinary stores the originals; deleting a product or image in the console
  does not necessarily delete the Cloudinary asset.

## What is included

**Storefront**
- Home, all products, category and subcategory listings, product detail
- Optional product sizes and colours, selected before adding to the cart and
  carried through the order into both receipts
- Cart (localStorage, key `sns_cart_v2`), delivery-details checkout, order
  confirmation
- Automatic PDF receipt download on the confirmation page, with a manual fallback
- Cash-on-delivery flow: orders are placed now and confirmed by phone
- Responsive 2-up mobile grid, 4-up desktop grid, stock status on every product

**Owner console**
- Dashboard with product, stock and order counters
- Categories: two levels, ordering, show/hide, guarded delete
- Products: search, filters, sorting, pagination, create/edit/delete, image
  upload to Cloudinary
- Stock: inline adjustments with reason and note, plus an adjustment log
- Orders: status pipeline (new → confirmed → shipped → delivered), cancellation
  returns items to stock and records the reversal
- Orders: courier and third-party tracking ID, saved to the order and printed on
  the receipt; print and download buttons for the PDF invoice
- Settings: delivery fee and free-delivery threshold

Changing stock anywhere writes a `stock_moves` document, so the on-hand number
and the history always agree. Cancelling an order reverses its stock
automatically.

## Order numbers and receipts

New orders receive a daily sequential code in the form
`SNS-YYMMDD-0001`. The first order on 5 November 2026 is `SNS-261105-0001`, the
second `SNS-261105-0002`. The counter lives in the `counters` collection, resets
at midnight in `STORE_TIME_ZONE`, and is allocated atomically alongside the
order so failed checkouts never burn a number.

Every order also receives an unguessable `public_token`. Customer-facing links
use that token, never the sequential code, so order details cannot be enumerated:

- `/order/<public_token>` shows the confirmation page.
- `/api/orders/<public_token>/receipt` downloads the customer copy.
- `/api/admin/orders/<id>/receipt` is the owner-only receipt endpoint.
- `?inline=1` opens the PDF in the browser, ready to print.
- The PDF embeds `assets/fonts/HindSiliguri-*.ttf` (SIL Open Font License) so the
  `৳` symbol renders correctly. Without those files it falls back to `Tk`.
- The tracking ID is only shown once the owner saves one on the order page.

Run `node scripts/backfill-order-tokens.mjs` once if the database contains
orders created before this change; new orders get a token automatically.

## Homepage hero

The three boxes at the top right of the landing page are owner-controlled from
**Admin → Settings → Homepage hero**:

- **Large offer box** — image URL, badge, title and link, for a campaign or drop.
- **Upcoming product** — pick a catalogue product (image/title/link stay in sync)
  or a custom teaser image.
- **Product carousel** — an ordered list of catalogue products or custom slides.
  Visitors flip through them with the arrows and dots on the storefront.

Stored as JSON in the `settings` collection (`hero_offer`, `hero_upcoming`,
`hero_carousel`). Any empty slot falls back to the newest products, so the hero
never renders blank. Images uploaded here are hosted on Cloudinary.

## Design tokens

All colours, fonts, radii and spacing tokens live in the `@theme` block at the top
of `app/globals.css`. Change those values to re-skin the whole application.

## Verification scripts

These drive the running app over HTTP and inspect the MongoDB database. Start the
dev server first, make sure `MONGODB_URI` and `MONGODB_DB` are set, then run any
of them from the project root:

```bash
node scripts/verify-admin.mjs      # categories, products, stock, delete guards
node scripts/verify-checkout.mjs   # checkout -> order -> stock decrement
node scripts/verify-order.mjs      # order create/cancel via the test endpoint
```

The scripts use the MongoDB driver and are intended for local development only;
they should not be run against a production database. `/api/test-order` is
disabled when `NODE_ENV=production`; it exists only for these checks.
