import type { Metadata } from "next";
import { Catalog } from "@/components/Catalog";
import { getCategoryTree, listProducts } from "@/lib/queries";
import { STOREFRONT_PAGE_SIZE } from "@/lib/config";

export const metadata: Metadata = { title: "All products" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const sort = typeof sp.sort === "string" ? sp.sort : "newest";
  const page = Math.max(1, Number(sp.page) || 1);
  const tree = await getCategoryTree();
  const result = await listProducts({
    sort,
    page,
    perPage: STOREFRONT_PAGE_SIZE,
    status: "active",
  });

  return (
    <Catalog
      title="All products"
      description="Everything currently in the collection, newest first."
      crumbs={[{ label: "Home", href: "/" }, { label: "All products" }]}
      tree={tree}
      products={result.rows}
      total={result.total}
      basePath="/products"
      page={result.page}
      pages={result.pages}
      querySuffix={`sort=${sort}`}
    />
  );
}
