import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoReceiptDownload } from "@/components/AutoReceiptDownload";
import { ClearCart } from "@/components/ClearCart";
import { getOrderByToken, getOrderItems } from "@/lib/queries";
import { formatDateTime, money, ORDER_STATUS_LABEL } from "@/lib/utils";

export const metadata: Metadata = { title: "Order placed" };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { token } = await params;
  const { placed } = await searchParams;

  const order = await getOrderByToken(token);
  if (!order) notFound();

  const items = await getOrderItems(order.id);

  return (
    <div className="mx-auto max-w-[760px] px-5 py-14">
      {placed === "1" && <ClearCart />}

      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m5 12 5 5L20 7" />
          </svg>
        </div>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Order {order.code}
        </p>
        <h1 className="mt-2 font-display text-[36px] font-semibold text-ink">
          Thank you — it is in.
        </h1>
        <p className="mx-auto mt-3 max-w-[46ch] text-[14px] leading-relaxed text-muted">
          We have your order and will call{" "}
          <span className="font-medium text-ink">{order.phone}</span> shortly to confirm the
          address and delivery time.
        </p>
      </div>

      <div className="mt-10 card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-raised px-5 py-3">
          <span className="text-[12px] text-muted">
            Placed {formatDateTime(order.created_at)}
          </span>
          <span className="pill bg-warning-soft text-warning">
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>

        <ul className="divide-y divide-line px-5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 py-3.5 text-[13px]">
              <div className="min-w-0">
                <p className="font-medium text-ink">{item.name}</p>
                <p className="text-[11px] text-muted">
                  {item.sku}
                  {item.color ? ` · ${item.color}` : ""}
                  {item.size ? ` · Size ${item.size}` : ""} · {item.qty} ×{" "}
                  {money(item.unit_price)}
                </p>
              </div>
              <span className="font-medium tabular-nums">{money(item.unit_price * item.qty)}</span>
            </li>
          ))}
        </ul>

        <dl className="space-y-2 border-t border-line px-5 py-4 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{money(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Delivery</dt>
            <dd className="tabular-nums">{order.shipping === 0 ? "Free" : money(order.shipping)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-2">
            <dt className="font-medium">Total to pay on delivery</dt>
            <dd className="font-display text-xl font-semibold tabular-nums">
              {money(order.total)}
            </dd>
          </div>
        </dl>
      </div>

      <AutoReceiptDownload
        token={order.public_token ?? token}
        code={order.code}
        auto={placed === "1"}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["1", "We call you", "Within a few hours during shop time to confirm."],
          ["2", "We pack and ship", "Courier picks it up the same or next day."],
          ["3", "You pay on arrival", "Cash to the courier. Inspect before you pay."],
        ].map(([step, title, body]) => (
          <div key={step} className="rounded-[6px] border border-line p-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white">
              {step}
            </span>
            <h3 className="mt-2 text-[13px] font-semibold text-ink">{title}</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-[6px] bg-raised px-5 py-4 text-[13px] leading-relaxed text-muted">
        <p className="font-medium text-ink">Delivering to</p>
        <p className="mt-1">
          {order.customer_name}
          <br />
          {order.address}
          {order.city ? `, ${order.city}` : ""}
          <br />
          {order.phone}
        </p>
        {order.note && <p className="mt-2 italic">“{order.note}”</p>}
        {(order.courier || order.tracking_id) && (
          <p className="mt-2">
            {order.courier ? `${order.courier} · ` : ""}
            Tracking: <span className="font-mono">{order.tracking_id ?? "—"}</span>
          </p>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link href="/products" className="btn btn-secondary">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
