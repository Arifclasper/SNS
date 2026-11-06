import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { SignJWT } from "jose";
import { MongoClient } from "mongodb";

/* ------------------------------ env loader ------------------------------ */

function loadEnv() {
  for (const file of ["../.env.local", "../.env"]) {
    let text;
    try {
      text = readFileSync(new URL(file, import.meta.url), "utf8");
    } catch {
      continue;
    }

    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;

      const [, key, raw] = match;
      // .env.local is read first, so it wins over .env. Real environment
      // variables always win over both files.
      if (key in process.env) continue;

      let value = raw.trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

loadEnv();

const base = (() => {
  const value = process.env.APP_BASE_URL?.trim();
  if (!value) throw new Error("APP_BASE_URL is not set. Add it to .env.local.");
  return value.replace(/\/+$/, "");
})();

const jwtSecretValue = process.env.JWT_SECRET?.trim();
if (!jwtSecretValue || jwtSecretValue.length < 32) {
  throw new Error("JWT_SECRET is not set or is shorter than 32 characters.");
}
const jwtSecret = new TextEncoder().encode(jwtSecretValue);
const exp = Math.floor(Date.now() / 1000) + 3600;
const token = await new SignJWT({ role: "owner" })
  .setProtectedHeader({ alg: "HS256", typ: "JWT" })
  .setSubject("admin")
  .setIssuer("sns-collection")
  .setAudience("sns-admin")
  .setIssuedAt()
  .setExpirationTime(exp)
  .setJti(randomUUID())
  .sign(jwtSecret);
const cookieName = process.env.SESSION_COOKIE_NAME?.trim() || "sns_session";
const cookie = `${cookieName}=${token}`;

function decode(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

async function page(path) {
  const res = await fetch(base + path, { headers: { cookie } });
  const html = await res.text();
  const forms = [...html.matchAll(/<form[\s\S]*?<\/form>/g)].map((m) => m[0]);
  return { status: res.status, html, forms };
}

function hiddenOf(formHtml) {
  return [...formHtml.matchAll(/<input[^>]*type="hidden"[^>]*>/g)].map((m) => {
    const name = /name="([^"]*)"/.exec(m[0])?.[1] ?? "";
    const value = /value="([^"]*)"/.exec(m[0])?.[1] ?? "";
    return [decode(name), decode(value)];
  });
}

async function submit(path, formHtml, values) {
  const body = new FormData();
  for (const [k, v] of hiddenOf(formHtml)) {
    if (!(k in values)) body.append(k, v);
  }
  for (const [k, v] of Object.entries(values)) body.append(k, String(v));
  const res = await fetch(base + path, {
    method: "POST",
    body,
    headers: { cookie },
    redirect: "manual",
  });
  return { status: res.status, location: res.headers.get("location") };
}

/* -------------------------------- checks -------------------------------- */

