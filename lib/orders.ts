import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { ready, withTransaction } from "./mongoose";
import {
  Counter,
  Order,
  OrderItem,
  Product,
  ProductColor,
  StockMove,
  isObjectId,
  productColorDTO,
  productDTO,
  toObjectId,
} from "./models";
import { getSettings } from "./queries";
import { buildOrderCode, storeDayKey } from "./order-code";
import { parseSizes } from "./utils";
import type { Product as ProductRow, ProductColor as ProductColorRow } from "./types";
import {
  DEFAULT_FREE_SHIPPING_THRESHOLD,
  DEFAULT_SHIPPING_FEE,
  MAX_QTY_PER_LINE,
} from "./config";

export type NewOrderInput = {
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  note: string;
  items: { productId: string; qty: number; size?: string | null; colorId?: string | null }[];
};

export type OrderResult =
  | { ok: true; code: string; token: string; total: number; orderId: string }
  | { ok: false; error: string };

function isDuplicateKeyError(error: unknown): boolean {
  const candidate = error as { code?: number; cause?: { code?: number } } | null;
  return candidate?.code === 11000 || candidate?.cause?.code === 11000;
}

type OrderLine = {
  productId: string;
  qty: number;
  size: string | null;
  colorId: string | null;
  color: string | null;
};

/**
 * Creates an order, decrements stock and writes a stock movement per product,
 * all inside a single transaction.
 *
 * The order code is allocated inside that transaction too, so the daily
 * counter and the order always move together: a failed insert rolls the
 * counter back and the number is reused.
 */
