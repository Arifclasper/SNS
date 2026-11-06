import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadReceiptOnLoad } from "@/components/admin/DownloadReceiptOnLoad";
import { PageHeader } from "@/components/admin/PageHeader";
import { getOrderById, getOrderItems } from "@/lib/queries";
import { saveOrderTracking, updateOrderStatus } from "@/app/admin/actions";
import {
  formatDateTime,
  money,
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
} from "@/lib/utils";
import { COURIERS } from "@/lib/config";

export const metadata = { title: "Order" };

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string; saved?: string; print?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const order = await getOrderById(id);
  if (!order) notFound();

  const items = await getOrderItems(order.id);
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);

  const couriers = COURIERS;
  const courierOptions =
    order.courier && !couriers.includes(order.courier)
      ? [...couriers, order.courier]
      : couriers;

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/admin/orders" className="text-[12px] text-muted hover:text-ink">
          ← Orders
        </Link>
        <span className="text-[12px] text-line-strong">/</span>
        <span className="font-mono text-[12px] text-muted">{order.code}</span>
      </div>

      <PageHeader
        title={order.customer_name}
        description={`Placed ${formatDateTime(order.created_at)} · ${itemCount} ${
          itemCount === 1 ? "item" : "items"
        }`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/admin/orders/${encodeURIComponent(order.id)}/receipt?inline=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              Print receipt
            </a>
            <a
              href={`/api/admin/orders/${encodeURIComponent(order.id)}/receipt`}
              className="btn btn-secondary btn-sm"
              download={`${order.code}.pdf`}
            >
              Download receipt
            </a>
            <a href={`tel:${order.phone}`} className="btn btn-secondary btn-sm">
              Call {order.phone}
            </a>
          </div>
        }
      />

      {sp.updated && (
        <div className="mb-5 rounded-[6px] border border-success/25 bg-success-soft px-4 py-3 text-[13px] text-success">
          Order status updated.
        </div>
      )}
      <DownloadReceiptOnLoad
        href={`/api/admin/orders/${encodeURIComponent(order.id)}/receipt`}
        auto={sp.print === "1"}
      />

      {sp.saved && (
        <div className="mb-5 rounded-[6px] border border-success/25 bg-success-soft px-4 py-3 text-[13px] text-success">
          Delivery details saved. The receipt now includes the tracking ID.
        </div>
      )}
      {sp.error && (
        <div className="mb-5 rounded-[6px] border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
          {sp.error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="text-[13px] font-semibold text-ink">Items</h2>
              <span className={`pill ${ORDER_STATUS_STYLE[order.status]}`}>
                {ORDER_STATUS_LABEL[order.status]}
              </span>
            </div>

            <ul className="divide-y divide-line">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">{item.name}</p>
                    <p className="text-[11px] text-muted">
                      {item.sku}
                      {item.color ? ` · ${item.color}` : ""}
                      {item.size ? ` · Size ${item.size}` : ""} · {money(item.unit_price)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-[12px] text-muted">× {item.qty}</span>
                    <span className="w-20 text-right text-[13px] font-semibold tabular-nums">
                      {money(item.unit_price * item.qty)}
                    </span>
                  </div>
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
                <dd className="tabular-nums">
                  {order.shipping === 0 ? "Free" : money(order.shipping)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-2">
                <dt className="font-medium">Total</dt>
                <dd className="font-display text-xl font-semibold tabular-nums">
                  {money(order.total)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="text-[13px] font-semibold text-ink">Delivery details</h2>
            <div className="mt-3 grid gap-4 text-[13px] sm:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Name</p>
                <p className="mt-0.5 font-medium">{order.customer_name}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Phone</p>
                <p className="mt-0.5 font-medium">{order.phone}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Address</p>
                <p className="mt-0.5 font-medium">
                  {order.address}
                  {order.city ? `, ${order.city}` : ""}
                </p>
              </div>
              {order.note && (
                <div className="sm:col-span-2">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Note</p>
                  <p className="mt-1 rounded-[6px] bg-raised px-3 py-2 italic text-ink-soft">
                    “{order.note}”
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <section className="card p-5">
            <h2 className="text-[13px] font-semibold text-ink">Delivery tracking</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Saved on the order and added to the receipt PDF for the shipping label.
            </p>
            <form action={saveOrderTracking} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={order.id} />
              <div>
                <label htmlFor="courier" className="label">
                  Courier
                </label>
                <select
                  id="courier"
                  name="courier"
                  defaultValue={order.courier ?? ""}
                  className="input"
                >
                  <option value="">Not assigned</option>
                  {courierOptions.map((courier) => (
                    <option key={courier} value={courier}>
                      {courier}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tracking_id" className="label">
                  Third-party delivery / fast track ID
                </label>
                <input
                  id="tracking_id"
                  name="tracking_id"
                  defaultValue={order.tracking_id ?? ""}
                  className="input font-mono text-[13px]"
                  placeholder="e.g. PTH-778812"
                  maxLength={64}
                />
                <p className="mt-1 text-[11px] text-muted">
                  Leave blank until the parcel is handed to the courier.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" name="intent" value="save" className="btn btn-secondary btn-sm">
                  Save tracking
                </button>
                <button type="submit" name="intent" value="print" className="btn btn-primary btn-sm">
                  Save &amp; download receipt
                </button>
              </div>
            </form>
          </section>

          <section className="card p-5">
            <h2 className="text-[13px] font-semibold text-ink">Update status</h2>
            <form action={updateOrderStatus} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={order.id} />
              <select name="status" defaultValue={order.status} className="input">
                {ORDER_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {ORDER_STATUS_LABEL[value]}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary w-full">
                Save status
              </button>
            </form>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              Cancelling an order returns every item to stock automatically, and records it in
              the stock history.
            </p>
          </section>

          <section className="card p-5">
            <h2 className="text-[13px] font-semibold text-ink">What happens next</h2>
            <ol className="mt-3 space-y-2.5 text-[12px] text-muted">
              <li>1. Call the customer to confirm the address and time.</li>
              <li>2. Pack the items and mark the order as Confirmed.</li>
              <li>3. Hand it to the courier and mark it Shipped.</li>
              <li>4. Mark Delivered once it arrives and is paid.</li>
            </ol>
          </section>
        </aside>
      </div>
    </>
  );
}
