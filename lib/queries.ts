import mongoose from "mongoose";
import { ready } from "./mongoose";
import {
  ADMIN_ORDERS_PAGE_SIZE,
  CATALOG_PAGE_SIZE,
  NEW_ARRIVALS_LIMIT,
  RELATED_PRODUCTS_LIMIT,
} from "./config";
import {
  Category as CategoryModel,
  Order as OrderModel,
  OrderItem as OrderItemModel,
  Product as ProductModel,
  ProductColor as ProductColorModel,
  Setting as SettingModel,
  StockMove as StockMoveModel,
  categoryDTO,
  isObjectId,
  orderDTO,
  orderItemDTO,
  productColorDTO,
  productDTO,
  stockMoveDTO,
} from "./models";
import type {
  Category,
  CategoryNode,
  Order,
  OrderItem,
  Product,
  ProductColor,
  ProductWithCategory,
  StockMove,
} from "./types";

/* ------------------------------- helpers ------------------------------- */

function oid(id: string) {
  return new mongoose.Types.ObjectId(id);
}

/** Escapes regex metacharacters so a search term is always treated literally. */
function escapedRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function like(value: string) {
  return { $regex: escapedRegex(value), $options: "i" };
}

/**
 * Loads the categories referenced by a set of product documents, plus their
 * parents, in at most two queries. Returns a Map keyed by the hex id string.
 */
async function loadCategoryMap(categoryIds: string[]) {
  const map = new Map<string, any>();
  const ids = [...new Set(categoryIds.filter(isObjectId))];
  if (ids.length === 0) return map;

  const direct = await CategoryModel.find({ _id: { $in: ids.map(oid) } }).lean();
  for (const doc of direct) map.set(String(doc._id), doc);

  const parentIds = [
    ...new Set(
      direct
        .map((doc) => (doc.parent_id ? String(doc.parent_id) : null))
        .filter((id): id is string => !!id && isObjectId(id) && !map.has(id)),
    ),
  ];
  if (parentIds.length > 0) {
    const parents = await CategoryModel.find({
      _id: { $in: parentIds.map(oid) },
    }).lean();
    for (const doc of parents) map.set(String(doc._id), doc);
  }

  return map;
}

/** Converts product documents to DTOs and joins the category breadcrumb fields. */
async function decorateProducts(docs: any[]): Promise<ProductWithCategory[]> {
  if (docs.length === 0) return [];

  const products = docs.map((doc) => productDTO(doc) as Product);
  const categories = await loadCategoryMap(products.map((product) => product.category_id));

  return products.map((product) => {
    const category = categories.get(product.category_id);
    const parent = category?.parent_id ? categories.get(String(category.parent_id)) : undefined;
    return {
      ...product,
      category_name: category?.name ?? "",
      category_slug: category?.slug ?? "",
      parent_name: parent?.name ?? null,
      parent_slug: parent?.slug ?? null,
    };
  });
}

async function decorateProduct(doc: any): Promise<ProductWithCategory | undefined> {
  if (!doc) return undefined;
  const [row] = await decorateProducts([doc]);
  return row;
}

/* ------------------------------ categories ------------------------------ */

export async function getCategories(): Promise<Category[]> {
  await ready();
  const docs = await CategoryModel.find().sort({ position: 1, name: 1 }).lean();
  return docs.map((doc) => categoryDTO(doc) as Category);
}

