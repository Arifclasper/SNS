import { appBaseUrl, connectMongo, loadEnv, oid, pickSellableProduct } from "./_mongo.mjs";

loadEnv();
const base = appBaseUrl();

function decode(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

const { client, db } = await connectMongo();
const results = {};

try {
  const { product, color, size, qty } = await pickSellableProduct(db, 3);
  const productId = String(product._id);
  const colorId = color ? String(color._id) : null;

  // 1. Load the checkout page as a browser without JS would.
  const page = await fetch(`${base}/checkout`);
  const html = await page.text();

  const hidden = [...html.matchAll(/<input[^>]*type="hidden"[^>]*\/>/g)].map((m) => {
    const name = /name="([^"]*)"/.exec(m[0])?.[1];
    const value = /value="([^"]*)"/.exec(m[0])?.[1] ?? "";
    return [decode(name), decode(value)];
  });
  results.actionFields = hidden.map(([k]) => k);

  const line = { productId, qty };
  if (size) line.size = size;
  if (colorId) line.colorId = colorId;

  const stockBefore = product.stock;
  const colorStockBefore = color ? color.stock : null;

  const body = new FormData();
  for (const [k, v] of hidden) if (k !== "items") body.append(k, v);
  body.append("customer_name", "Real Checkout Test");
  body.append("phone", "01711223344");
  body.append("city", "Dhanmondi, Dhaka");
  body.append("address", "House 42, Road 7, Dhanmondi");
  body.append("note", "Please call after 6pm");
  body.append("items", JSON.stringify([line]));

  // 2. Submit it.
  const submit = await fetch(`${base}/checkout`, {
    method: "POST",
    body,
    redirect: "manual",
  });
  results.submit = {
    status: submit.status,
    location: submit.headers.get("location"),
  };

  const location = submit.headers.get("location") ?? "";
  const token = location.match(/\/order\/([^?]+)/)?.[1];
  results.token = token ?? null;

  // 3. Check what landed in MongoDB.
  if (token) {
    const order = await db.collection("orders").findOne({ public_token: token });
    results.orderCode = order?.code ?? null;
    results.order = order
      ? {
          customer: order.customer_name,
          city: order.city,
          phone: order.phone,
          status: order.status,
          subtotal: order.subtotal,
          shipping: order.shipping,
          total: order.total,
        }
      : null;

    if (order) {
      const items = await db
        .collection("order_items")
        .find({ order_id: order._id })
        .toArray();
      results.items = items.map((item) => ({
        name: item.name,
        sku: item.sku,
        unit_price: item.unit_price,
        qty: item.qty,
      }));

      const productAfter = await db
        .collection("products")
        .findOne({ _id: product._id });
      results.stock = {
        before: stockBefore,
        after: productAfter?.stock ?? null,
      };

      const soldMoves = await db
        .collection("stock_moves")
        .find({ order_id: order._id })
        .toArray();
      results.soldMove = soldMoves.map((move) => ({
        delta: move.delta,
        reason: move.reason,
        note: move.note,
      }));

      const confirmation = await fetch(`${base}/order/${token}`);
      const confirmHtml = await confirmation.text();
      results.confirmationPage = {
        status: confirmation.status,
        hasCustomer: confirmHtml.includes("Real Checkout Test"),
        hasNote: confirmHtml.includes("Please call after 6pm"),
        hasTotal: confirmHtml.includes(Number(order.total).toLocaleString("en-US")),
      };

      // 4. Clean up so the database starts empty again.
      await db.collection("orders").deleteOne({ _id: order._id });
      await db.collection("order_items").deleteMany({ order_id: order._id });
      await db.collection("stock_moves").deleteMany({ order_id: order._id });
      await db
        .collection("products")
        .updateOne({ _id: product._id }, { $inc: { stock: qty } });
      if (color) {
        await db
          .collection("product_colors")
          .updateOne({ _id: color._id }, { $inc: { stock: qty } });
      }

      results.cleaned =
        (await db.collection("orders").countDocuments({ _id: order._id })) === 0;

      const resetProduct = await db
        .collection("products")
        .findOne({ _id: product._id });
      const resetColor = color
        ? await db.collection("product_colors").findOne({ _id: color._id })
        : null;
      results.stockReset = resetProduct?.stock === stockBefore;
      if (color) results.colorStockReset = resetColor?.stock === colorStockBefore;
    }
  }

  console.log(JSON.stringify(results, null, 2));
  if (!results.token || results.cleaned === false || results.stockReset === false) {
    process.exitCode = 1;
  }
} finally {
  await client.close();
}
