import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm } from "@/components/admin/ProductForm";
import { getCategories, getProductById, getProductColors } from "@/lib/queries";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const colors = await getProductColors(product.id);

  const categories = (await getCategories()).map((c) => ({
    id: c.id,
    name: c.name,
    parent_id: c.parent_id,
  }));

  const plain = { ...product };

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/admin/products" className="text-[12px] text-muted hover:text-ink">
          ← Products
        </Link>
        <span className="text-[12px] text-line-strong">/</span>
        <span className="text-[12px] text-muted">{product.sku}</span>
      </div>
      <PageHeader
        title={product.name}
        description="Editing this product updates the storefront immediately."
        action={
          <Link
            href={`/product/${product.slug}`}
            target="_blank"
            className="btn btn-secondary btn-sm"
          >
            View in store ↗
          </Link>
        }
      />
      <ProductForm product={plain} initialColors={colors} categories={categories} />
    </>
  );
}