export async function getCategoryTree(includeInactive = false): Promise<CategoryNode[]> {
  await ready();

  const [docs, counts] = await Promise.all([
    CategoryModel.find(includeInactive ? {} : { is_active: 1 })
      .sort({ position: 1, name: 1 })
      .lean(),
    ProductModel.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$category_id", n: { $sum: 1 } } },
    ]),
  ]);

  const countByCategory = new Map<string, number>();
  for (const row of counts as any[]) {
    countByCategory.set(String(row._id), Number(row.n) || 0);
  }

  const byParent = new Map<string | null, CategoryNode[]>();
  for (const doc of docs) {
    const category = categoryDTO(doc) as Category;
    const node: CategoryNode = {
      ...category,
      children: [],
      productCount: countByCategory.get(category.id) ?? 0,
      totalCount: 0,
    };
    const key = category.parent_id ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(node);
  }

  for (const nodes of byParent.values()) {
    nodes.sort((a, b) => a.position - b.position);
  }

  const roots = byParent.get(null) ?? [];
  for (const root of roots) {
    root.children = byParent.get(root.id) ?? [];
    root.totalCount =
      root.productCount + root.children.reduce((sum, child) => sum + child.productCount, 0);
  }
  return roots;
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  await ready();
  const doc = await CategoryModel.findOne({ slug }).lean();
  return doc ? (categoryDTO(doc) as Category) : undefined;
}

export async function getCategoryById(id: string): Promise<Category | undefined> {
  if (!isObjectId(id)) return undefined;
  await ready();
  const doc = await CategoryModel.findById(id).lean();
  return doc ? (categoryDTO(doc) as Category) : undefined;
}

export async function getCategoryIdsForSlug(slug: string): Promise<string[]> {
  const category = await getCategoryBySlug(slug);
  if (!category) return [];

  await ready();
  const children = await CategoryModel.find({ parent_id: oid(category.id), is_active: 1 })
    .select({ _id: 1 })
    .lean();
  return [category.id, ...children.map((child) => String(child._id))];
}

/* ------------------------------- products ------------------------------- */

export type ProductQuery = {
  q?: string;
  categoryId?: string | null;
  categoryIds?: string[];
  stock?: "in" | "low" | "out" | "";
  status?: string;
  sort?: string;
  page?: number;
  perPage?: number;
};

export async function listProducts(query: ProductQuery) {
  await ready();

  const filter: Record<string, any> = {};

  if (query.q) {
    filter.$or = [{ name: like(query.q) }, { sku: like(query.q) }];
  }

  if (query.categoryIds && query.categoryIds.length > 0) {
    const ids = query.categoryIds.filter(isObjectId);
    filter.category_id = { $in: ids.length > 0 ? ids.map(oid) : [] };
  } else if (query.categoryId) {
    filter.category_id = isObjectId(query.categoryId)
      ? oid(query.categoryId)
      : { $in: [] };
  }

  if (query.stock === "out") {
    filter.stock = { $lte: 0 };
  } else if (query.stock === "low") {
    filter.$expr = {
      $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$low_stock_threshold"] }],
    };
  } else if (query.stock === "in") {
    filter.$expr = { $gt: ["$stock", "$low_stock_threshold"] };
  }

  if (query.status && query.status !== "all") {
    filter.status = query.status;
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { created_at: -1 },
    "name-asc": { name: 1 },
    "name-desc": { name: -1 },
    "price-asc": { price: 1 },
    "price-desc": { price: -1 },
    "stock-asc": { stock: 1 },
  };
  const sort = sortMap[query.sort ?? "newest"] ?? sortMap.newest;

  const perPage = Math.max(1, query.perPage ?? CATALOG_PAGE_SIZE);
  const page = Math.max(1, query.page ?? 1);
  const offset = (page - 1) * perPage;

  const [total, docs] = await Promise.all([
    ProductModel.countDocuments(filter),
    ProductModel.find(filter).sort(sort).skip(offset).limit(perPage).lean(),
  ]);

  const rows = await decorateProducts(docs);

  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getProductBySlug(slug: string): Promise<ProductWithCategory | undefined> {
  await ready();
  const doc = await ProductModel.findOne({ slug }).lean();
  return decorateProduct(doc);
}

export async function getProductById(id: string): Promise<ProductWithCategory | undefined> {
  if (!isObjectId(id)) return undefined;
  await ready();
  const doc = await ProductModel.findById(id).lean();
  return decorateProduct(doc);
}

/** Active products for a set of IDs, used by the homepage hero slots. */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const unique = [...new Set(ids.filter(isObjectId))];
  if (unique.length === 0) return [];

  await ready();
  const docs = await ProductModel.find({
    status: "active",
    _id: { $in: unique.map(oid) },
  }).lean();
  return docs.map((doc) => productDTO(doc) as Product);
}

