import type { Metadata } from "next";
import { CartView } from "@/components/CartView";
import { getSettings } from "@/lib/queries";
import { DEFAULT_FREE_SHIPPING_THRESHOLD, DEFAULT_SHIPPING_FEE } from "@/lib/config";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const settings = await getSettings();
  return (
    <CartView
      shippingFee={Number(settings.shipping_fee ?? DEFAULT_SHIPPING_FEE)}
      freeThreshold={Number(
        settings.free_shipping_threshold ?? DEFAULT_FREE_SHIPPING_THRESHOLD,
      )}
    />
  );
}
