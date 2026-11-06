import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { getOrderCounts, listOrders } from "@/lib/queries";
import {
  formatDateTime,
  money,
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
} from "@/lib/utils";

export const metadata = { title: "Orders" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? "all";
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const counts = await getOrderCounts();
  const totalAll = Object.values(counts).reduce((a, b) => a + b, 0);
  const result = await listOrders({ status, q, page });

  const tabHref = (value: string) => {
    const params = new URLSearchParams();
    if (value !== "all") params.set("status", value);
    if (q) params.set("q", q);
    return `/admin/orders${params.toString() ? `?${params}` : ""}`;
  };

  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (q) params.set("q", q);
    if (n > 1) params.set("page", String(n));
    return `/admin/orders${params.toString() ? `?${params}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Orders"
        description="Orders placed in the storefront. Call the customer to confirm, then move the status along."
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Link
          href={tabHref("all")}
          className={`rounded-[6px] px-3 py-1.5 text-[12px] font-medium ${
            status === "all" ? "bg-ink text-white" : "text-ink-soft hover:bg-raised"
          }`}
        >
          All <span className="opacity-60">{totalAll}</span>
        </Link>
        {ORDER_STATUSES.map((value) => (
          <Link
            key={value}
            href={tabHref(value)}
            className={`rounded-[6px] px-3 py-1.5 text-[12px] font-medium ${
              status === value ? "bg-ink text-white" : "text-ink-soft hover:bg-raised"
            }`}
          >
            {ORDER_STATUS_LABEL[value]} <span className="opacity-60">{counts[value] ?? 0}</span>
          </Link>
        ))}

        <form className="ml-auto flex items-center gap-2" action="/admin/orders">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            className="input h-8 w-[210px] text-[12px]"
            placeholder="Name, phone or code…"
          />
          <button type="submit" className="btn btn-secondary btn-sm h-8">
            Search
          </button>
        </form>
      </div>

      <div className="card overflow-hidden">
        {result.rows.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="font-display text-xl text-ink">No orders here</p>
            <p className="mt-1 text-[12px] text-muted">
              {q || status !== "all"
                ? "Try a different filter."
                : "When a customer places an order it will appear in this list."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[880px]">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th className="text-center">Items</th>
                  <th className="text-right">Total</th>
                  <th>Status</th>
                  <th className="text-right">Placed</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono text-[12px] font-medium text-ink hover:text-brand"
                      >
                        {order.code}
                      </Link>
                    </td>
                    <td>
                      <p className="text-[13px] font-medium text-ink">{order.customer_name}</p>
                      <p className="text-[11px] text-muted">{order.phone}</p>
                    </td>
                    <td className="text-center text-[12px] tabular-nums">
                      {(order as unknown as { item_count: number }).item_count}
                    </td>
                    <td className="text-right text-[13px] font-semibold tabular-nums">
                      {money(order.total)}
                    </td>
                    <td>
                      <span className={`pill ${ORDER_STATUS_STYLE[order.status]}`}>
                        {ORDER_STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className="text-right text-[11px] text-muted">
                      {formatDateTime(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {result.pages > 1 && (
        <nav className="mt-5 flex items-center justify-between" aria-label="Pagination">
          <p className="text-[12px] text-muted">
            Page {result.page} of {result.pages}
          </p>
          <div className="flex items-center gap-1">
            {Array.from({ length: result.pages }, (_, index) => index + 1).map((n) => (
              <Link
                key={n}
                href={pageHref(n)}
                aria-current={n === result.page ? "page" : undefined}
                className={`flex h-8 min-w-8 items-center justify-center rounded-[6px] px-2 text-[12px] font-medium ${
                  n === result.page ? "bg-ink text-white" : "text-ink-soft hover:bg-raised"
                }`}
              >
                {n}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
