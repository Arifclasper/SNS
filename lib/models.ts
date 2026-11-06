import mongoose, { type Model } from "mongoose";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "./config";

// Mongoose ships as CommonJS; pulling the values off the default export keeps
// both Next's bundler and plain Node ESM happy.
const { Schema, model, models } = mongoose;

/*
 * Mongoose models for the SNS Collection store.
 *
 * `created_at` / `updated_at` are stored as ISO strings (not Dates) so the
 * storefront, admin pages and the PDF receipt format them consistently.
 *
 * Every model uses an explicit collection name so Mongoose's pluralizer cannot
 * rename collections such as `product_colors` or `stock_moves`.
 */

const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    position: { type: Number, default: 0 },
    is_active: { type: Number, default: 1 },
    created_at: { type: String, required: true },
  },
  { collection: "categories", versionKey: false },
);

const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    sku: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    compare_at_price: { type: Number, default: null },
    category_id: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    image: { type: String, default: null },
    stock: { type: Number, default: 0 },
    low_stock_threshold: { type: Number, default: DEFAULT_LOW_STOCK_THRESHOLD },
    status: { type: String, default: "active" },
    sizes: { type: String, default: null },
    created_at: { type: String, required: true },
    updated_at: { type: String, required: true },
  },
  { collection: "products", versionKey: false },
);

const ProductColorSchema = new Schema(
  {
    product_id: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    image: { type: String, default: null },
    stock: { type: Number, default: 0 },
    position: { type: Number, default: 0 },
    created_at: { type: String, required: true },
  },
  { collection: "product_colors", versionKey: false },
);
ProductColorSchema.index({ product_id: 1, name: 1 }, { unique: true });

const StockMoveSchema = new Schema(
  {
    product_id: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    delta: { type: Number, required: true },
    reason: { type: String, required: true },
    note: { type: String, default: null },
    color: { type: String, default: null },
    order_id: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    created_at: { type: String, required: true, index: true },
  },
  { collection: "stock_moves", versionKey: false },
);

const OrderSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    // Unguessable token used by the public order page and receipt URL. The
    // human-readable `code` is deliberately not a secret.
    public_token: { type: String, default: null },
    customer_name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, default: null },
    note: { type: String, default: null },
    status: { type: String, default: "new" },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, default: 0 },
    total: { type: Number, required: true },
    tracking_id: { type: String, default: null },
    courier: { type: String, default: null },
    created_at: { type: String, required: true, index: true },
  },
  { collection: "orders", versionKey: false },
);
OrderSchema.index(
  { public_token: 1 },
  { unique: true, partialFilterExpression: { public_token: { $type: "string" } } },
);

const OrderItemSchema = new Schema(
  {
    order_id: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    product_id: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    name: { type: String, required: true },
    sku: { type: String, default: null },
    size: { type: String, default: null },
    color: { type: String, default: null },
    color_id: { type: Schema.Types.ObjectId, ref: "ProductColor", default: null },
    unit_price: { type: Number, required: true },
    qty: { type: Number, required: true },
  },
  { collection: "order_items", versionKey: false },
);

const CounterSchema = new Schema(
  {
    _id: { type: String, required: true },
    last_value: { type: Number, required: true, default: 0 },
  },
  { collection: "counters", versionKey: false },
);

const SettingSchema = new Schema(
  {
    _id: { type: String, required: true },
    value: { type: String, required: true },
  },
  { collection: "settings", versionKey: false },
);

const MediaSchema = new Schema(
  {
    public_id: { type: String, required: true, unique: true },
    secure_url: { type: String, required: true },
    url: { type: String, required: true },
    resource_type: { type: String, default: "image" },
    format: { type: String, default: null },
    bytes: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    original_filename: { type: String, default: null },
    created_at: { type: String, required: true },
  },
  { collection: "media", versionKey: false },
);

export const Category: Model<any> =
  (models.Category as Model<any>) || model("Category", CategorySchema);
export const Product: Model<any> =
  (models.Product as Model<any>) || model("Product", ProductSchema);
export const ProductColor: Model<any> =
  (models.ProductColor as Model<any>) || model("ProductColor", ProductColorSchema);
export const StockMove: Model<any> =
  (models.StockMove as Model<any>) || model("StockMove", StockMoveSchema);
