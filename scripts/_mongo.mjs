import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient, ObjectId } from "mongodb";

export const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/** Minimal .env loader: .env.local wins over .env, real env always wins. */
export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(PROJECT_ROOT, file);
    if (!existsSync(full)) continue;

    for (const rawLine of readFileSync(full, "utf8").split(/\r?\n/)) {
      let line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      if (line.startsWith("export ")) line = line.slice(7).trim();

      const equals = line.indexOf("=");
      if (equals <= 0) continue;

      const key = line.slice(0, equals).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      if (key in process.env) continue;

      let value = line.slice(equals + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      } else {
        const comment = value.indexOf(" #");
        if (comment !== -1) value = value.slice(0, comment).trim();
      }
      process.env[key] = value;
    }
  }
}

/** Reads a required environment variable, failing loudly when it is missing. */
export function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set. Add it to .env.local.`);
  }
  return value;
}

/** Base URL used by the HTTP verification scripts. */
export function appBaseUrl() {
  return requireEnv("APP_BASE_URL").replace(/\/+$/, "");
}

/** Builds the Atlas URI from MONGODB_URI or the separate credential vars. */
export function mongoUri() {
  const explicit = process.env.MONGODB_URI?.trim();
  if (explicit) return explicit;

  const user = process.env.MONGODB_USER?.trim();
  const password = process.env.MONGODB_PASSWORD?.trim();
  const hosts = process.env.MONGODB_HOSTS?.trim();
  const host = process.env.MONGODB_HOST?.trim();

  if (user && password && hosts) {
    return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${hosts}/?authSource=admin&tls=true&retryWrites=true&w=majority`;
  }

  if (user && password && host) {
    return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/?retryWrites=true&w=majority`;
  }

  throw new Error(
    "MongoDB is not configured. Set MONGODB_URI, or MONGODB_USER + " +
      "MONGODB_PASSWORD + MONGODB_HOST, in .env.local.",
  );
}

export async function connectMongo() {
  loadEnv();

  const uri = mongoUri();

  const dbName = process.env.MONGODB_DB?.trim() || "SNS_Collection";
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  return { client, db: client.db(dbName) };
}

export function oid(value) {
  return new ObjectId(String(value));
}

/**
 * Picks an active product with enough stock, plus a usable colour/size so the
 * scripts work against both the demo catalogue and a migrated database.
 */
export async function pickSellableProduct(db, qty = 1) {
  const products = await db
    .collection("products")
    .find({ status: "active", stock: { $gte: qty } })
    .limit(25)
    .toArray();

  for (const product of products) {
    const allColors = await db
      .collection("product_colors")
      .find({ product_id: product._id })
      .sort({ position: 1, _id: 1 })
      .toArray();

    let color = null;
    if (allColors.length > 0) {
      color = allColors.find((entry) => Number(entry.stock) >= qty) ?? null;
      if (!color) continue;
    }

    let size = null;
    if (product.sizes) {
      try {
        const parsed = JSON.parse(product.sizes);
        if (Array.isArray(parsed) && parsed.length > 0) size = String(parsed[0]);
      } catch {
        /* not JSON — ignore */
      }
    }

    return { product, color, size, qty };
  }

  throw new Error(
    "No active product with enough stock was found. Seed or migrate the database first.",
  );
}
