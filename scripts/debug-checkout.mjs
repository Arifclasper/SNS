import { appBaseUrl, connectMongo, loadEnv, pickSellableProduct } from "./_mongo.mjs";

loadEnv();
const base = appBaseUrl();
const { client, db } = await connectMongo();

function decode(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

try {
  const { product, color, size, qty } = await pickSellableProduct(db, 3);
  const line = { productId: String(product._id), qty };
  if (size) line.size = size;
  if (color) line.colorId = String(color._id);

  const page = await fetch(`${base}/checkout`);
  const html = await page.text();
  const hidden = [...html.matchAll(/<input[^>]*type="hidden"[^>]*\/>/g)].map((m) => {
    const name = /name="([^"]*)"/.exec(m[0])?.[1];
    const value = /value="([^"]*)"/.exec(m[0])?.[1] ?? "";
    return [decode(name), decode(value)];
  });

  const body = new FormData();
  for (const [k, v] of hidden) if (k !== "items") body.append(k, v);
  body.append("customer_name", "Real Checkout Test");
  body.append("phone", "01711223344");
  body.append("city", "Dhanmondi, Dhaka");
  body.append("address", "House 42, Road 7, Dhanmondi");
  body.append("note", "Please call after 6pm");
  body.append("items", JSON.stringify([line]));

  const submit = await fetch(`${base}/checkout`, {
    method: "POST",
    body,
    redirect: "manual",
  });
  const text = await submit.text();
  console.log("status", submit.status, "len", text.length);
  console.log("has 'check the highlighted'", /highlighted/i.test(text));
  console.log("has 'cart is empty'", /cart is empty/i.test(text));
  console.log("has 'no longer available'", /no longer available/i.test(text));

  const m = text.match(
    /rounded-\[6px\] border border-danger\/30 bg-danger-soft[^>]*>([^<]{3,200})</,
  );
  console.log("error box:", m?.[1]);
  console.log(
    "orders in db:",
    await db.collection("orders").countDocuments(),
  );
} finally {
  await client.close();
}
