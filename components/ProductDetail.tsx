"use client";

import { useState } from "react";
import { AddToCart, type ColorChoice } from "./AddToCart";
import { ProductArt } from "./ProductArt";
import { discountPercent, money } from "@/lib/utils";

type DetailProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  image: string | null;
  stock: number;
  low_stock_threshold: number;
};

export function ProductDetail({
  product,
  categoryLabel,
  sizes,
  colors,
}: {
  product: DetailProduct;
  categoryLabel: string;
  sizes: string[];
  colors: ColorChoice[];
}) {
  const [selectedColorId, setSelectedColorId] = useState<string | null>(
    colors[0]?.id ?? null,
  );

  const selectedColor = colors.find((color) => color.id === selectedColorId) ?? colors[0] ?? null;
  const displayImage = selectedColor?.image || product.image;
  const off = discountPercent(product.price, product.compare_at_price);

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] border border-line bg-raised shadow-[0_30px_70px_-46px_rgba(92,58,74,0.6)]">
        <ProductArt name={product.name} image={displayImage} />
        {off !== null && (
          <span className="absolute left-4 top-4 rounded-full bg-brand px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm">
            −{off}% today
          </span>
        )}
        {product.stock <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
            <span className="rounded-full border border-brand bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-brand">
              Sold out
            </span>
          </div>
        )}
      </div>

      <div className="lg:pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {categoryLabel}
        </p>

        <h1 className="mt-3 font-display text-[38px] font-semibold leading-[1.05] tracking-tight text-ink">
          {product.name}
        </h1>

        <div className="mt-5 flex flex-wrap items-baseline gap-3">
          <span className="font-display text-[30px] font-semibold text-ink">
            {money(product.price)}
          </span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <>
              <span className="text-[15px] text-muted line-through">
                {money(product.compare_at_price)}
              </span>
              <span className="pill bg-brand-soft text-brand-ink">
                Save {money(product.compare_at_price - product.price)}
              </span>
            </>
          )}
        </div>

        <p className="mt-6 max-w-[52ch] text-[14px] leading-relaxed text-ink-soft">
          {product.description}
        </p>

        <div className="mt-8 border-t border-line pt-6">
          <AddToCart
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              sku: product.sku,
              price: product.price,
              image: displayImage,
              stock: product.stock,
              low_stock_threshold: product.low_stock_threshold,
              sizes,
            }}
            colors={colors}
            selectedColorId={selectedColor?.id ?? null}
            onColorChange={setSelectedColorId}
          />
        </div>

        <dl className="mt-8 grid gap-4 border-t border-line pt-6 text-[13px] sm:grid-cols-2">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.1em] text-muted">SKU</dt>
            <dd className="mt-0.5 font-medium">{product.sku}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.1em] text-muted">Delivery</dt>
            <dd className="mt-0.5 font-medium">2–4 working days</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.1em] text-muted">Payment</dt>
            <dd className="mt-0.5 font-medium">Cash on delivery</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.1em] text-muted">Exchange</dt>
            <dd className="mt-0.5 font-medium">7 days</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
