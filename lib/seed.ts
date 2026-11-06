import mongoose from "mongoose";
import { Category, Product, Setting } from "./models";
import {
  CURRENCY_SYMBOL,
  DEFAULT_FREE_SHIPPING_THRESHOLD,
  DEFAULT_SHIPPING_FEE,
  STORE_NAME,
} from "./config";

/**
 * Inserts the demo catalogue used by a fresh database. Category references
 * are resolved through a slug -> ObjectId map.
 */
export async function seedDemo(): Promise<void> {
  const now = new Date().toISOString();

  await Setting.bulkWrite([
    {
      updateOne: {
        filter: { _id: "store_name" },
        update: { $setOnInsert: { value: STORE_NAME } },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { _id: "currency" },
        update: { $setOnInsert: { value: CURRENCY_SYMBOL } },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { _id: "shipping_fee" },
        update: { $setOnInsert: { value: String(DEFAULT_SHIPPING_FEE) } },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { _id: "free_shipping_threshold" },
        update: { $setOnInsert: { value: String(DEFAULT_FREE_SHIPPING_THRESHOLD) } },
        upsert: true,
      },
    },
  ]);

  const roots: Array<{ name: string; slug: string; position: number }> = [
    { name: "Watches", slug: "watches", position: 1 },
    { name: "Lighting", slug: "lighting", position: 2 },
    { name: "Accessories", slug: "accessories", position: 3 },
  ];

  const rootDocs = roots.map((root) => ({
    _id: new mongoose.Types.ObjectId(),
    name: root.name,
    slug: root.slug,
    parent_id: null,
    position: root.position,
    is_active: 1,
    created_at: now,
  }));
  await Category.insertMany(rootDocs);

  const bySlug = new Map<string, mongoose.Types.ObjectId>(
    rootDocs.map((doc) => [doc.slug, doc._id as mongoose.Types.ObjectId]),
  );

  const children: Array<{
    name: string;
    slug: string;
    parentSlug: string;
    position: number;
  }> = [
    { name: "Men's Watches", slug: "mens-watches", parentSlug: "watches", position: 1 },
    { name: "Women's Watches", slug: "womens-watches", parentSlug: "watches", position: 2 },
    {
      name: "Galaxy Projectors",
      slug: "galaxy-projectors",
      parentSlug: "lighting",
      position: 1,
    },
    { name: "Night Lights", slug: "night-lights", parentSlug: "lighting", position: 2 },
    { name: "Straps & Bands", slug: "straps-bands", parentSlug: "accessories", position: 1 },
    { name: "Gift Sets", slug: "gift-sets", parentSlug: "accessories", position: 2 },
  ];

  const childDocs = children.map((child) => ({
    _id: new mongoose.Types.ObjectId(),
    name: child.name,
    slug: child.slug,
    parent_id: bySlug.get(child.parentSlug) ?? null,
    position: child.position,
    is_active: 1,
    created_at: now,
  }));
  await Category.insertMany(childDocs);
  for (const doc of childDocs) {
    bySlug.set(doc.slug, doc._id as mongoose.Types.ObjectId);
  }

  const products: Array<{
    name: string;
    slug: string;
    sku: string;
    description: string;
    price: number;
    compare: number | null;
    category: string;
    stock: number;
    threshold: number;
  }> = [
    {
      name: "Aurora Chronograph",
      slug: "aurora-chronograph",
      sku: "SNS-W-101",
      description:
        "Brushed steel case with a sunray dial, sapphire crystal and 50m water resistance. A everyday chronograph that dresses up.",
      price: 4850,
      compare: 6500,
      category: "mens-watches",
      stock: 14,
      threshold: 5,
    },
    {
      name: "Meridian Steel 40",
      slug: "meridian-steel-40",
      sku: "SNS-W-102",
      description:
        "A 40mm automatic with an exhibition caseback and a tapered bracelet. Quietly precise.",
      price: 7200,
      compare: 8900,
      category: "mens-watches",
      stock: 6,
      threshold: 5,
    },
    {
      name: "Onyx Digital Sport",
      slug: "onyx-digital-sport",
      sku: "SNS-W-103",
      description:
        "Dual-time digital with a mineral crystal and a soft silicone strap. Built for movement.",
      price: 3200,
      compare: 4200,
      category: "mens-watches",
      stock: 0,
      threshold: 5,
    },
    {
      name: "Luna Pearl 32",
      slug: "luna-pearl-32",
      sku: "SNS-W-201",
      description:
        "A pared-back 32mm case with a mother-of-pearl dial and a fine mesh bracelet.",
      price: 5400,
      compare: 6800,
      category: "womens-watches",
      stock: 9,
      threshold: 5,
    },
    {
      name: "Rosegold Mesh Petite",
      slug: "rosegold-mesh-petite",
      sku: "SNS-W-202",
      description: "Warm rosegold tones on a slim mesh strap. Small, and deliberately so.",
      price: 6100,
      compare: null,
      category: "womens-watches",
      stock: 3,
      threshold: 5,
    },
    {
      name: "Starry Sky Projector",
      slug: "starry-sky-projector",
      sku: "SNS-L-301",
      description:
        "Projects a slow-moving galaxy across walls and ceiling. Remote controlled, 16 colours, adjustable brightness.",
      price: 1690,
      compare: 2890,
      category: "galaxy-projectors",
      stock: 22,
      threshold: 6,
    },
    {
      name: "Astro Buddy Projector",
      slug: "astro-buddy-projector",
      sku: "SNS-L-302",
      description:
        "A small astronaut that floats starlight over the room. Built-in speaker for quiet evenings.",
      price: 1890,
      compare: 2390,
      category: "galaxy-projectors",
      stock: 11,
      threshold: 6,
    },
    {
      name: "Aurora Ripple Lamp",
      slug: "aurora-ripple-lamp",
      sku: "SNS-L-303",
      description:
        "Acrylic ripples lit from within, casting a moving aurora. Sixteen colours, USB powered.",
      price: 990,
      compare: 1150,
      category: "night-lights",
      stock: 40,
      threshold: 8,
    },
    {
      name: "Moonstone Bedside Light",
      slug: "moonstone-bedside-light",
      sku: "SNS-L-304",
      description: "A soft, dimmable glow for the bedside table. Charging base included.",
      price: 1250,
      compare: null,
      category: "night-lights",
      stock: 4,
      threshold: 5,
    },
    {
      name: "Milano Leather Strap",
      slug: "milano-leather-strap",
      sku: "SNS-A-401",
      description: "Full-grain leather with quick-release pins. Fits most 20mm lugs.",
      price: 890,
      compare: 1200,
      category: "straps-bands",
      stock: 33,
      threshold: 8,
    },
    {
      name: "Steel Mesh Band",
      slug: "steel-mesh-band",
      sku: "SNS-A-402",
      description: "A fine-woven stainless mesh band with a sliding clasp. 20mm.",
      price: 650,
      compare: null,
      category: "straps-bands",
      stock: 18,
      threshold: 8,
    },
    {
      name: "Curated Gift Box",
      slug: "curated-gift-box",
      sku: "SNS-A-501",
      description:
        "A watch, a strap and a light, boxed together with a handwritten card.",
      price: 2950,
      compare: 3600,
      category: "gift-sets",
      stock: 7,
      threshold: 4,
    },
  ];

  await Product.insertMany(
    products.map((product) => ({
      _id: new mongoose.Types.ObjectId(),
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      description: product.description,
      price: product.price,
      compare_at_price: product.compare,
      category_id: bySlug.get(product.category),
      image: null,
      stock: product.stock,
      low_stock_threshold: product.threshold,
      status: "active",
      sizes: null,
      created_at: now,
      updated_at: now,
    })),
  );
}
