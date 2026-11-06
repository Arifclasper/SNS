"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { placeOrder, type CheckoutState } from "@/app/(shop)/actions";
import { useCart } from "./CartProvider";
import { ProductArt } from "./ProductArt";
import { cartLineKey, money } from "@/lib/utils";

const initial: CheckoutState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
      {pending ? "Placing order…" : "Place order"}
    </button>
  );
}

function Field({
  label,
  name,
  error,
  ...props
}: {
  label: string;
  name: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        className="input"
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${name}-error`} className="mt-1 text-[12px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckoutForm({
  shippingFee,
  freeThreshold,
}: {
  shippingFee: number;
  freeThreshold: number;
}) {
  const [state, formAction] = useActionState(placeOrder, initial);
  const { lines, ready, subtotal } = useCart();

  if (ready && lines.length === 0) {
    return (
      <div className="mx-auto max-w-[560px] px-5 py-20 text-center">
        <h1 className="font-display text-3xl text-ink">Nothing to check out</h1>
        <p className="mt-2 text-[14px] text-muted">Add something to your cart first.</p>
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
      <nav className="flex items-center gap-2 text-[12px] text-muted">
        <Link href="/cart" className="hover:text-ink">
          Cart
        </Link>
        <span className="text-line-strong">/</span>
        <span className="text-ink">Checkout</span>
      </nav>

      <h1 className="mt-4 font-display text-[34px] font-semibold text-ink">Checkout</h1>
      <p className="mt-1 text-[13px] text-muted">
        No payment now. We call to confirm, then you pay the courier.
      </p>

      <form action={formAction} className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(
            lines.map((l) => ({
              productId: l.productId,
              qty: l.qty,
              size: l.size ?? null,
              colorId: l.colorId ?? null,
            })),
          )}
        />

        <div className="space-y-5">
          {state.error && (
            <div className="rounded-[6px] border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] text-danger">
              {state.error}
            </div>
          )}

          <div className="card p-6">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">
              Delivery details
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="Full name"
                name="customer_name"
                error={state.fields?.customer_name}
                placeholder="e.g. Nusrat Jahan"
                autoComplete="name"
                required
              />
              <Field
                label="Phone"
                name="phone"
                type="tel"
                error={state.fields?.phone}
                placeholder="01XXXXXXXXX"
                autoComplete="tel"
                required
              />
              <Field
                label="City / area"
                name="city"
                error={state.fields?.city}
                placeholder="e.g. Dhanmondi, Dhaka"
                autoComplete="address-level2"
                required
              />
              <div className="sm:col-span-2">
                <label htmlFor="address" className="label">
                  Delivery address
                </label>
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  className="input"
                  placeholder="House, road, landmark"
                  aria-invalid={state.fields?.address ? "true" : undefined}
                  required
                />
                {state.fields?.address && (
                  <p className="mt-1 text-[12px] text-danger">{state.fields.address}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="note" className="label">
                  Order note <span className="font-normal text-muted">(optional)</span>
                </label>
                <textarea
                  id="note"
                  name="note"
                  rows={2}
                  className="input"
                  placeholder="Anything we should know — delivery time, gift wrap…"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[6px] bg-raised px-4 py-3 text-[12px] leading-relaxed text-muted">
            By placing this order you agree to be contacted on the number above to confirm
            delivery details.
          </div>
        </div>

        <aside>
          <div className="card sticky top-[150px] p-6">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">
              Your order
            </h2>

            <ul className="mt-4 divide-y divide-line">
              {lines.map((line) => (
                <li
                  key={cartLineKey(line.productId, line.size, line.colorId)}
                  className="flex gap-3 py-3"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px] border border-line bg-raised">
                    <ProductArt name={line.name} image={line.image} />
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
                      {line.qty}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[12px] font-medium leading-snug text-ink">
                      {line.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {line.sku}
                      {line.color ? ` · ${line.color}` : ""}
                      {line.size ? ` · Size ${line.size}` : ""}
                    </p>
                  </div>
                  <span className="text-[12px] font-medium tabular-nums">
                    {money(line.price * line.qty)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-3 space-y-2 border-t border-line pt-3 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{money(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="tabular-nums">{shipping === 0 ? "Free" : money(shipping)}</dd>
              </div>
            </dl>

            <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-[13px] font-medium">Total</span>
              <span className="font-display text-2xl font-semibold tabular-nums">
                {money(total)}
              </span>
            </div>

            <div className="mt-5">
              <SubmitButton />
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
