"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import mongoose, { type ClientSession, type Model } from "mongoose";

const { Types } = mongoose;
import {
  Category,
  Media,
  Order,
  Product,
  ProductColor,
  Setting,
  StockMove,
  categoryDTO,
  isObjectId,
  orderDTO,
  productColorDTO,
  productDTO,
  toObjectId,
} from "@/lib/models";
import { ready, withTransaction } from "@/lib/mongoose";
import { destroyImage, publicIdFromUrl } from "@/lib/cloudinary";
import { isAuthed, signIn, signOut } from "@/lib/auth";
import { setOrderStatus } from "@/lib/orders";
import { parseHeroSettings } from "@/lib/hero";
import {
  cleanColorName,
  MAX_COLORS,
  normalizeSizes,
  slugify,
} from "@/lib/utils";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/config";

export type AdminState = { error?: string; ok?: string; fields?: Record<string, string> };

async function requireAdmin() {
  if (!(await isAuthed())) redirect("/admin/login");
}

/** Reads an ObjectId string from a form field, treating bad values as absent. */
function idFrom(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  return isObjectId(raw) ? raw : null;
}

/** Best-effort removal of a Cloudinary asset plus its media row. */
async function purgeImage(
  url: string | null | undefined,
  session?: ClientSession | null,
): Promise<void> {
  if (!url) return;
  await destroyImage(publicIdFromUrl(url));
  await Media.deleteMany({ secure_url: url }, session ? { session } : {});
}

async function uniqueSlug(
  model: Model<any>,
  base: string,
  excludeId?: string | null,
): Promise<string> {
  const root = slugify(base) || "item";
  let candidate = root;
  let n = 2;
  while (true) {
    const row = await model
      .findOne({
        slug: candidate,
        ...(excludeId ? { _id: { $ne: toObjectId(excludeId) } } : {}),
      })
      .lean();
    if (!row) return candidate;
    candidate = `${root}-${n++}`;
  }
}

/* ------------------------------- auth ------------------------------- */

export async function loginAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Enter the owner password." };

  try {
    if (!(await signIn(password))) return { error: "That password is not correct." };
  } catch (error) {
    // A missing/weak ADMIN_PASSWORD or JWT_SECRET should surface as a clear
    // server error instead of an unhandled 500 on the login form.
    console.error("Admin sign-in is unavailable", error);
    return {
      error:
        "Sign-in is temporarily unavailable. Check the ADMIN_PASSWORD and JWT_SECRET environment variables.",
    };
  }

  redirect("/admin");
}

export async function logoutAction() {
  await signOut();
  redirect("/admin/login");
}

/* ----------------------------- categories ---------------------------- */

