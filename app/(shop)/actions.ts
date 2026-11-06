"use server";

import { redirect } from "next/navigation";
import { isObjectId } from "@/lib/models";
import { createOrder } from "@/lib/orders";

export type CheckoutState = {
  error?: string;
  fields?: Record<string, string>;
};

export async function placeOrder(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const raw = {
    customer_name: String(formData.get("customer_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    note: String(formData.get("note") ?? "").trim(),
    items: String(formData.get("items") ?? ""),
  };

  const fields: Record<string, string> = {};
  if (raw.customer_name.length < 2) fields.customer_name = "Please enter your full name.";
  if (!/^[0-9+\-\s()]{7,20}$/.test(raw.phone)) fields.phone = "Enter a valid phone number.";
  if (raw.address.length < 6) fields.address = "Please enter a delivery address.";
  if (raw.city.length < 2) fields.city = "Please enter your city or area.";

  if (Object.keys(fields).length > 0) {
    return { error: "Please check the highlighted fields.", fields };
  }

  let items: {
    productId: string;
    qty: number;
    size: string | null;
    colorId: string | null;
  }[] = [];
  try {
    const parsed = JSON.parse(raw.items);
    if (Array.isArray(parsed)) {
      items = parsed
        .filter((item) => isObjectId(item?.productId))
        .map((item) => ({
          productId: String(item.productId),
          qty: Number(item?.qty) || 1,
          size: item?.size ? String(item.size).trim().slice(0, 40) : null,
          colorId: isObjectId(item?.colorId) ? String(item.colorId) : null,
        }));
    }
  } catch {
    items = [];
  }

  if (items.length === 0) return { error: "Your cart is empty." };

  const result = await createOrder({ ...raw, items });
  if (!result.ok) return { error: result.error };

  redirect(`/order/${encodeURIComponent(result.token)}?placed=1`);
}
