"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import { QuantityStepper } from "./QuantityStepper";
import { ProductArt } from "./ProductArt";
import { cartLineKey, money } from "@/lib/utils";

export function CartView({
  shippingFee,
  freeThreshold,
}: {
  shippingFee: number;
  freeThreshold: number;
}) {
  const { lines, ready, setQty, remove, subtotal } = useCart();

  if (!ready) {
    return (
      <div className="mx-auto max-w-[1080px] px-5 py-16">
        <div className="h-8 w-40 animate-pulse rounded bg-sunken" />
        <div className="mt-8 h-40 animate-pulse rounded-[10px] bg-sunken" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-[1080px] px-5 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sunken">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
            <path d="M3 6h18l-1.5 11.5a2 2 0 0 1-2 1.5h-11a2 2 0 0 1-2-1.5L3 6Z" />
            <path d="M8 6a4 4 0 0 1 8 0" />
          </svg>
        </div>
        <h1 className="mt-6 font-display text-3xl text-ink">Your cart is empty</h1>
        <p className="mx-auto mt-2 max-w-[40ch] text-[14px] text-muted">
          Nothing in here yet. Have a look at the collection — it is small on purpose.
        </p>
        <Link href="/products" className="btn btn-primary mt-8">
          Browse products
        </Link>
      </div>
    );
  }

  const shipping = subtotal >= freeThreshold ? 0 : shippingFee;
  const total = subtotal + shipping;

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-12">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-[34px] font-semibold text-ink">Your cart</h1>
        <Link href="/products" className="text-[13px] text-muted link-underline hover:text-ink">
          Continue shopping
        </Link>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="border-t border-line">
          {lines.map((line) => {
            const lineId = cartLineKey(line.productId, line.size, line.colorId);
            return (
            <div key={lineId} className="flex gap-4 border-b border-line py-5">
              <Link
                href={`/product/${line.slug}`}
                className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[12px] border border-line bg-raised"
              >
                <ProductArt name={line.name} image={line.image} />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <Link
                    href={`/product/${line.slug}`}
                    className="line-clamp-2 text-[14px] font-medium text-ink hover:text-brand"
                  >
                    {line.name}
                  </Link>
                  <p className="mt-0.5 text-[12px] text-muted">
                    {line.sku}
                    {line.color ? ` · ${line.color}` : ""}
                    {line.size ? ` · Size ${line.size}` : ""} · {money(line.price)} each
                  </p>
                  <button
                    type="button"
                    onClick={() => remove(lineId)}
                    className="mt-1.5 text-[12px] text-muted underline-offset-2 hover:text-danger hover:underline"
                  >
                    Remove
                  </button>
                </div>

                <div className="flex items-center gap-5">
                  <QuantityStepper
                    value={line.qty}
                    onChange={(qty) => setQty(lineId, qty)}
                    compact
                  />
                  <span className="w-24 text-right text-[14px] font-semibold tabular-nums text-ink">
                    {money(line.price * line.qty)}
                  </span>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        <aside>
          <div className="card sticky top-[150px] p-6">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">
              Order summary
            </h2>

            <dl className="mt-4 space-y-2.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-medium tabular-nums">{money(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="font-medium tabular-nums">
                  {shipping === 0 ? "Free" : money(shipping)}
                </dd>
              </div>
            </dl>

            {shipping > 0 && (
              <p className="mt-3 rounded-[6px] bg-raised px-3 py-2 text-[12px] text-muted">
                Add {money(freeThreshold - subtotal)} more for free delivery.
              </p>
            )}

            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-[13px] font-medium">Total</span>
              <span className="font-display text-2xl font-semibold tabular-nums text-ink">
                {money(total)}
              </span>
            </div>

            <Link href="/checkout" className="btn btn-primary btn-lg mt-6 w-full">
              Continue to checkout
            </Link>

            <p className="mt-3 text-center text-[11px] text-muted">
              Cash on delivery · no payment needed now
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
