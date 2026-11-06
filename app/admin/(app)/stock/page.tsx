import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductArt } from "@/components/ProductArt";
import { StockPill } from "@/components/Pills";
import { getColorsForProducts, getRecentStockMoves, listProducts } from "@/lib/queries";
import { adjustStock } from "@/app/admin/actions";
import { formatDateTime } from "@/lib/utils";
import type { ProductColor } from "@/lib/types";
import { ADMIN_STOCK_PAGE_SIZE } from "@/lib/config";

export const metadata = { title: "Stock" };

const REASONS = [
  { value: "received", label: "Received" },
  { value: "correction", label: "Correction" },
  { value: "damaged", label: "Damaged" },
  { value: "return", label: "Return" },
];

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    stock?: string;
    page?: string;
    adjusted?: string;
    error?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const stock = (sp.stock as "in" | "low" | "out" | "") ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const result = await listProducts({
    q,
    stock,
    page,
    perPage: ADMIN_STOCK_PAGE_SIZE,
    sort: "stock-asc",
  });
  const recent = await getRecentStockMoves(12);

  const colorRows = await getColorsForProducts(result.rows.map((product) => product.id));
  const colorsByProduct = new Map<string, ProductColor[]>();
  for (const color of colorRows) {
    const list = colorsByProduct.get(color.product_id) ?? [];
    list.push(color);
    colorsByProduct.set(color.product_id, list);
  }

  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (stock) params.set("stock", stock);
    if (n > 1) params.set("page", String(n));
    return `/admin/stock${params.toString() ? `?${params}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Stock"
        description="Every change is logged. Use a positive number to receive, negative to remove."
      />

      {sp.adjusted && (
        <div className="mb-5 rounded-[6px] border border-success/25 bg-success-soft px-4 py-3 text-[13px] text-success">
          Stock updated for “{sp.adjusted}”.
        </div>
      )}
      {sp.error && (
        <div className="mb-5 rounded-[6px] border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
          {sp.error}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <form className="flex flex-wrap items-center gap-2" action="/admin/stock">
          <input
            name="q"
            defaultValue={q}
            className="input h-9 w-[240px]"
            placeholder="Search name or SKU…"
          />
          <select name="stock" defaultValue={stock} className="input h-9 w-[150px]">
            <option value="">Any stock</option>
            <option value="out">Out of stock</option>
            <option value="low">Low stock</option>
            <option value="in">Healthy</option>
          </select>
          <button type="submit" className="btn btn-secondary btn-sm h-9">
            Filter
          </button>
          {(q || stock) && (
            <Link href="/admin/stock" className="text-[12px] text-muted hover:text-ink">
              Reset
            </Link>
          )}
        </form>

        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span className="pill bg-danger-soft text-danger">Out</span>
          <span className="pill bg-warning-soft text-warning">Low</span>
          <span className="pill bg-success-soft text-success">In</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[920px]">
            <thead>
              <tr>
                <th>Product</th>
                <th className="text-right">On hand</th>
                <th>Status</th>
                <th>Adjust</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((product) => {
                const colors = colorsByProduct.get(product.id) ?? [];
                return (
                <tr key={product.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 overflow-hidden bg-raised">
                        <ProductArt name={product.name} image={product.image} />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="block max-w-[240px] truncate text-[13px] font-medium text-ink hover:text-brand"
                        >
                          {product.name}
                        </Link>
                        <p className="text-[11px] text-muted">
                          {product.sku} · threshold {product.low_stock_threshold}
                        </p>
                        {colors.length > 0 && (
                          <p className="mt-0.5 max-w-[280px] truncate text-[11px] text-muted">
                            {colors
                              .map((color) => `${color.name} ${color.stock}`)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-right">
                    <span className="text-[15px] font-semibold tabular-nums">
                      {product.stock}
                    </span>
                  </td>
                  <td>
                    <StockPill stock={product.stock} threshold={product.low_stock_threshold} stockOnly />
                  </td>
                  <td>
                    <form action={adjustStock} className="flex flex-wrap items-center gap-1.5">
                      <input type="hidden" name="product_id" value={product.id} />
                      {colors.length > 0 && (
                        <select
                          name="color_id"
                          className="input h-8 w-[118px] px-1 text-[12px]"
                          aria-label={`Colour for ${product.name}`}
                          defaultValue={String(colors[0].id)}
                          required
                        >
                          {colors.map((color) => (
                            <option key={color.id} value={color.id}>
                              {color.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        name="delta"
                        type="number"
                        step="1"
                        className="input h-8 w-[74px] px-2 text-[12px] tabular-nums"
                        placeholder="+10"
                        aria-label={`Quantity change for ${product.name}`}
                        required
                      />
                      <select
                        name="reason"
                        className="input h-8 w-[112px] px-1 text-[12px]"
                        aria-label="Reason"
                        defaultValue="received"
                      >
                        {REASONS.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                      <input
                        name="note"
                        className="input h-8 w-[130px] px-2 text-[12px]"
                        placeholder="Note"
                        aria-label="Note"
                      />
                      <button type="submit" className="btn btn-secondary btn-sm h-8">
                        Apply
                      </button>
                    </form>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {result.rows.length === 0 && (
          <div className="px-5 py-16 text-center">
            <p className="font-display text-xl text-ink">No products match</p>
            <p className="mt-1 text-[12px] text-muted">Try a different search or filter.</p>
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

      <section className="card mt-8 overflow-hidden">
        <div className="border-b border-line px-5 py-3.5">
          <h2 className="text-[13px] font-semibold text-ink">Recent adjustments</h2>
        </div>
        <ul className="divide-y divide-line">
          {recent.length === 0 && (
            <li className="px-5 py-10 text-center text-[12px] text-muted">
              No stock movements yet.
            </li>
          )}
          {recent.map((move) => (
            <li key={move.id} className="flex items-center gap-3 px-5 py-2.5">
              <span
                className={`w-12 text-right text-[12px] font-semibold tabular-nums ${
                  move.delta > 0 ? "text-success" : "text-danger"
                }`}
              >
                {move.delta > 0 ? `+${move.delta}` : move.delta}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-ink">{move.product_name}</p>
                <p className="text-[11px] text-muted">
                  {move.reason}
                  {move.color ? ` · ${move.color}` : ""}
                  {move.note ? ` · ${move.note}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-muted">
                {formatDateTime(move.created_at)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