export async function saveCategory(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdmin();
  await ready();

  const id = idFrom(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const parentId = idFrom(formData.get("parent_id"));

  if (name.length < 2) return { error: "Give the category a name (at least 2 characters)." };

  if (parentId) {
    const parent = categoryDTO(
      await Category.findOne({ _id: toObjectId(parentId) }).lean(),
    );
    if (!parent) return { error: "That parent category no longer exists." };
    if (parent.parent_id !== null)
      return { error: "Categories can only be two levels deep." };
    if (id && parentId === id) return { error: "A category cannot be its own parent." };
    if (id) {
      const kids = await Category.countDocuments({ parent_id: toObjectId(id) });
      if (kids > 0)
        return {
          error: "This category has subcategories, so it has to stay at the top level.",
        };
    }
  }

  const slug = await uniqueSlug(Category, name, id);
  const now = new Date().toISOString();

  try {
    if (id) {
      await Category.updateOne(
        { _id: toObjectId(id) },
        {
          $set: {
            name,
            slug,
            parent_id: toObjectId(parentId),
          },
        },
      );
    } else {
      const last = await Category.findOne({ parent_id: toObjectId(parentId) })
        .sort({ position: -1 })
        .lean();
      const position = (Number(last?.position) || 0) + 1;
      await Category.create({
        name,
        slug,
        parent_id: toObjectId(parentId),
        position,
        is_active: 1,
        created_at: now,
      });
    }
  } catch {
    return { error: "Could not save the category. Try a different name." };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  redirect("/admin/categories?saved=1");
}

export async function deleteCategory(formData: FormData) {
  await requireAdmin();
  await ready();
  const id = idFrom(formData.get("id"));
  if (!id) redirect("/admin/categories");

  const children = await Category.countDocuments({ parent_id: toObjectId(id) });
  const products = await Product.countDocuments({ category_id: toObjectId(id) });

  if (children > 0)
    redirect(`/admin/categories?error=${encodeURIComponent("Move or delete the subcategories first.")}`);
  if (products > 0)
    redirect(
      `/admin/categories?error=${encodeURIComponent(
        `This category still has ${products} product${products === 1 ? "" : "s"}. Move them first.`,
      )}`,
    );

  await Category.deleteOne({ _id: toObjectId(id) });
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  redirect("/admin/categories?deleted=1");
}

export async function moveCategory(formData: FormData) {
  await requireAdmin();
  await ready();
  const id = idFrom(formData.get("id"));
  const direction = String(formData.get("direction"));
  if (!id) redirect("/admin/categories");

  const current = categoryDTO(
    await Category.findOne({ _id: toObjectId(id) }).lean(),
  );
  if (!current) redirect("/admin/categories");

  const siblings = (
    await Category.find({ parent_id: toObjectId(current.parent_id) })
      .sort({ position: 1, _id: 1 })
      .lean() as unknown[]
  ).map((doc) => categoryDTO(doc) as NonNullable<ReturnType<typeof categoryDTO>>);

  const index = siblings.findIndex((sibling) => sibling.id === id);
  const swapWith = direction === "up" ? siblings[index - 1] : siblings[index + 1];
  if (index === -1 || !swapWith) redirect("/admin/categories");

  await Category.updateOne(
    { _id: toObjectId(id) },
    { $set: { position: swapWith.position } },
  );
  await Category.updateOne(
    { _id: toObjectId(swapWith.id) },
    { $set: { position: current.position } },
  );

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  redirect("/admin/categories");
}

export async function toggleCategory(formData: FormData) {
  await requireAdmin();
  await ready();
  const id = idFrom(formData.get("id"));
  const next = Number(formData.get("next")) === 1 ? 1 : 0;
  if (!id) redirect("/admin/categories");
  await Category.updateOne({ _id: toObjectId(id) }, { $set: { is_active: next } });
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  redirect("/admin/categories");
}

/* ------------------------------ products ----------------------------- */

type ColorInput = { id: string | null; name: string; image: string | null; stock: number };

export async function saveProduct(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdmin();

  const id = idFrom(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim().toUpperCase();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price"));
  const compareRaw = String(formData.get("compare_at_price") ?? "").trim();
  const compareAt = compareRaw ? Number(compareRaw) : null;
  const categoryId = idFrom(formData.get("category_id"));
  const stock = Math.max(0, Math.trunc(Number(formData.get("stock") || 0)));
  const threshold = Math.max(
    0,
    Math.trunc(
      Number(formData.get("low_stock_threshold") || DEFAULT_LOW_STOCK_THRESHOLD),
    ),
  );
  const status = String(formData.get("status") ?? "active");
  const sizes = normalizeSizes(String(formData.get("sizes") ?? ""));
  const sizesValue = sizes.length ? JSON.stringify(sizes) : null;

  const colors: ColorInput[] = [];
  try {
    const parsed: unknown = JSON.parse(String(formData.get("colors") ?? "[]"));
    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        const raw = entry as { id?: unknown; name?: unknown; image?: unknown; stock?: unknown };
        const colorName = cleanColorName(raw?.name);
        if (!colorName) continue;
        colors.push({
          id: idFrom(raw?.id),
          name: colorName,
          image: String(raw?.image ?? "").trim().slice(0, 500) || null,
          stock: Math.max(0, Math.min(999999, Math.trunc(Number(raw?.stock) || 0))),
        });
      }
    }
  } catch {
    return { error: "The colour list could not be read. Please re-enter the colours." };
  }

  if (colors.length > MAX_COLORS) {
    return { error: `A product can have at most ${MAX_COLORS} colours.` };
  }

  const seenColorNames = new Set<string>();
  for (const color of colors) {
    const key = color.name.toLowerCase();
    if (seenColorNames.has(key)) {
      return {
        error: "Colour names must be unique.",
        fields: { colors: `“${color.name}” is listed more than once.` },
      };
    }
    seenColorNames.add(key);
  }

  const colorStockTotal = colors.reduce((sum, color) => sum + color.stock, 0);
  const effectiveStock = colors.length ? colorStockTotal : stock;

  // When colours are used, the first colour photo can act as the storefront
  // cover if the owner did not pick a separate main picture.
  const coverImage =
    String(formData.get("image") ?? "").trim() || colors.find((color) => color.image)?.image || null;

  const fields: Record<string, string> = {};
  if (name.length < 2) fields.name = "Enter a product name.";
  if (sku.length < 2) fields.sku = "Enter a SKU, e.g. SNS-W-101.";
  if (!Number.isFinite(price) || price <= 0) fields.price = "Price must be greater than zero.";
  if (compareRaw && !Number.isFinite(compareAt)) fields.compare_at_price = "Enter a valid number.";
  if (!categoryId) fields.category_id = "Choose a category.";

  if (Object.keys(fields).length) return { error: "Check the highlighted fields.", fields };

  await ready();

  const category = categoryDTO(
    await Category.findOne({ _id: toObjectId(categoryId) }).lean(),
  );
  if (!category) return { error: "That category no longer exists." };

  const skuTaken = await Product.findOne({
    sku,
    ...(id ? { _id: { $ne: toObjectId(id) } } : {}),
  }).lean();
  if (skuTaken) {
    return {
      fields: { sku: "That SKU is already used by another product." },
      error: "SKU must be unique.",
    };
  }

  const slug = await uniqueSlug(Product, name, id);

  // Cloudinary deletions cannot be rolled back with the Mongo transaction, so
  // collect the old URLs and remove them only after the transaction commits.
  const purgeUrls: string[] = [];

  try {
    await withTransaction(async (session) => {
      const now = new Date().toISOString();
      const productOid = id ? new Types.ObjectId(id) : new Types.ObjectId();

      const existingProduct = id
        ? productDTO(await Product.findOne({ _id: productOid }).session(session).lean())
        : undefined;

      if (
        existingProduct?.image &&
        existingProduct.image !== coverImage
      ) {
        purgeUrls.push(existingProduct.image);
      }

      if (id) {
        await Product.updateOne(
          { _id: productOid },
          {
            $set: {
              name,
              slug,
              sku,
              description,
              price,
              compare_at_price: compareAt,
              category_id: toObjectId(categoryId),
              image: coverImage,
              sizes: sizesValue,
              stock: effectiveStock,
              low_stock_threshold: threshold,
              status,
              updated_at: now,
            },
          },
          { session },
        );
        if (
          colors.length === 0 &&
          existingProduct &&
          existingProduct.stock !== effectiveStock
        ) {
          await StockMove.create(
            [
              {
                product_id: productOid,
                delta: effectiveStock - existingProduct.stock,
                reason: "correction",
                note: "Edited on product form",
                color: null,
                order_id: null,
                created_at: now,
              },
            ],
            { session },
          );
        }
      } else {
        await Product.create(
          [
            {
              _id: productOid,
              name,
              slug,
              sku,
              description,
              price,
              compare_at_price: compareAt,
              category_id: toObjectId(categoryId),
              image: coverImage,
              sizes: sizesValue,
              stock: effectiveStock,
              low_stock_threshold: threshold,
              status,
              created_at: now,
              updated_at: now,
            },
          ],
          { session },
        );
        if (colors.length === 0 && effectiveStock > 0) {
          await StockMove.create(
            [
              {
                product_id: productOid,
                delta: effectiveStock,
                reason: "received",
                note: "Initial stock",
                color: null,
                order_id: null,
                created_at: now,
              },
            ],
            { session },
          );
        }
      }

      // Reconcile the colour rows: remove missing ones first so renaming a
      // colour to the name of a removed one cannot hit the unique index.
      const existingColors = (
        await ProductColor.find({ product_id: productOid })
          .session(session)
          .lean() as unknown[]
      ).map(
        (doc) => productColorDTO(doc) as NonNullable<ReturnType<typeof productColorDTO>>,
      );

      const submittedIds = new Set(
        colors
          .map((color) => color.id)
          .filter((colorId): colorId is string => Boolean(colorId)),
      );

      for (const existing of existingColors) {
        if (!submittedIds.has(existing.id)) {
          if (existing.image) purgeUrls.push(existing.image);
          await ProductColor.deleteOne(
            { _id: toObjectId(existing.id), product_id: productOid },
            { session },
          );
        }
      }

      const existingById = new Map(existingColors.map((color) => [color.id, color]));

      for (let index = 0; index < colors.length; index++) {
        const color = colors[index];
        const match = color.id ? existingById.get(color.id) : undefined;

        if (match) {
          if (match.image && match.image !== color.image) {
            purgeUrls.push(match.image);
          }
          await ProductColor.updateOne(
            { _id: toObjectId(match.id), product_id: productOid },
            {
              $set: {
                name: color.name,
                image: color.image,
                stock: color.stock,
                position: index,
              },
            },
            { session },
          );
          if (match.stock !== color.stock) {
            await StockMove.create(
              [
                {
                  product_id: productOid,
                  delta: color.stock - match.stock,
                  reason: "correction",
                  note: "Edited on product form",
                  color: color.name,
                  order_id: null,
                  created_at: now,
                },
              ],
              { session },
            );
          }
        } else {
          await ProductColor.create(
            [
              {
                product_id: productOid,
                name: color.name,
                image: color.image,
                stock: color.stock,
                position: index,
                created_at: now,
              },
            ],
            { session },
          );
          if (color.stock > 0) {
            await StockMove.create(
              [
                {
                  product_id: productOid,
                  delta: color.stock,
                  reason: "received",
                  note: id ? "Added on product form" : "Initial stock",
                  color: color.name,
                  order_id: null,
                  created_at: now,
                },
              ],
              { session },
            );
          }
        }
      }
    });
  } catch {
    return { error: "Could not save the product. Please try again." };
  }

  for (const url of purgeUrls) await purgeImage(url);

  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  redirect("/admin/products?saved=1");
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = idFrom(formData.get("id"));
  if (!id) redirect("/admin/products");
  const productOid = toObjectId(id);
  if (!productOid) redirect("/admin/products");

  const purgeUrls: string[] = [];

  await withTransaction(async (session) => {
    const product = productDTO(
      await Product.findOne({ _id: productOid }).session(session).lean(),
    );
    const colors = (
      await ProductColor.find({ product_id: productOid })
        .session(session)
        .lean() as unknown[]
    ).map(
      (doc) => productColorDTO(doc) as NonNullable<ReturnType<typeof productColorDTO>>,
    );

    await ProductColor.deleteMany({ product_id: productOid }, { session });
    await StockMove.deleteMany({ product_id: productOid }, { session });
    await Product.deleteOne({ _id: productOid }, { session });

    if (product?.image) purgeUrls.push(product.image);
    for (const color of colors) {
      if (color.image) purgeUrls.push(color.image);
    }
  });

  for (const url of purgeUrls) await purgeImage(url);

  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  redirect("/admin/products?deleted=1");
}

/* ------------------------------- stock ------------------------------- */

export async function adjustStock(formData: FormData) {
  await requireAdmin();
  await ready();

  const productId = idFrom(formData.get("product_id"));
  const delta = Math.trunc(Number(formData.get("delta") || 0));
  const reason = String(formData.get("reason") ?? "correction");
  const note = String(formData.get("note") ?? "").trim() || null;
  const colorId = idFrom(formData.get("color_id"));

  if (!productId || !Number.isFinite(delta) || delta === 0) {
    redirect(`/admin/stock?error=${encodeURIComponent("Enter a non-zero quantity change.")}`);
  }

  const productOid = toObjectId(productId);
  if (!productOid) redirect("/admin/stock");

  const product = productDTO(
    await Product.findOne({ _id: productOid }).lean(),
  );
  if (!product) redirect("/admin/stock");

  const colors = (
    await ProductColor.find({ product_id: productOid })
      .sort({ position: 1, _id: 1 })
      .lean() as unknown[]
  ).map(
    (doc) => productColorDTO(doc) as NonNullable<ReturnType<typeof productColorDTO>>,
  );

  const now = new Date().toISOString();

  if (colors.length > 0) {
    const color = colors.find((entry) => entry.id === colorId);
    if (!color) {
      redirect(`/admin/stock?error=${encodeURIComponent("Choose a colour to adjust.")}`);
    }

    const next = color.stock + delta;
    if (next < 0) {
      redirect(
        `/admin/stock?error=${encodeURIComponent(
          `Cannot remove ${Math.abs(delta)} — only ${color.stock} of ${color.name} on hand.`,
        )}`,
      );
    }

    try {
      await withTransaction(async (session) => {
        const colorOid = toObjectId(color.id);
        if (!colorOid) throw new Error("BAD_COLOR_ID");

        const updated = await ProductColor.updateOne(
          {
            _id: colorOid,
            product_id: productOid,
            stock: { $gte: -delta },
          },
          { $inc: { stock: delta } },
          { session },
        );
        if (updated.matchedCount === 0) throw new Error("STOCK_CHANGED");

        const totals = (await ProductColor.aggregate([
          { $match: { product_id: productOid } },
          { $group: { _id: null, total: { $sum: "$stock" } } },
        ]).session(session)) as Array<{ total: number }>;
        const total = Number(totals[0]?.total) || 0;

        await Product.updateOne(
          { _id: productOid },
          { $set: { stock: total, updated_at: now } },
          { session },
        );
        await StockMove.create(
          [
            {
              product_id: productOid,
              delta,
              reason,
              note,
              color: color.name,
              order_id: null,
              created_at: now,
            },
          ],
          { session },
        );
      });
    } catch {
      redirect(
        `/admin/stock?error=${encodeURIComponent("That stock changed. Please try again.")}`,
      );
    }

    revalidatePath("/admin/stock");
    revalidatePath("/admin");
    revalidatePath("/", "layout");
    redirect(
      `/admin/stock?adjusted=${encodeURIComponent(`${product.name} · ${color.name}`)}`,
    );
  }

  const next = product.stock + delta;
  if (next < 0) {
    redirect(
      `/admin/stock?error=${encodeURIComponent(
        `Cannot remove ${Math.abs(delta)} — only ${product.stock} on hand.`,
      )}`,
    );
  }

  try {
    await withTransaction(async (session) => {
      const updated = await Product.updateOne(
        { _id: productOid, stock: { $gte: -delta } },
        { $inc: { stock: delta }, $set: { updated_at: now } },
        { session },
      );
      if (updated.matchedCount === 0) throw new Error("STOCK_CHANGED");

      await StockMove.create(
        [
          {
            product_id: productOid,
            delta,
            reason,
            note,
            color: null,
            order_id: null,
            created_at: now,
          },
        ],
        { session },
      );
    });
  } catch {
    redirect(
      `/admin/stock?error=${encodeURIComponent("That stock changed. Please try again.")}`,
    );
  }

  revalidatePath("/admin/stock");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
  redirect(`/admin/stock?adjusted=${encodeURIComponent(product.name)}`);
}

/* ------------------------------- orders ------------------------------ */

export async function updateOrderStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  const result = await setOrderStatus(id, status);
  if (!result.ok) {
    redirect(`/admin/orders/${id}?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/stock");
  redirect(`/admin/orders/${id}?updated=1`);
}

export async function saveOrderTracking(formData: FormData) {
  await requireAdmin();
  await ready();

  const id = idFrom(formData.get("id"));
  const tracking = String(formData.get("tracking_id") ?? "").trim().slice(0, 64) || null;
  const courier = String(formData.get("courier") ?? "").trim().slice(0, 40) || null;
  const intent = String(formData.get("intent") ?? "save");

  if (!id) redirect("/admin/orders");

  const orderOid = toObjectId(id);
  if (!orderOid) redirect("/admin/orders");

  const order = orderDTO(
    await Order.findOne({ _id: orderOid }).lean(),
  );
  if (!order) redirect("/admin/orders");

  await Order.updateOne(
    { _id: orderOid },
    { $set: { tracking_id: tracking, courier } },
  );

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/", "layout");

  if (intent === "print") {
    // The detail page starts the download once it re-renders, which is more
    // reliable than redirecting straight at a file response.
    redirect(`/admin/orders/${id}?saved=1&print=1`);
  }

  redirect(`/admin/orders/${id}?saved=1`);
}

/* ------------------------------ settings ----------------------------- */

export async function saveSettings(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdmin();
  await ready();
  const shipping = Number(formData.get("shipping_fee"));
  const threshold = Number(formData.get("free_shipping_threshold"));
  if (!Number.isFinite(shipping) || shipping < 0)
    return { error: "Shipping fee must be zero or more." };
  if (!Number.isFinite(threshold) || threshold < 0)
    return { error: "Free-delivery threshold must be zero or more." };

  await Setting.updateOne(
    { _id: "shipping_fee" },
    { $set: { value: String(shipping) } },
    { upsert: true },
  );
  await Setting.updateOne(
    { _id: "free_shipping_threshold" },
    { $set: { value: String(threshold) } },
    { upsert: true },
  );

  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}

export async function saveHomepageSettings(formData: FormData) {
  await requireAdmin();
  await ready();

  const hero = parseHeroSettings({
    hero_offer: String(formData.get("hero_offer") ?? ""),
    hero_upcoming: String(formData.get("hero_upcoming") ?? ""),
    hero_carousel: String(formData.get("hero_carousel") ?? ""),
  });

  await Setting.updateOne(
    { _id: "hero_offer" },
    { $set: { value: JSON.stringify(hero.offer) } },
    { upsert: true },
  );
  await Setting.updateOne(
    { _id: "hero_upcoming" },
    { $set: { value: JSON.stringify(hero.upcoming) } },
    { upsert: true },
  );
  await Setting.updateOne(
    { _id: "hero_carousel" },
    { $set: { value: JSON.stringify(hero.carousel) } },
    { upsert: true },
  );

  revalidatePath("/", "layout");
  revalidatePath("/admin/homepage");
  redirect("/admin/homepage?saved=1");
}
