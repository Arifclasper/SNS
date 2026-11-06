import type { Metadata } from "next";
import { CheckoutForm } from "@/components/CheckoutForm";
import { getSettings } from "@/lib/queries";
import { DEFAULT_FREE_SHIPPING_THRESHOLD, DEFAULT_SHIPPING_FEE } from "@/lib/config";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const settings = await getSettings();
  return (
    <CheckoutForm
      shippingFee={Number(settings.shipping_fee ?? DEFAULT_SHIPPING_FEE)}
      freeThreshold={Number(
        settings.free_shipping_threshold ?? DEFAULT_FREE_SHIPPING_THRESHOLD,
      )}
    />
  );
}
