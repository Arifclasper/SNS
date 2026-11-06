"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";
import { ProductArt } from "./ProductArt";
import { QuantityStepper } from "./QuantityStepper";
import { stockLabel } from "@/lib/utils";
import { MAX_QTY_PER_LINE } from "@/lib/config";

export type ColorChoice = {
  id: string;
  name: string;
  image: string | null;
  stock: number;
};

type Props = {
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    price: number;
    image: string | null;
    stock: number;
    low_stock_threshold: number;
    sizes: string[];
  };
  colors?: ColorChoice[];
  selectedColorId?: string | null;
  onColorChange?: (id: string) => void;
};

export function AddToCart({
  product,
  colors = [],
  selectedColorId = null,
  onColorChange,
}: Props) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [size, setSize] = useState<string | null>(
    product.sizes.length === 1 ? product.sizes[0] : null,
  );

  const selectedColor =
    colors.find((color) => color.id === selectedColorId) ?? colors[0] ?? null;
  const effectiveStock = selectedColor ? selectedColor.stock : product.stock;

  const out = effectiveStock <= 0;
  const max = Math.max(1, Math.min(effectiveStock, MAX_QTY_PER_LINE));
  const needsSize = product.sizes.length > 0;
  const needsColor = colors.length > 0;
  const canAdd = !out && (!needsSize || Boolean(size)) && (!needsColor || Boolean(selectedColor));

  function handleAdd() {
    if (!canAdd) return;
    add(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        price: product.price,
        image: selectedColor?.image || product.image,
        size: size ?? null,
        colorId: selectedColor?.id ?? null,
        color: selectedColor?.name ?? null,
      },
      qty,
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  }

  return (
    <div>
      <p
        className={`mb-3 flex items-center gap-2 text-[13px] font-medium ${
          out
            ? "text-danger"
            : effectiveStock <= product.low_stock_threshold
              ? "text-warning"
              : "text-success"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {out
          ? needsColor
            ? "Sold out in this colour"
            : "Out of stock"
          : stockLabel(effectiveStock, product.low_stock_threshold)}
      </p>

      {needsColor && (
        <div className="mb-5">
          <div className="flex items-baseline justify-between">
            <p className="text-[12px] font-semibold text-ink">Colour</p>
            {selectedColor && (
              <span className="text-[11px] text-muted">{selectedColor.name}</span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {colors.map((color) => {
              const active = selectedColor?.id === color.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => onColorChange?.(color.id)}
                  aria-pressed={active}
                  className={`flex items-center gap-2 rounded-[8px] border px-2 py-1.5 text-left transition ${
                    active
                      ? "border-brand bg-brand-soft"
                      : "border-line-strong bg-white hover:border-brand"
                  }`}
                >
                  <span className="h-9 w-9 shrink-0 overflow-hidden rounded-[5px] border border-line bg-raised">
                    <ProductArt name={color.name} image={color.image} />
                  </span>
                  <span className="flex flex-col">
                    <span
                      className={`text-[12px] font-medium ${
                        active ? "text-brand-ink" : "text-ink"
                      }`}
                    >
                      {color.name}
                    </span>
                    {color.stock <= 0 && (
                      <span className="text-[10px] text-muted">Sold out</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {needsSize && (
        <div className="mb-5">
          <div className="flex items-baseline justify-between">
            <p className="text-[12px] font-semibold text-ink">Size</p>
            {!size && <span className="text-[11px] text-muted">Choose one to continue</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.sizes.map((option) => {
              const active = size === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSize(option)}
                  aria-pressed={active}
                  className={`btn btn-sm min-w-[48px] ${
                    active
                      ? "border-brand bg-brand text-white"
                      : "border border-line-strong bg-white text-ink hover:border-brand hover:text-brand-ink"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-stretch gap-3">
        <QuantityStepper value={qty} onChange={setQty} max={max} />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="btn btn-primary h-10 flex-1 px-6"
        >
          {out
            ? needsColor
              ? "Sold out in this colour"
              : "Out of stock"
            : added
              ? "Added to cart ✓"
              : needsSize && !size
                ? "Select a size"
                : "Add to cart"}
        </button>
      </div>

      <p className="mt-3 text-[12px] text-muted">
        Cash on delivery · we call to confirm before dispatch
      </p>
    </div>
  );
}