export async function getProductColors(productId: string): Promise<ProductColor[]> {
  if (!isObjectId(productId)) return [];

  await ready();
  const docs = await ProductColorModel.find({ product_id: oid(productId) })
    .sort({ position: 1, _id: 1 })
    .lean();
  return docs.map((doc) => productColorDTO(doc) as ProductColor);
}

/** Loads colours for several products in one query (stock and product lists). */
export async function getColorsForProducts(productIds: string[]): Promise<ProductColor[]> {
  const unique = [...new Set(productIds.filter(isObjectId))];
  if (unique.length === 0) return [];

  await ready();
  const docs = await ProductColorModel.find({
    product_id: { $in: unique.map(oid) },
  })
    .sort({ product_id: 1, position: 1, _id: 1 })
    .lean();
  return docs.map((doc) => productColorDTO(doc) as ProductColor);
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string,
  limit = RELATED_PRODUCTS_LIMIT,
): Promise<ProductWithCategory[]> {
  if (!isObjectId(productId) || !isObjectId(categoryId)) return [];

  await ready();
  const docs = await ProductModel.find({
    category_id: oid(categoryId),
    _id: { $ne: oid(productId) },
    status: "active",
  })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();
  return decorateProducts(docs);
}

export async function getNewArrivals(
  limit = NEW_ARRIVALS_LIMIT,
): Promise<ProductWithCategory[]> {
  await ready();
  const docs = await ProductModel.find({ status: "active" })
    .sort({ created_at: -1, _id: -1 })
    .limit(limit)
    .lean();
  return decorateProducts(docs);
}

/* -------------------------------- orders -------------------------------- */

export async function getOrderByCode(code: string): Promise<Order | undefined> {
  await ready();
  const doc = await OrderModel.findOne({ code }).lean();
  return doc ? (orderDTO(doc) as Order) : undefined;
}

/**
 * Public order links are keyed by the unguessable token, never by the
 * sequential order code. That stops anyone enumerating customer names,
 * phone numbers and addresses.
 */
export async function getOrderByToken(token: string): Promise<Order | undefined> {
  if (!token || token.length > 128) return undefined;
  await ready();
  const doc = await OrderModel.findOne({ public_token: token }).lean();
  return doc ? (orderDTO(doc) as Order) : undefined;
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  if (!isObjectId(id)) return undefined;
  await ready();
  const doc = await OrderModel.findById(id).lean();
  return doc ? (orderDTO(doc) as Order) : undefined;
}

export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  if (!isObjectId(orderId)) return [];

  await ready();
  const docs = await OrderItemModel.find({ order_id: oid(orderId) })
    .sort({ _id: 1 })
    .lean();
  return docs.map((doc) => orderItemDTO(doc) as OrderItem);
}

