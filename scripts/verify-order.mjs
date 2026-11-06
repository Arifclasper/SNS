import { appBaseUrl, connectMongo, loadEnv, oid, pickSellableProduct } from "./_mongo.mjs";

loadEnv();
const base = appBaseUrl();
const { client, db } = await connectMongo();
const results = {};

try {
  const { product, color, size } = await pickSellableProduct(db, 2);
  const productId = String(product._id);
  const colorId = color ? String(color._id) : null;
  const before = product.stock;

  const createRes = await fetch(`${base}/api/test-order`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "create",
      productId,
      qty: 2,
      size,
      colorId,
    }),
  });
  const created = await createRes.json();
  results.create = { status: createRes.status, ...created };

  const orderId = created.orderId ? oid(created.orderId) : null;
  if (orderId) {
    const productAfter = await db
      .collection("products")
      .findOne({ _id: product._id });
    const after = productAfter?.stock ?? null;
    results.stock = { before, after, delta: (after ?? 0) - before };

    results.soldMoves = await db.collection("stock_moves").countDocuments({
      order_id: orderId,
      reason: "sold",
    });
    results.orderItems = await db
      .collection("order_items")
      .countDocuments({ order_id: orderId });

    const page = await fetch(`${base}/order/${created.token}`);
    const html = await page.text();
    results.orderPage = {
      status: page.status,
      showsCode: html.includes(created.code),
      showsCustomer: html.includes("Test Customer"),
      showsTotal: html.includes(Number(created.total).toLocaleString("en-US")),
    };

    const receipt = await fetch(`${base}/api/orders/${created.token}/receipt`);
    const receiptBytes = Buffer.from(await receipt.arrayBuffer());
    results.receipt = {
      status: receipt.status,
      contentType: receipt.headers.get("content-type"),
      bytes: receiptBytes.length,
      isPdf: receiptBytes.subarray(0, 4).toString() === "%PDF",
    };

    const cancelRes = await fetch(`${base}/api/test-order`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "cancel", orderId: created.orderId }),
    });
    results.cancel = { status: cancelRes.status, ...(await cancelRes.json()) };

    const resetProduct = await db
      .collection("products")
      .findOne({ _id: product._id });
    results.stockAfterCancel = resetProduct?.stock ?? null;
    results.returnMoves = await db.collection("stock_moves").countDocuments({
      order_id: orderId,
      reason: "return",
    });
    results.finalStatus = (
      await db.collection("orders").findOne({ _id: orderId })
    )?.status;

    // The cancel restored the stock, so removing the order rows is safe.
    await db.collection("stock_moves").deleteMany({ order_id: orderId });
    await db.collection("order_items").deleteMany({ order_id: orderId });
    await db.collection("orders").deleteOne({ _id: orderId });

    results.cleaned =
      (await db.collection("orders").countDocuments({ _id: orderId })) === 0;
    results.stockRestored = results.stockAfterCancel === before;
  }

  console.log(JSON.stringify(results, null, 2));
  if (!orderId || results.stockRestored === false || results.receipt?.isPdf !== true) {
    process.exitCode = 1;
  }
} finally {
  await client.close();
}
