import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetail } from "@/components/ProductDetail";
import {
  getProductBySlug,
  getProductColors,
  getRelatedProducts,
} from "@/lib/queries";
import { parseSizes } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return {
    title: product?.name ?? "Product",
    description: product?.description?.slice(0, 150),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product || product.status !== "active") notFound();

  const related = await getRelatedProducts(product.id, product.category_id, 4);
  const colors = await getProductColors(product.id);

  return (
    <>
      <div className="border-b border-line">
        <div className="mx-auto max-w-[1280px] px-5 py-4">
          <nav className="flex flex-wrap items-center gap-2 text-[12px] text-muted" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
            <span className="text-line-strong">/</span>
            {product.parent_slug && (
              <>
                <Link href={`/category/${product.parent_slug}`} className="hover:text-ink">
                  {product.parent_name}
                </Link>
                <span className="text-line-strong">/</span>
              </>
            )}
            <Link href={`/category/${product.category_slug}`} className="hover:text-ink">
              {product.category_name}
            </Link>
            <span className="text-line-strong">/</span>
            <span className="text-ink">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-5 py-10">
        <ProductDetail
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            description: product.description,
            price: product.price,
            compare_at_price: product.compare_at_price,
            image: product.image,
            stock: product.stock,
            low_stock_threshold: product.low_stock_threshold,
          }}
          categoryLabel={`${product.parent_name ? `${product.parent_name} · ` : ""}${product.category_name}`}
          sizes={parseSizes(product.sizes)}
          colors={colors.map((color) => ({
            id: color.id,
            name: color.name,
            image: color.image,
            stock: color.stock,
          }))}
        />

        {related.length > 0 && (
          <section className="mt-20 border-t border-line pt-12">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-display text-[28px] font-semibold text-ink">
                You may also like
              </h2>
              <Link
                href={`/category/${product.category_slug}`}
                className="text-[13px] text-muted link-underline hover:text-ink"
              >
                More in {product.category_name}
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
