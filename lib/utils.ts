import { CURRENCY_SYMBOL, STORE_DATE_LOCALE, STORE_NUMBER_LOCALE } from "./config";

export const CURRENCY = CURRENCY_SYMBOL;

/**
 * The store's business timezone. Order-number days and every date shown to the
 * owner or customer use it, so the app behaves the same on a UTC host (Vercel)
 * as it does on a laptop in Dhaka.
 */
export const STORE_TIME_ZONE = process.env.STORE_TIME_ZONE?.trim() || "Asia/Dhaka";

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function money(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  return (
    CURRENCY +
    rounded.toLocaleString(STORE_NUMBER_LOCALE, {
      minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function discountPercent(price: number, compare: number | null) {
  if (!compare || compare <= price) return null;
  return Math.round((1 - price / compare) * 100);
}

export type StockState = "in" | "low" | "out";

export function stockState(stock: number, threshold: number): StockState {
  if (stock <= 0) return "out";
  if (stock <= threshold) return "low";
  return "in";
}

export function stockLabel(stock: number, threshold: number) {
  const state = stockState(stock, threshold);
  if (state === "out") return "Out of stock";
  if (state === "low") return `Only ${stock} left`;
  return "In stock";
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(STORE_DATE_LOCALE, {
    timeZone: STORE_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(STORE_DATE_LOCALE, {
    timeZone: STORE_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<string, string> = {
  new: "New",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_STYLE: Record<string, string> = {
  new: "bg-warning-soft text-warning",
  confirmed: "bg-brand-soft text-brand-ink",
  shipped: "bg-blue-50 text-blue-700",
  delivered: "bg-success-soft text-success",
  cancelled: "bg-danger-soft text-danger",
};

/* ------------------------------- sizes -------------------------------- */

export const MAX_SIZES = 30;
export const MAX_SIZE_LENGTH = 20;

/**
 * Turns any untrusted value (JSON string, array, single string) into a clean,
 * de-duplicated list of size labels. Order is preserved so the owner controls
 * how sizes appear in the store.
 */
export function normalizeSizes(value: unknown): string[] {
  let source: unknown = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      source = JSON.parse(trimmed);
    } catch {
      source = trimmed.split(",");
    }
  }

  if (!Array.isArray(source)) return [];

  const seen = new Set<string>();
  for (const item of source) {
    const size = String(item ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_SIZE_LENGTH);
    if (size) seen.add(size);
    if (seen.size >= MAX_SIZES) break;
  }
  return [...seen];
}

/** Reads the `sizes` column stored on a product. */
export function parseSizes(value: string | null | undefined): string[] {
  return normalizeSizes(value ?? "");
}

/** Stable cart key so the same product in two sizes or colours stays separate lines. */
export function cartLineKey(
  productId: string,
  size: string | null | undefined,
  colorId?: string | null,
) {
  return `${productId}::${size ?? ""}::${colorId ?? ""}`;
}

/* ------------------------------- colours ------------------------------ */

export const MAX_COLORS = 12;
export const MAX_COLOR_NAME_LENGTH = 40;

/** Trims a colour label to the same shape the storefront and database expect. */
export function cleanColorName(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_COLOR_NAME_LENGTH);
}

/** `rose-gold.jpg` → `Rose Gold`, used when photos are bulk-added. */
export function colorNameFromFilename(filename: string) {
  const base = String(filename ?? "")
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ");
  return cleanColorName(base).replace(/\b\w/g, (character) => character.toUpperCase());
}

/* deterministic pastel duotone, sampled from the watercolor logo */
const GRADIENTS: Array<[string, string]> = [
  ["#f9a8d4", "#c4b5fd"],
  ["#bfdbfe", "#a5b4fc"],
  ["#fbcfe8", "#fda4af"],
  ["#ddd6fe", "#bfdbfe"],
  ["#fecdd3", "#f0abfc"],
  ["#c7d2fe", "#bae6fd"],
  ["#f5d0fe", "#fbcfe8"],
  ["#e9d5ff", "#c7d2fe"],
];

export function gradientFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return GRADIENTS[hash % GRADIENTS.length];
}
