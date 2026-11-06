import Link from "next/link";
import type { ProductWithCategory } from "@/lib/types";
import { discountPercent, money, stockState } from "@/lib/utils";
import { ProductArt } from "./ProductArt";

export function ProductCard({ product }: { product: ProductWithCategory }) {
  const off = discountPercent(product.price, product.compare_at_price);
  const stock = stockState(product.stock, product.low_stock_threshold);

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-[16px] border border-line bg-raised shadow-[0_22px_45px_-38px_rgba(92,58,74,0.55)]">
        <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.04]">
          <ProductArt name={product.name} image={product.image} />
        </div>

        {off !== null && (
          <span className="absolute left-3 top-3 rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            −{off}%
          </span>
        )}

        {stock === "out" && (
          <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-ink">
            Sold out
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-r from-[#d34079] to-[#b82a60] px-4 py-3 text-center transition-transform duration-200 ease-out group-hover:translate-y-0">
          <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white">
            View product
          </span>
        </div>
      </div>

      <div className="pt-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
          {product.parent_name ? `${product.parent_name} · ` : ""}
          {product.category_name}
        </p>
        <h3 className="mt-1 line-clamp-2 text-[14px] font-medium leading-snug text-ink">
          {product.name}
        </h3>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[14px] font-semibold text-ink">{money(product.price)}</span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-[12px] text-muted line-through">
              {money(product.compare_at_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
