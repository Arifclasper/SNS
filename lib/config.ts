/**
 * Central application configuration.
 *
 * Every value that differs between deployments (store identity, public URLs,
 * currency, locales, delivery defaults, upload limits, session settings and
 * courier list) is read from environment variables here instead of being
 * hard-coded across components and routes.
 *
 * Values prefixed with `NEXT_PUBLIC_` are inlined into the browser bundle by
 * Next.js; the rest are server-only. Defaults keep local development working
 * even when an optional variable is missing, but production should set them
 * explicitly (see `.env.example`).
 */

function text(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value?.trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

function csv(value: string | undefined, fallback: string): string[] {
  return text(value, fallback)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/* ------------------------------- storefront ------------------------------ */

export const STORE_NAME = text(process.env.NEXT_PUBLIC_STORE_NAME, "SNS Collection");
export const STORE_SHORT_NAME = text(process.env.NEXT_PUBLIC_STORE_SHORT_NAME, "SNS");
export const STORE_DESCRIPTION = text(
  process.env.NEXT_PUBLIC_STORE_DESCRIPTION,
  "Ballerina shoes, party flats and sweet little extras for girls — soft steps, made for twirling.",
);
export const STORE_LOGO = text(process.env.NEXT_PUBLIC_STORE_LOGO, "/logo.jpeg");
export const STORE_LANG = text(process.env.NEXT_PUBLIC_STORE_LANG, "en");
export const STORE_PHONE = text(process.env.NEXT_PUBLIC_STORE_PHONE, "+8801700000000");
export const STORE_PHONE_DISPLAY = text(
  process.env.NEXT_PUBLIC_STORE_PHONE_DISPLAY,
  "+880 1700 000000",
);

export const CURRENCY_SYMBOL = text(process.env.NEXT_PUBLIC_CURRENCY_SYMBOL, "৳");
export const CURRENCY_CODE = text(process.env.NEXT_PUBLIC_CURRENCY_CODE, "BDT");
export const STORE_NUMBER_LOCALE = text(process.env.NEXT_PUBLIC_STORE_NUMBER_LOCALE, "en-US");
export const STORE_DATE_LOCALE = text(process.env.NEXT_PUBLIC_STORE_DATE_LOCALE, "en-GB");

export const DELIVERY_FEE_DHAKA = text(process.env.NEXT_PUBLIC_DELIVERY_FEE_DHAKA, "80");
export const DELIVERY_FEE_OUTSIDE = text(process.env.NEXT_PUBLIC_DELIVERY_FEE_OUTSIDE, "150");

/* --------------------------------- uploads -------------------------------- */

export const MAX_UPLOAD_BYTES = positiveInt(
  process.env.NEXT_PUBLIC_MAX_UPLOAD_BYTES,
  4 * 1024 * 1024,
);
export const MAX_UPLOAD_MB = Math.max(1, Math.round(MAX_UPLOAD_BYTES / (1024 * 1024)));
export const UPLOAD_ACCEPT = text(
  process.env.NEXT_PUBLIC_UPLOAD_ACCEPT,
  "image/jpeg,image/png,image/webp,image/gif,image/avif",
);
export const UPLOAD_ALLOWED_MIME_TYPES = csv(
  process.env.UPLOAD_ALLOWED_MIME_TYPES,
  "image/jpeg,image/png,image/webp,image/gif,image/avif",
);

/* ---------------------------------- store --------------------------------- */

export const STORE_ISO_LOCALE = text(process.env.STORE_ISO_LOCALE, "en-CA");
export const ORDER_CODE_PREFIX = text(process.env.ORDER_CODE_PREFIX, "SNS");
export const CURRENCY_ASCII_FALLBACK = text(process.env.CURRENCY_ASCII_FALLBACK, "Tk ");

export const DEFAULT_SHIPPING_FEE = positiveInt(process.env.DEFAULT_SHIPPING_FEE, 80);
export const DEFAULT_FREE_SHIPPING_THRESHOLD = positiveInt(
  process.env.DEFAULT_FREE_SHIPPING_THRESHOLD,
  3000,
);
export const DEFAULT_LOW_STOCK_THRESHOLD = positiveInt(
  process.env.DEFAULT_LOW_STOCK_THRESHOLD,
  5,
);

export const COURIERS = csv(
  process.env.COURIERS,
  "Pathao,Steadfast,RedX,Paperfly,Sundarban,Other",
);

/* --------------------------------- session -------------------------------- */

export const SESSION_COOKIE_NAME = text(process.env.SESSION_COOKIE_NAME, "sns_session");
export const SESSION_MAX_AGE_SECONDS = positiveInt(
  process.env.SESSION_MAX_AGE_SECONDS,
  60 * 60 * 12,
);

/* -------------------------------- database -------------------------------- */

export const MONGODB_DB_NAME = text(process.env.MONGODB_DB, "SNS_Collection");
export const MONGODB_MAX_POOL_SIZE = positiveInt(process.env.MONGODB_MAX_POOL_SIZE, 10);
export const MONGODB_SERVER_SELECTION_TIMEOUT_MS = positiveInt(
  process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
  10000,
);

/* ------------------------------- cloudinary ------------------------------- */

export const CLOUDINARY_FOLDER = text(process.env.CLOUDINARY_FOLDER, "sns-shoes");

/* ------------------------------- list sizes ------------------------------- */

export const STOREFRONT_PAGE_SIZE = positiveInt(process.env.STOREFRONT_PAGE_SIZE, 12);
export const CATALOG_PAGE_SIZE = positiveInt(process.env.CATALOG_PAGE_SIZE, 24);
export const ADMIN_PRODUCTS_PAGE_SIZE = positiveInt(
  process.env.ADMIN_PRODUCTS_PAGE_SIZE,
  20,
);
export const ADMIN_ORDERS_PAGE_SIZE = positiveInt(process.env.ADMIN_ORDERS_PAGE_SIZE, 20);
export const ADMIN_STOCK_PAGE_SIZE = positiveInt(process.env.ADMIN_STOCK_PAGE_SIZE, 25);
export const HOMEPAGE_PRODUCT_PICKER_LIMIT = positiveInt(
  process.env.HOMEPAGE_PRODUCT_PICKER_LIMIT,
  200,
);
export const RELATED_PRODUCTS_LIMIT = positiveInt(process.env.RELATED_PRODUCTS_LIMIT, 4);
export const NEW_ARRIVALS_LIMIT = positiveInt(process.env.NEW_ARRIVALS_LIMIT, 8);
export const MAX_QTY_PER_LINE = positiveInt(process.env.MAX_QTY_PER_LINE, 20);