export const Order: Model<any> =
  (models.Order as Model<any>) || model("Order", OrderSchema);
export const OrderItem: Model<any> =
  (models.OrderItem as Model<any>) || model("OrderItem", OrderItemSchema);
export const Counter: Model<any> =
  (models.Counter as Model<any>) || model("Counter", CounterSchema);
export const Setting: Model<any> =
  (models.Setting as Model<any>) || model("Setting", SettingSchema);
export const Media: Model<any> =
  (models.Media as Model<any>) || model("Media", MediaSchema);

export const ALL_MODELS = [
  Category,
  Product,
  ProductColor,
  StockMove,
  Order,
  OrderItem,
  Counter,
  Setting,
  Media,
];

/* ------------------------------- helpers ------------------------------- */

export const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export function isObjectId(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_RE.test(value);
}

export function toObjectId(value: string | null | undefined) {
  if (!value || !isObjectId(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function idOf(value: any): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "_id" in value) return String(value._id);
  return String(value);
}

/* ---------------------------- DTO mappers ----------------------------- */

export function categoryDTO(doc: any) {
  if (!doc) return undefined;
  return {
    id: idOf(doc._id)!,
    name: doc.name,
    slug: doc.slug,
    parent_id: idOf(doc.parent_id),
    position: doc.position ?? 0,
    is_active: doc.is_active ?? 1,
    created_at: doc.created_at,
  };
}

export function productDTO(doc: any) {
  if (!doc) return undefined;
  return {
    id: idOf(doc._id)!,
    name: doc.name,
    slug: doc.slug,
    sku: doc.sku,
    description: doc.description ?? "",
    price: doc.price,
    compare_at_price: doc.compare_at_price ?? null,
    category_id: idOf(doc.category_id)!,
    image: doc.image ?? null,
    stock: doc.stock ?? 0,
    low_stock_threshold: doc.low_stock_threshold ?? 5,
    status: doc.status ?? "active",
    sizes: doc.sizes ?? null,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

export function productColorDTO(doc: any) {
  if (!doc) return undefined;
  return {
    id: idOf(doc._id)!,
    product_id: idOf(doc.product_id)!,
    name: doc.name,
    image: doc.image ?? null,
    stock: doc.stock ?? 0,
    position: doc.position ?? 0,
    created_at: doc.created_at,
  };
}

export function stockMoveDTO(doc: any) {
  if (!doc) return undefined;
  return {
    id: idOf(doc._id)!,
    product_id: idOf(doc.product_id)!,
    delta: doc.delta,
    reason: doc.reason,
    note: doc.note ?? null,
    color: doc.color ?? null,
    order_id: idOf(doc.order_id),
    created_at: doc.created_at,
  };
}

export function orderDTO(doc: any) {
  if (!doc) return undefined;
  return {
    id: idOf(doc._id)!,
    code: doc.code,
    public_token: doc.public_token ?? null,
    customer_name: doc.customer_name,
    phone: doc.phone,
    address: doc.address,
    city: doc.city ?? null,
    note: doc.note ?? null,
    status: doc.status ?? "new",
    subtotal: doc.subtotal,
    shipping: doc.shipping,
    total: doc.total,
    tracking_id: doc.tracking_id ?? null,
    courier: doc.courier ?? null,
    created_at: doc.created_at,
  };
}

export function orderItemDTO(doc: any) {
  if (!doc) return undefined;
  return {
    id: idOf(doc._id)!,
    order_id: idOf(doc.order_id)!,
    product_id: idOf(doc.product_id),
    name: doc.name,
    sku: doc.sku ?? null,
    size: doc.size ?? null,
    color: doc.color ?? null,
    color_id: idOf(doc.color_id),
    unit_price: doc.unit_price,
    qty: doc.qty,
  };
}

export function mediaDTO(doc: any) {
  if (!doc) return undefined;
  return {
    id: idOf(doc._id)!,
    public_id: doc.public_id,
    secure_url: doc.secure_url,
    url: doc.url,
    resource_type: doc.resource_type,
    format: doc.format,
    bytes: doc.bytes,
    width: doc.width,
    height: doc.height,
    original_filename: doc.original_filename,
    created_at: doc.created_at,
  };
}
