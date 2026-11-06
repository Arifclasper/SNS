import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm } from "@/components/admin/ProductForm";
import { getCategories } from "@/lib/queries";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const categories = (await getCategories()).map((c) => ({
    id: c.id,
    name: c.name,
    parent_id: c.parent_id,
  }));

  return (
    <>
      <div className="mb-4">
        <Link href="/admin/products" className="text-[12px] text-muted hover:text-ink">
          ← Products
        </Link>
      </div>
      <PageHeader title="New product" description="It goes live in the store as soon as it is active." />
      <ProductForm categories={categories} />
    </>
  );
}