export async function listOrders(
  query: { status?: string; q?: string; page?: number } = {},
): Promise<{
  rows: (Order & { item_count: number })[];
  total: number;
  page: number;
  pages: number;
}> {
  await ready();

  const filter: Record<string, any> = {};
  if (query.status && query.status !== "all") {
    filter.status = query.status;
  }
  if (query.q) {
    filter.$or = [
      { customer_name: like(query.q) },
      { phone: like(query.q) },
      { code: like(query.q) },
    ];
  }

  const page = Math.max(1, query.page ?? 1);
  const perPage = ADMIN_ORDERS_PAGE_SIZE;

  const [total, docs] = await Promise.all([
    OrderModel.countDocuments(filter),
    OrderModel.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean(),
  ]);

  const ids = docs.map((doc) => doc._id);
  const itemCounts = new Map<string, number>();
  if (ids.length > 0) {
    const counts = await OrderItemModel.aggregate([
      { $match: { order_id: { $in: ids } } },
      { $group: { _id: "$order_id", n: { $sum: "$qty" } } },
    ]);
    for (const row of counts as any[]) {
      itemCounts.set(String(row._id), Number(row.n) || 0);
    }
  }

  const rows = docs.map((doc) => ({
    ...(orderDTO(doc) as Order),
    item_count: itemCounts.get(String(doc._id)) ?? 0,
  }));

  return { rows, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getOrderCounts(): Promise<Record<string, number>> {
  await ready();
  const rows = await OrderModel.aggregate([
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ]);
  const map: Record<string, number> = {};
  for (const row of rows as any[]) {
    map[String(row._id)] = Number(row.n) || 0;
  }
  return map;
}

/* --------------------------------- stock -------------------------------- */

export async function getStockMoves(productId: string, limit = 20): Promise<StockMove[]> {
  if (!isObjectId(productId)) return [];

  await ready();
  const docs = await StockMoveModel.find({ product_id: oid(productId) })
    .sort({ created_at: -1, _id: -1 })
    .limit(limit)
    .lean();
  return docs.map((doc) => stockMoveDTO(doc) as StockMove);
}

export async function getRecentStockMoves(
  limit = 15,
): Promise<(StockMove & { product_name: string; product_sku: string })[]> {
  await ready();

  const moves = await StockMoveModel.find()
    .sort({ created_at: -1, _id: -1 })
    .limit(limit)
    .lean();
  if (moves.length === 0) return [];

  const productIds = [
    ...new Set(
      moves
        .map((move) => (move.product_id ? String(move.product_id) : null))
        .filter((id): id is string => !!id && isObjectId(id)),
    ),
  ];

  const products = await ProductModel.find({ _id: { $in: productIds.map(oid) } })
    .select({ name: 1, sku: 1 })
    .lean();
  const productMap = new Map<string, any>();
  for (const product of products) productMap.set(String(product._id), product);

  return moves.flatMap((move) => {
    const row = stockMoveDTO(move) as StockMove;
    const product = productMap.get(row.product_id);
    if (!product) return [];
    return [
      {
        ...row,
        product_name: product.name as string,
        product_sku: product.sku as string,
      },
    ];
  });
}

/* ------------------------------- dashboard ------------------------------ */

export async function getDashboard() {
  await ready();

  const [
    productCount,
    categoryCount,
    lowStock,
    outOfStock,
    newOrders,
    revenueRows,
    lowStockRows,
    recentOrders,
  ] = await Promise.all([
    ProductModel.countDocuments(),
    CategoryModel.countDocuments(),
    ProductModel.countDocuments({
      stock: { $gt: 0 },
      $expr: { $lte: ["$stock", "$low_stock_threshold"] },
    }),
    ProductModel.countDocuments({ stock: { $lte: 0 } }),
    OrderModel.countDocuments({ status: "new" }),
    OrderModel.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, n: { $sum: "$total" } } },
    ]),
    ProductModel.find({ $expr: { $lte: ["$stock", "$low_stock_threshold"] } })
      .sort({ stock: 1 })
      .limit(6)
      .lean()
      .then((docs) => decorateProducts(docs)),
    OrderModel.find().sort({ created_at: -1 }).limit(5).lean(),
  ]);

  const revenue = Number((revenueRows as any[])[0]?.n) || 0;

  return {
    productCount,
    categoryCount,
    lowStock,
    outOfStock,
    newOrders,
    revenue,
    lowStockRows,
    recentOrders: recentOrders.map((doc) => orderDTO(doc) as Order),
  };
}

/* -------------------------------- settings ------------------------------ */

export async function getSettings(): Promise<Record<string, string>> {
  await ready();
  const docs = await SettingModel.find().lean();
  return Object.fromEntries(docs.map((doc) => [String(doc._id), doc.value as string]));
}

/* -------------------------------- search -------------------------------- */

export async function searchCatalog(q: string, limit = 8): Promise<ProductWithCategory[]> {
  await ready();
  const docs = await ProductModel.find({
    status: "active",
    $or: [{ name: like(q) }, { sku: like(q) }],
  })
    .sort({ name: 1 })
    .limit(limit)
    .lean();
  return decorateProducts(docs);
}
