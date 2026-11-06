import Link from "next/link";
import type { CategoryNode, ProductWithCategory } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { SortSelect } from "./SortSelect";

type Crumb = { label: string; href?: string };

export function Catalog({
  title,
  description,
  crumbs,
  tree,
  products,
  total,
  activeSlug,
  basePath,
  page,
  pages,
  querySuffix = "",
}: {
  title: string;
  description?: string | null;
  crumbs: Crumb[];
  tree: CategoryNode[];
  products: ProductWithCategory[];
  total: number;
  activeSlug?: string;
  basePath: string;
  page: number;
  pages: number;
  querySuffix?: string;
}) {
  return (
    <>
      <div className="watercolor-band border-b border-line">
        <div className="mx-auto max-w-[1280px] px-5 py-10">
          <nav className="flex flex-wrap items-center gap-2 text-[12px] text-muted" aria-label="Breadcrumb">
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                {index > 0 && <span className="text-line-strong">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-ink">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-ink">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>

          <h1 className="mt-4 font-display text-[40px] font-semibold leading-none tracking-tight text-ink">
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-muted">{description}</p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-5 py-10">
        <div className="flex flex-col gap-10 lg:flex-row">
          <aside className="hidden w-[220px] shrink-0 lg:block">
            <div className="sticky top-[150px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Categories
              </p>
              <ul className="mt-3 space-y-1">
                <li>
                  <Link
                    href="/products"
                    className={`flex items-center justify-between rounded-[6px] px-2.5 py-2 text-[13px] transition-colors ${
                      !activeSlug ? "bg-brand-soft font-semibold text-brand-ink" : "text-ink-soft hover:bg-raised"
                    }`}
                  >
                    All products
                  </Link>
                </li>
                {tree.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/category/${cat.slug}`}
                      className={`flex items-center justify-between rounded-[6px] px-2.5 py-2 text-[13px] transition-colors ${
                        activeSlug === cat.slug
                          ? "bg-brand-soft font-semibold text-brand-ink"
                          : "text-ink-soft hover:bg-raised"
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className="text-[11px] text-muted">{cat.totalCount}</span>
                    </Link>
                    {cat.children.length > 0 && (
                      <ul className="mb-1 ml-3 border-l border-line pl-2">
                        {cat.children.map((child) => (
                          <li key={child.id}>
                            <Link
                              href={`/category/${child.slug}`}
                              className={`flex items-center justify-between rounded-[6px] px-2.5 py-1.5 text-[13px] transition-colors ${
                                activeSlug === child.slug
                                  ? "bg-brand-soft font-semibold text-brand-ink"
                                  : "text-muted hover:bg-raised hover:text-ink"
                              }`}
                            >
                              <span>{child.name}</span>
                              <span className="text-[11px]">{child.productCount}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <p className="text-[13px] text-muted">
                {total} {total === 1 ? "product" : "products"}
              </p>
              <SortSelect basePath={basePath} />
            </div>

            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center border border-dashed border-line-strong bg-raised px-6 py-20 text-center">
                <p className="font-display text-2xl text-ink">Nothing here yet</p>
                <p className="mt-2 max-w-[36ch] text-[13px] text-muted">
                  No products in this collection right now. Take a look at everything instead.
                </p>
                <Link href="/products" className="btn btn-secondary mt-6">
                  Browse all products
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {pages > 1 && (
              <nav className="mt-14 flex items-center justify-center gap-1" aria-label="Pagination">
                {Array.from({ length: pages }, (_, index) => index + 1).map((number) => {
                  const params = new URLSearchParams(querySuffix);
                  if (number > 1) params.set("page", String(number));
                  else params.delete("page");
                  const href = params.toString() ? `${basePath}?${params}` : basePath;
                  return (
                    <Link
                      key={number}
                      href={href}
                      aria-current={number === page ? "page" : undefined}
                      className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-[13px] font-medium transition-colors ${
                        number === page
                          ? "bg-brand text-white"
                          : "text-ink-soft hover:bg-raised"
                      }`}
                    >
                      {number}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
