import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductArt } from "@/components/ProductArt";
import { StockPill, StatusPill } from "@/components/Pills";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { getCategories, listProducts } from "@/lib/queries";
import { deleteProduct } from "@/app/admin/actions";
import { money } from "@/lib/utils";
import { ADMIN_PRODUCTS_PAGE_SIZE } from "@/lib/config";

export const metadata = { title: "Products" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    stock?: string;
    status?: string;
    sort?: string;
    page?: string;
    saved?: string;
    deleted?: string;
  }>;
}) {
  const sp = await searchParams;
  const categoryId = sp.category?.trim() || null;
  const stock = (sp.stock as "in" | "low" | "out" | "") ?? "";
  const status = sp.status ?? "all";
  const sort = sp.sort ?? "newest";
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim() ?? "";

  const categories = await getCategories();
  // A top-level category filter includes its subcategories (products live on
  // subcategories), while a subcategory filter stays exact.
  const categoryIds = categoryId
    ? [
        categoryId,
        ...categories.filter((c) => c.parent_id === categoryId).map((c) => c.id),
      ]
    : undefined;

  const result = await listProducts({
    q,
    categoryId: categoryId || null,
    categoryIds,
    stock,
    status,
    sort,
    page,
    perPage: ADMIN_PRODUCTS_PAGE_SIZE,
  });

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (categoryId) baseParams.set("category", String(categoryId));
  if (stock) baseParams.set("stock", stock);
  if (status !== "all") baseParams.set("status", status);
  if (sort !== "newest") baseParams.set("sort", sort);

  const pageHref = (n: number) => {
    const params = new URLSearchParams(baseParams.toString());
    if (n > 1) params.set("page", String(n));
    return `/admin/products${params.toString() ? `?${params}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Products"
        description={`${result.total} ${result.total === 1 ? "product" : "products"} in the catalogue.`}
        action={
          <Link href="/admin/products/new" className="btn btn-primary btn-sm">
            + New product
          </Link>
        }
      />

      {sp.saved && (
        <div className="mb-5 rounded-[6px] border border-success/25 bg-success-soft px-4 py-3 text-[13px] text-success">
          Product saved.
        </div>
      )}
      {sp.deleted && (
        <div className="mb-5 rounded-[6px] border border-success/25 bg-success-soft px-4 py-3 text-[13px] text-success">
          Product deleted.
        </div>
      )}

      <form className="card mb-5 flex flex-wrap items-end gap-3 p-4" action="/admin/products">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="q" className="label">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            className="input"
            placeholder="Name or SKU…"
          />
        </div>

        <div className="w-[180px]">
          <label htmlFor="category" className="label">
            Category
          </label>
          <select id="category" name="category" defaultValue={categoryId ?? ""} className="input">
            <option value="">All categories</option>
            {categories
              .filter((c) => c.parent_id === null)
              .map((root) => (
                <optgroup key={root.id} label={root.name}>
                  <option value={root.id}>— {root.name} (all)</option>
                  {categories
                    .filter((c) => c.parent_id === root.id)
                    .map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.name}
                      </option>
                    ))}
                </optgroup>
              ))}
          </select>
        </div>

        <div className="w-[150px]">
          <label htmlFor="stock" className="label">
            Stock
          </label>
          <select id="stock" name="stock" defaultValue={stock} className="input">
            <option value="">Any</option>
            <option value="in">In stock</option>
            <option value="low">Low</option>
            <option value="out">Out of stock</option>
          </select>
        </div>

        <div className="w-[130px]">
          <label htmlFor="status" className="label">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className="input">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="w-[160px]">
          <label htmlFor="sort" className="label">
            Sort
          </label>
          <select id="sort" name="sort" defaultValue={sort} className="input">
            <option value="newest">Newest</option>
            <option value="name-asc">Name A–Z</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
            <option value="stock-asc">Stock ↑</option>
          </select>
        </div>

        <button type="submit" className="btn btn-secondary">
          Filter
        </button>
        {(q || categoryId || stock || status !== "all" || sort !== "newest") && (
          <Link href="/admin/products" className="btn btn-ghost">
            Reset
          </Link>
        )}
      </form>

      <div className="card overflow-hidden">
        {result.rows.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="font-display text-xl text-ink">No products match</p>
            <p className="mt-1 text-[12px] text-muted">
              Try clearing the filters, or add a new product.
            </p>
            <Link href="/admin/products/new" className="btn btn-primary btn-sm mt-5">
              + New product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[860px]">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th className="text-right">Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden bg-raised">
                          <ProductArt name={product.name} image={product.image} />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="block max-w-[280px] truncate font-medium text-ink hover:text-brand"
                          >
                            {product.name}
                          </Link>
                          <p className="text-[11px] text-muted">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-[12px] text-muted">
                        {product.parent_name ? `${product.parent_name} · ` : ""}
                        {product.category_name}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="font-medium tabular-nums">{money(product.price)}</span>
                      {product.compare_at_price && product.compare_at_price > product.price && (
                        <span className="ml-1 text-[11px] text-muted line-through">
                          {money(product.compare_at_price)}
                        </span>
                      )}
                    </td>
                    <td>
                      <StockPill stock={product.stock} threshold={product.low_stock_threshold} />
                    </td>
                    <td>
                      <StatusPill status={product.status} />
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="btn btn-ghost btn-sm"
                        >
                          Edit
                        </Link>
                        <form action={deleteProduct}>
                          <input type="hidden" name="id" value={product.id} />
                          <ConfirmButton
                            message={`Delete “${product.name}”? This cannot be undone.`}
                            className="btn btn-ghost btn-sm text-danger hover:bg-danger-soft"
                          >
                            Delete
                          </ConfirmButton>
                        </form>
                      </div>
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
