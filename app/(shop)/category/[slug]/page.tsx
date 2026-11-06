import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Catalog } from "@/components/Catalog";
import {
  getCategoryBySlug,
  getCategoryIdsForSlug,
  getCategoryTree,
  listProducts,
} from "@/lib/queries";
import { STOREFRONT_PAGE_SIZE } from "@/lib/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  return { title: category ? category.name : "Category" };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category || !category.is_active) notFound();

  const tree = await getCategoryTree();
  const parent = category.parent_id
    ? tree.find((root) => root.id === category.parent_id)
    : null;

  const sort = typeof sp.sort === "string" ? sp.sort : "newest";
  const page = Math.max(1, Number(sp.page) || 1);
  const ids = await getCategoryIdsForSlug(slug);
  const result = await listProducts({
    categoryIds: ids,
    sort,
    page,
    perPage: STOREFRONT_PAGE_SIZE,
    status: "active",
  });

  const crumbs: { label: string; href?: string }[] = [{ label: "Home", href: "/" }];
  if (parent) crumbs.push({ label: parent.name, href: `/category/${parent.slug}` });
  crumbs.push({ label: category.name });

  return (
    <Catalog
      title={category.name}
      description={
        result.total > 0
          ? `${result.total} ${result.total === 1 ? "piece" : "pieces"} in ${category.name.toLowerCase()}.`
          : "This collection is being restocked."
      }
      crumbs={crumbs}
      tree={tree}
      products={result.rows}
      total={result.total}
      activeSlug={category.slug}
      basePath={`/category/${category.slug}`}
      page={result.page}
      pages={result.pages}
      querySuffix={`sort=${sort}`}
    />
  );
}