export async function createOrder(input: NewOrderInput): Promise<OrderResult> {
  // The checkout action can be the first thing a cold serverless instance
  // handles, so open the connection before the first query. `withTransaction`
  // also calls ready(), but that is too late for the product lookups below.
  await ready();

  const merged = new Map<string, OrderLine>();
  for (const item of input.items) {
    if (!isObjectId(item.productId)) continue;
    const productId = String(item.productId);
    const qty = Math.max(1, Math.min(MAX_QTY_PER_LINE, Math.trunc(Number(item.qty) || 1)));
    const size = item.size ? String(item.size).replace(/\s+/g, " ").trim().slice(0, 40) : null;
    const colorId = isObjectId(item.colorId) ? String(item.colorId) : null;
    const key = `${productId}::${size ?? ""}::${colorId ?? ""}`;
    const existing = merged.get(key);
    if (existing) existing.qty += qty;
    else merged.set(key, { productId, qty, size: size || null, colorId, color: null });
  }

  if (merged.size === 0) return { ok: false, error: "Your cart is empty." };

  const lines = [...merged.values()];
  const ids = [...new Set(lines.map((line) => line.productId))];

  // Load every product and its colours once, then validate availability up
  // front so the common failures come back as readable messages.
  const products = new Map<string, ProductRow>();
  const colorsByProduct = new Map<string, ProductColorRow[]>();

  const productRows = await Product.find({ _id: { $in: ids } }).lean();
  for (const row of productRows) {
    const dto = productDTO(row);
    if (dto) products.set(dto.id, dto as ProductRow);
  }

  const colorRows = await ProductColor.find({ product_id: { $in: ids } })
    .sort({ position: 1, _id: 1 })
    .lean();
  for (const row of colorRows) {
    const dto = productColorDTO(row);
    if (!dto) continue;
    const list = colorsByProduct.get(dto.product_id);
    if (list) list.push(dto as ProductColorRow);
    else colorsByProduct.set(dto.product_id, [dto as ProductColorRow]);
  }

  for (const line of lines) {
    const product = products.get(line.productId);
    if (!product || product.status !== "active") {
      return { ok: false, error: "One of the items is no longer available. Please review your cart." };
    }
  }

  // A product that defines sizes must be ordered with one of them, and a
  // product that defines colours must be ordered with one of those too.
  for (const line of lines) {
    const product = products.get(line.productId)!;
    const allowedSizes = parseSizes(product.sizes);
    if (allowedSizes.length === 0) {
      line.size = null;
    } else {
      if (!line.size) {
        return { ok: false, error: `Choose a size for “${product.name}”.` };
      }
      if (!allowedSizes.includes(line.size)) {
        return { ok: false, error: `That size is not available for “${product.name}”.` };
      }
    }

    const colors = colorsByProduct.get(line.productId) ?? [];
    if (colors.length === 0) {
      line.colorId = null;
      line.color = null;
      continue;
    }
    if (!line.colorId) {
      return { ok: false, error: `Choose a colour for “${product.name}”.` };
    }
    const color = colors.find((entry) => entry.id === line.colorId);
    if (!color) {
      return { ok: false, error: `That colour is not available for “${product.name}”.` };
    }
    line.color = color.name;
  }

  const stockNeeded = new Map<string, number>();
  const colorNeeded = new Map<string, { productId: string; name: string; qty: number }>();

  for (const line of lines) {
    stockNeeded.set(line.productId, (stockNeeded.get(line.productId) ?? 0) + line.qty);
    if (line.colorId && line.color) {
      const existing = colorNeeded.get(line.colorId);
      if (existing) existing.qty += line.qty;
      else colorNeeded.set(line.colorId, {
        productId: line.productId,
        name: line.color,
        qty: line.qty,
      });
    }
  }

  for (const [productId, qty] of stockNeeded) {
    const product = products.get(productId)!;
    if (product.stock < qty) {
      return {
        ok: false,
        error: `Only ${product.stock} of “${product.name}” left in stock. Please adjust your cart.`,
      };
    }
  }

  for (const [colorId, need] of colorNeeded) {
    const product = products.get(need.productId)!;
    const color = (colorsByProduct.get(need.productId) ?? []).find(
      (entry) => entry.id === colorId,
    );
    if (!color || color.stock < need.qty) {
      return {
        ok: false,
        error: `Only ${color?.stock ?? 0} of “${product.name}” in ${need.name} left. Please adjust your cart.`,
      };
    }
  }

  const settings = await getSettings();
  const shippingFee = Number(settings.shipping_fee ?? DEFAULT_SHIPPING_FEE);
  const freeThreshold = Number(
    settings.free_shipping_threshold ?? DEFAULT_FREE_SHIPPING_THRESHOLD,
  );

  let subtotal = 0;
  for (const line of lines) {
    subtotal += products.get(line.productId)!.price * line.qty;
  }
  const shipping = subtotal >= freeThreshold ? 0 : shippingFee;
  const total = subtotal + shipping;

  const now = new Date();
  const createdAt = now.toISOString();
  let publicToken = randomBytes(16).toString("base64url");

  try {
    let created: { code: string; orderId: mongoose.Types.ObjectId } | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        created = await withTransaction(async (session) => {
      // 1. Allocate the next number for today (store timezone).
      const day = storeDayKey(now);
      const counter = await Counter.findOneAndUpdate(
        { _id: `order-day:${day}` },
        { $inc: { last_value: 1 } },
        { upsert: true, returnDocument: "after", session },
      ).lean();
      const sequence = Number(counter?.last_value ?? 1) || 1;
      const code = buildOrderCode(now, sequence);

      // 2. Write the order.
      const orderId = new mongoose.Types.ObjectId();
      await Order.create(
        [
          {
            _id: orderId,
            code,
            public_token: publicToken,
            customer_name: input.customer_name,
            phone: input.phone,
            address: input.address,
            city: input.city,
            note: input.note || null,
            status: "new",
            subtotal,
            shipping,
            total,
            created_at: createdAt,
          },
        ],
        { session },
      );

      // 3. One row per product + size + colour, keeping the exact variant ordered.
      await OrderItem.insertMany(
        lines.map((line) => {
          const product = products.get(line.productId)!;
          return {
            order_id: orderId,
            product_id: toObjectId(line.productId),
            name: product.name,
            sku: product.sku,
            size: line.size,
            color: line.color,
            color_id: toObjectId(line.colorId),
            unit_price: product.price,
            qty: line.qty,
          };
        }),
        { session },
      );

      // 4. Decrement the exact colour quantities first, guarded so two
      //    simultaneous checkouts cannot oversell a colour.
      for (const [colorId, need] of colorNeeded) {
        const product = products.get(need.productId)!;
        const res = await ProductColor.updateOne(
          {
            _id: toObjectId(colorId),
            product_id: toObjectId(need.productId),
            stock: { $gte: need.qty },
          },
          { $inc: { stock: -need.qty } },
          { session },
        );
        if (res.matchedCount === 0) {
          throw new Error(`OUT_OF_STOCK:${product.name}`);
        }
        await StockMove.create(
          [
            {
              product_id: toObjectId(need.productId),
              delta: -need.qty,
              reason: "sold",
              note: `Order ${code}`,
              color: need.name,
              order_id: orderId,
              created_at: createdAt,
            },
          ],
          { session },
        );
      }

      // 5. Decrement the product total. Products without colours also get a
      //    stock-move row here; coloured products already wrote one per colour.
      for (const [productId, qty] of stockNeeded) {
        const product = products.get(productId)!;
        const res = await Product.updateOne(
          { _id: toObjectId(productId), stock: { $gte: qty } },
          { $inc: { stock: -qty }, $set: { updated_at: createdAt } },
          { session },
        );
        if (res.matchedCount === 0) {
          throw new Error(`OUT_OF_STOCK:${product.name}`);
        }
        if ((colorsByProduct.get(productId)?.length ?? 0) === 0) {
          await StockMove.create(
            [
              {
                product_id: toObjectId(productId),
                delta: -qty,
                reason: "sold",
                note: `Order ${code}`,
                color: null,
                order_id: orderId,
                created_at: createdAt,
              },
            ],
            { session },
          );
        }
      }

          return { code, orderId };
        });

        break;
      } catch (error) {
        if (!isDuplicateKeyError(error) || attempt === 4) throw error;

        // Regenerate the token in case the duplicate was caused by an
        // astronomically unlikely token collision.
        publicToken = randomBytes(16).toString("base64url");

        // The failed transaction rolled the counter back, so the next attempt
        // would build the same code. Nudge the counter forward outside the
        // transaction and try again.
        await Counter.updateOne(
          { _id: `order-day:${storeDayKey(now)}` },
          { $inc: { last_value: 1 } },
          { upsert: true },
        );
      }
    }

    if (!created) throw new Error("Could not allocate an order code.");

    return {
      ok: true,
      code: created.code,
      token: publicToken,
      total,
      orderId: String(created.orderId),
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("OUT_OF_STOCK:")) {
      const name = error.message.slice("OUT_OF_STOCK:".length);
      return {
        ok: false,
        error: `“${name}” just went out of stock. Please adjust your cart.`,
      };
    }
    return { ok: false, error: "We could not place the order. Please try again." };
  }
}