async function main() {
  const explicitUri = process.env.MONGODB_URI?.trim();
  const user = process.env.MONGODB_USER?.trim();
  const password = process.env.MONGODB_PASSWORD?.trim();
  const hosts = process.env.MONGODB_HOSTS?.trim();
  const host = process.env.MONGODB_HOST?.trim();
  const uri =
    explicitUri ||
    (user && password && hosts
      ? `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${hosts}/?authSource=admin&tls=true&retryWrites=true&w=majority`
      : user && password && host
        ? `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/?retryWrites=true&w=majority`
        : "");
  if (!uri) {
    console.error(
      "MongoDB is not configured. Set MONGODB_URI, or MONGODB_USER + " +
        "MONGODB_PASSWORD + MONGODB_HOST, in .env.local.",
    );
    process.exitCode = 1;
    return;
  }

  const dbName = process.env.MONGODB_DB?.trim() || "SNS_Collection";
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });

  try {
    await client.connect();
    const db = client.db(dbName);
    const categories = db.collection("categories");
    const products = db.collection("products");
    const stockMoves = db.collection("stock_moves");

    const results = {};
    const failures = [];
    const check = (label, ok) => {
      if (!ok) failures.push(label);
    };

    /* ---------- 1. create a category (last form on the page) ---------- */
    const catsPage = await page("/admin/categories");
    const createCatForm = catsPage.forms
      .filter((f) => f.includes("Create category"))
      .pop();
    results.category = await submit("/admin/categories", createCatForm, {
      name: "Test Category",
      parent_id: "",
    });
    const cat = await categories.findOne(
      { name: "Test Category" },
      { sort: { _id: -1 } },
    );
    results.categoryRow = cat
      ? {
          name: cat.name,
          slug: cat.slug,
          parent_id: cat.parent_id ? String(cat.parent_id) : null,
        }
      : null;
    if (!cat) {
      console.log(JSON.stringify(results, null, 2));
      process.exitCode = 1;
      return;
    }

    /* ---------- 2. create a product inside it ---------- */
    const newPage = await page("/admin/products/new");
    const productForm = newPage.forms.find((f) => f.includes("Save product"));
    if (!productForm) {
      console.log(
        JSON.stringify({ error: "product form not found", forms: newPage.forms.length }, null, 2),
      );
      process.exitCode = 1;
      return;
    }
    results.product = await submit("/admin/products/new", productForm, {
      name: "Verification Lamp",
      sku: "SNS-TEST-001",
      description: "Created by the automated end-to-end check.",
      price: "1234",
      compare_at_price: "1600",
      category_id: String(cat._id),
      status: "active",
      stock: "9",
      low_stock_threshold: "3",
      image: "",
    });

    const product = await products.findOne(
      { sku: "SNS-TEST-001" },
      { sort: { _id: -1 } },
    );
    results.productRow = product
      ? {
          name: product.name,
          slug: product.slug,
          price: product.price,
          stock: product.stock,
        }
      : null;
    if (!product) {
      console.log(JSON.stringify(results, null, 2));
      process.exitCode = 1;
      return;
    }

    /* ---------- 3. storefront visibility ---------- */
    {
      const detail = await fetch(`${base}/product/${product.slug}`);
      const detailHtml = await detail.text();
      results.storefrontProduct = {
        status: detail.status,
        showsName: detailHtml.includes("Verification Lamp"),
        showsPrice: detailHtml.includes("1,234"),
        showsStock: detailHtml.includes("In stock"),
      };
      results.inListing = (await (await fetch(`${base}/products`)).text()).includes(
        "Verification Lamp",
      );
      const catPage = await fetch(`${base}/category/${cat.slug}`);
      const catHtml = await catPage.text();
      results.inCategoryPage = {
        status: catPage.status,
        showsProduct: catHtml.includes("Verification Lamp"),
      };
    }

    /* ---------- 4. stock adjustment ---------- */
    {
      const productId = String(product._id);
      const stockPage = await page("/admin/stock");
      const rowForm = stockPage.forms.find(
        (f) => f.includes(`name="product_id" value="${productId}"`) && f.includes("Apply"),
      );
      results.stockAdjust = rowForm
        ? await submit("/admin/stock", rowForm, {
            product_id: productId,
            delta: "5",
            reason: "received",
            note: "E2E restock",
          })
        : { error: "row form not found" };

      const productAfter = await products.findOne({ _id: product._id });
      results.stockAfter = productAfter?.stock ?? null;

      const lastMove = await stockMoves
        .find({ product_id: product._id })
        .sort({ created_at: -1, _id: -1 })
        .limit(1)
        .next();
      results.lastMove = lastMove
        ? { delta: lastMove.delta, reason: lastMove.reason, note: lastMove.note ?? null }
        : null;
    }

    /* ---------- 5. admin list search ---------- */
    {
      const res = await fetch(`${base}/admin/products?q=SNS-TEST-001`, {
        headers: { cookie },
      });
      results.adminList = {
        status: res.status,
        showsProduct: (await res.text()).includes("Verification Lamp"),
      };
    }

    /* ---------- 6. delete product, then category ---------- */
    {
      const productId = String(product._id);
      const catId = String(cat._id);

      const listPage = await page("/admin/products?q=SNS-TEST-001");
      const deleteForm = listPage.forms.find(
        (f) => f.includes(`name="id" value="${productId}"`) && f.includes("Delete"),
      );
      results.deleteProduct = deleteForm
        ? await submit("/admin/products", deleteForm, { id: productId })
        : { error: "delete form not found" };
      results.productGone =
        (await products.countDocuments({ _id: product._id })) === 0;
      results.productPageAfterDelete = (await fetch(`${base}/product/${product.slug}`)).status;

      const catsAgain = await page("/admin/categories");
      const deleteCatForm = catsAgain.forms.find(
        (f) => f.includes(`name="id" value="${catId}"`) && f.includes("Delete"),
      );
      results.deleteCategory = deleteCatForm
        ? await submit("/admin/categories", deleteCatForm, { id: catId })
        : { error: "delete form not found" };
      results.categoryGone =
        (await categories.countDocuments({ _id: cat._id })) === 0;
      results.orphanMoves = await stockMoves.countDocuments({
        product_id: product._id,
      });
    }

    check("category created", Boolean(cat));
    check("product created", Boolean(product));
    check("stock adjusted", results.stockAfter === 9 + 5);
    check("latest stock move recorded", results.lastMove?.delta === 5);
    check("admin search finds product", results.adminList.showsProduct);
    check("product deleted", results.productGone);
    check("category deleted", results.categoryGone);

    console.log(JSON.stringify(results, null, 2));
    if (failures.length > 0) {
      console.error(`\nFailed checks: ${failures.join(", ")}`);
      process.exitCode = 1;
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
