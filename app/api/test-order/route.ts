import { NextResponse } from "next/server";
import { createOrder, setOrderStatus } from "@/lib/orders";
import { Product, isObjectId } from "@/lib/models";
import { ready } from "@/lib/mongoose";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // This endpoint only exists so the end-to-end scripts can drive the order
  // lifecycle. Never expose it on a deployed store.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action ?? "create";

  if (action === "create") {
    let productId = isObjectId(body.productId) ? body.productId : null;

    if (!productId) {
      await ready();
      const product = await Product.findOne({ status: "active" }).lean();
      if (!product) {
        return NextResponse.json({ error: "No active product available." }, { status: 400 });
      }
      productId = String(product._id);
    }

    const result = await createOrder({
      customer_name: "Test Customer",
      phone: "01700000000",
      address: "House 1, Road 2, Dhanmondi",
      city: "Dhaka",
      note: "automated check",
      items: [
        {
          productId,
          qty: Number(body.qty ?? 2),
          size: body.size ? String(body.size) : null,
          colorId: isObjectId(body.colorId) ? body.colorId : null,
        },
      ],
    });
    if (!result.ok) return NextResponse.json(result, { status: 400 });
    return NextResponse.json({ ...result, orderId: String(result.orderId) });
  }

  if (action === "cancel") {
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    const result = await setOrderStatus(orderId, "cancelled");
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