/**
 * Moves an order between statuses. Cancelling returns every item to stock
 * and records the reversal in the stock history.
 */
export async function setOrderStatus(
  id: string,
  status: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const allowed = ["new", "confirmed", "shipped", "delivered", "cancelled"];
  if (!isObjectId(id) || !allowed.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  await ready();

  const order = await Order.findOne({ _id: id }).lean();
  if (!order) return { ok: false, error: "Order not found." };

  const now = new Date().toISOString();

  if (order.status !== "cancelled" && status === "cancelled") {
    try {
      await withTransaction(async (session) => {
        const items = await OrderItem.find({ order_id: id }).lean();
        for (const item of items) {
          if (!item.product_id) continue;

          // Put the quantity back on the exact colour when that colour still
          // exists; the product total is always restored as well.
          if (item.color_id) {
            await ProductColor.updateOne(
              { _id: item.color_id, product_id: item.product_id },
              { $inc: { stock: item.qty } },
              { session },
            );
          }

          await Product.updateOne(
            { _id: item.product_id },
            { $inc: { stock: item.qty }, $set: { updated_at: now } },
            { session },
          );
          await StockMove.create(
            [
              {
                product_id: item.product_id,
                delta: item.qty,
                reason: "return",
                note: `Cancelled ${order.code}`,
                color: item.color ?? null,
                order_id: order._id,
                created_at: now,
              },
            ],
            { session },
          );
        }
        await Order.updateOne({ _id: order._id }, { $set: { status } }, { session });
      });
    } catch {
      return { ok: false, error: "Could not cancel the order." };
    }
    return { ok: true };
  }

  await Order.updateOne({ _id: id }, { $set: { status } });
  return { ok: true };
}
