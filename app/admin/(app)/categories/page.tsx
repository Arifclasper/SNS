import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { getCategoryTree } from "@/lib/queries";
import { deleteCategory, moveCategory, toggleCategory } from "@/app/admin/actions";
import type { Category, CategoryNode } from "@/lib/types";

export const metadata = { title: "Categories" };

function Row({
  node,
  roots,
  isChild,
  index,
  total,
}: {
  node: CategoryNode;
  roots: Category[];
  isChild?: boolean;
  index: number;
  total: number;
}) {
  return (
    <details className="group border-b border-line last:border-b-0">
      <summary
        className={`flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 transition-colors hover:bg-raised [&::-webkit-details-marker]:hidden ${
          isChild ? "pl-10" : ""
        }`}
      >
        {isChild && <span className="text-line-strong">└</span>}
        <span className="flex-1 truncate text-[13px] font-medium text-ink">{node.name}</span>
        <span className="text-[11px] text-muted">
          {node.productCount} {node.productCount === 1 ? "product" : "products"}
        </span>
        {node.is_active === 0 && <span className="pill bg-sunken text-muted">Hidden</span>}
        <span className="text-[11px] text-muted group-open:text-ink">Edit</span>
        <span className="text-[10px] text-muted transition-transform group-open:rotate-180">▾</span>
      </summary>

      <div className="border-t border-line bg-raised px-4 py-4">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
          <CategoryForm category={node} roots={roots} />

          <div className="flex flex-wrap items-start gap-2 lg:flex-col lg:items-stretch">
            <Link
              href={`/admin/products?category=${node.id}`}
              className="btn btn-secondary btn-sm"
            >
              View products
            </Link>

            <div className="flex gap-2">
              <form action={moveCategory}>
                <input type="hidden" name="id" value={node.id} />
                <input type="hidden" name="direction" value="up" />
                <button
                  type="submit"
                  className="btn btn-secondary btn-sm px-2.5"
                  disabled={index === 0}
                  aria-label="Move up"
                >
                  ↑
                </button>
              </form>
              <form action={moveCategory}>
                <input type="hidden" name="id" value={node.id} />
                <input type="hidden" name="direction" value="down" />
                <button
                  type="submit"
                  className="btn btn-secondary btn-sm px-2.5"
                  disabled={index === total - 1}
                  aria-label="Move down"
                >
                  ↓
                </button>
              </form>
            </div>

            <form action={toggleCategory}>
              <input type="hidden" name="id" value={node.id} />
              <input type="hidden" name="next" value={node.is_active ? "0" : "1"} />
              <button type="submit" className="btn btn-secondary btn-sm w-full">
                {node.is_active ? "Hide from store" : "Show in store"}
              </button>
            </form>

            <form action={deleteCategory}>
              <input type="hidden" name="id" value={node.id} />
              <ConfirmButton
                message={`Delete “${node.name}”? This cannot be undone.`}
                className="btn btn-sm w-full border border-danger/30 bg-white text-danger hover:bg-danger-soft"
              >
                Delete
              </ConfirmButton>
            </form>
          </div>
        </div>

        {node.children.length > 0 && (
          <div className="mt-4 rounded-[6px] border border-line bg-surface">
            <p className="border-b border-line px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Subcategories
            </p>
            {node.children.map((child, childIndex) => (
              <Row
                key={child.id}
                node={{ ...child, children: [] }}
                roots={roots}
                isChild
                index={childIndex}
                total={node.children.length}
              />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const tree = await getCategoryTree(true);
  const roots = tree.map((node) => ({
    id: node.id,
    name: node.name,
    slug: node.slug,
    parent_id: node.parent_id,
    position: node.position,
    is_active: node.is_active,
    created_at: node.created_at,
  })) as Category[];

  return (
    <>
      <PageHeader
        title="Categories"
        description="Two levels: a category, and the subcategories under it. This order is what customers see."
        action={
          <a href="#new-category" className="btn btn-primary btn-sm">
            + New category
          </a>
        }
      />

      {sp.error && (
        <div className="mb-5 rounded-[6px] border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
          {sp.error}
        </div>
      )}
      {(sp.saved || sp.deleted) && (
        <div className="mb-5 rounded-[6px] border border-success/25 bg-success-soft px-4 py-3 text-[13px] text-success">
          {sp.deleted ? "Category deleted." : "Category saved."}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[13px] font-semibold text-ink">Store structure</h2>
            <span className="text-[11px] text-muted">
              {tree.length} top-level · {tree.reduce((n, c) => n + c.children.length, 0)} sub
            </span>
          </div>

          {tree.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="font-display text-xl text-ink">No categories yet</p>
              <p className="mt-1 text-[12px] text-muted">
                Create your first category with the form on the right.
              </p>
            </div>
          ) : (
            tree.map((node, index) => (
              <Row
                key={node.id}
                node={node}
                roots={roots}
                index={index}
                total={tree.length}
              />
            ))
          )}
        </section>

        <aside className="xl:sticky xl:top-20 xl:self-start">
          <div id="new-category" className="card p-5">
            <h2 className="text-[13px] font-semibold text-ink">Add a category</h2>
            <p className="mt-1 mb-4 text-[12px] text-muted">
              Leave the parent as “Top level” to create a main category.
            </p>
            <CategoryForm roots={roots} />
          </div>

          <div className="mt-4 rounded-[6px] bg-sunken px-4 py-3 text-[12px] leading-relaxed text-muted">
            <p className="font-medium text-ink-soft">How ordering works</p>
            <p className="mt-1">
              Use ↑ ↓ inside a category to change where it appears in the storefront menu and
              sidebar.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
