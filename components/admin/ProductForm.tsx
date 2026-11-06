"use client";

import Link from "next/link";
import { Fragment, useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveProduct, type AdminState } from "@/app/admin/actions";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { ProductArt } from "@/components/ProductArt";
import {
  cleanColorName,
  colorNameFromFilename,
  MAX_COLORS,
  MAX_COLOR_NAME_LENGTH,
  normalizeSizes,
  parseSizes,
} from "@/lib/utils";
import { IMAGE_ACCEPT, uploadImageFile } from "@/lib/upload-image";
import type { Product, ProductColor } from "@/lib/types";

type CategoryOption = { id: string; name: string; parent_id: string | null };

type ColorDraft = {
  id?: string;
  name: string;
  image: string;
  stock: string;
};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Saving…" : "Save product"}
    </button>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[12px] text-danger">{message}</p>;
}

export function ProductForm({
  product,
  initialColors = [],
  categories,
}: {
  product?: Product | null;
  initialColors?: ProductColor[];
  categories: CategoryOption[];
}) {
  const [state, formAction] = useActionState<AdminState, FormData>(saveProduct, {});
  const [name, setName] = useState(product?.name ?? "");
  const [image, setImage] = useState(product?.image ?? "");
  const [sizes, setSizes] = useState<string[]>(() => parseSizes(product?.sizes));
  const [colors, setColors] = useState<ColorDraft[]>(() =>
    initialColors.map((color) => ({
      id: color.id,
      name: color.name,
      image: color.image ?? "",
      stock: String(color.stock),
    })),
  );

  const bulkInputRef = useRef<HTMLInputElement>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [bulkError, setBulkError] = useState("");

  const roots = categories.filter((c) => c.parent_id === null);
  const cleanSizes = normalizeSizes(sizes);
  const cleanColors = colors
    .map((color) => ({
      id: color.id,
      name: cleanColorName(color.name),
      image: color.image.trim(),
      stock: Math.max(0, Math.trunc(Number(color.stock) || 0)),
    }))
    .filter((color) => color.name);
  const totalColorStock = cleanColors.reduce((sum, color) => sum + color.stock, 0);

  function addSize() {
    setSizes((current) => [...current, ""]);
  }

  function updateSize(index: number, value: string) {
    setSizes((current) => current.map((size, i) => (i === index ? value : size)));
  }

  function removeSize(index: number) {
    setSizes((current) => current.filter((_, i) => i !== index));
  }

  function addColor() {
    if (colors.length >= MAX_COLORS) {
      setBulkError(`A product can have at most ${MAX_COLORS} colours.`);
      return;
    }
    setBulkError("");
    setColors((current) => [...current, { name: "", image: "", stock: "0" }]);
  }

  function updateColor(index: number, patch: Partial<ColorDraft>) {
    setColors((current) => current.map((color, i) => (i === index ? { ...color, ...patch } : color)));
  }

  function removeColor(index: number) {
    setColors((current) => current.filter((_, i) => i !== index));
  }

  function moveColor(index: number, direction: -1 | 1) {
    setColors((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function addColorsFromPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;

    setBulkError("");
    const room = MAX_COLORS - colors.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (picked.length < files.length) {
      setBulkError(`Only ${MAX_COLORS} colours can be added to one product.`);
    }
    if (picked.length === 0) {
      if (bulkInputRef.current) bulkInputRef.current.value = "";
      return;
    }

    setBulkBusy(true);
    setBulkProgress({ done: 0, total: picked.length });

    const failures: string[] = [];
    let done = 0;

    for (const file of picked) {
      try {
        const uploaded = await uploadImageFile(file);
        setColors((current) => [
          ...current,
          {
            name: colorNameFromFilename(file.name),
            image: uploaded.url,
            stock: "0",
          },
        ]);
      } catch (uploadError) {
        failures.push(
          `${file.name}: ${uploadError instanceof Error ? uploadError.message : "upload failed"}`,
        );
      }
      done += 1;
      setBulkProgress({ done, total: picked.length });
    }

    if (failures.length > 0) {
      setBulkError(failures.slice(0, 2).join(" "));
    }
    setBulkBusy(false);
    if (bulkInputRef.current) bulkInputRef.current.value = "";
  }

  return (
    <form action={formAction} className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="colors" value={JSON.stringify(cleanColors)} />

      <div className="space-y-6">
        {state.error && (
          <div className="rounded-[6px] border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
            {state.error}
          </div>
        )}

        <section className="card p-5">
          <h2 className="text-[13px] font-semibold text-ink">Basics</h2>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="name" className="label">
                Product name
              </label>
              <input
                id="name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="input"
                placeholder="e.g. Aurora Chronograph"
                aria-invalid={state.fields?.name ? "true" : undefined}
                required
              />
              <ErrorText message={state.fields?.name} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sku" className="label">
                  SKU
                </label>
                <input
                  id="sku"
                  name="sku"
                  defaultValue={product?.sku ?? ""}
                  className="input font-mono text-[13px]"
                  placeholder="SNS-W-101"
                  aria-invalid={state.fields?.sku ? "true" : undefined}
                  required
                />
                <ErrorText message={state.fields?.sku} />
              </div>
              <div>
                <label htmlFor="category_id" className="label">
                  Category
                </label>
                <select
                  id="category_id"
                  name="category_id"
                  defaultValue={product?.category_id ? String(product.category_id) : ""}
                  className="input"
                  aria-invalid={state.fields?.category_id ? "true" : undefined}
                  required
                >
                  <option value="">Choose…</option>
                  {roots.map((root) => (
                    <Fragment key={root.id}>
                      <option value={root.id}>{root.name}</option>
                      {categories
                        .filter((c) => c.parent_id === root.id)
                        .map((child) => (
                          <option key={child.id} value={child.id}>
                            &nbsp;&nbsp;— {child.name}
                          </option>
                        ))}
                    </Fragment>
                  ))}
                </select>
                <ErrorText message={state.fields?.category_id} />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={5}
                defaultValue={product?.description ?? ""}
                className="input"
                placeholder="A short, honest description. What it is, what it is made of, why it lasts."
              />
            </div>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-[13px] font-semibold text-ink">Pricing</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="price" className="label">
                Price (৳)
              </label>
              <input
                id="price"
                name="price"
                type="number"
                min="1"
                step="1"
                defaultValue={product?.price ?? ""}
                className="input tabular-nums"
                placeholder="1690"
                aria-invalid={state.fields?.price ? "true" : undefined}
                required
              />
              <ErrorText message={state.fields?.price} />
            </div>
            <div>
              <label htmlFor="compare_at_price" className="label">
                Compare-at price <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="compare_at_price"
                name="compare_at_price"
                type="number"
                min="1"
                step="1"
                defaultValue={product?.compare_at_price ?? ""}
                className="input tabular-nums"
                placeholder="2890"
              />
              <p className="mt-1 text-[11px] text-muted">
                Shown struck through. Leave blank if there is no discount.
              </p>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold text-ink">
              Sizes <span className="font-normal text-muted">(optional)</span>
            </h2>
            <button type="button" onClick={addSize} className="btn btn-secondary btn-sm">
              + Add size
            </button>
          </div>

          <input type="hidden" name="sizes" value={JSON.stringify(cleanSizes)} />

          {sizes.length === 0 ? (
            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              No sizes added — customers order this as a single, one-size product. Add sizes for
              shoes, clothing, rings or anything else that comes in variants.
            </p>
          ) : (
            <>
              <div className="mt-4 space-y-2">
                {sizes.map((size, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={size}
                      onChange={(event) => updateSize(index, event.target.value)}
                      className="input"
                      placeholder={`Size ${index + 1} — e.g. 40, M, 7.5`}
                      aria-label={`Size ${index + 1}`}
                      maxLength={20}
                    />
                    <button
                      type="button"
                      onClick={() => removeSize(index)}
                      className="btn btn-ghost btn-sm shrink-0 text-danger"
                      aria-label={`Remove size ${index + 1}`}
                    >
                      − Remove
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted">
                Customers must pick one of these before they can add the product to the cart.
                Blank rows are ignored. {cleanSizes.length} size
                {cleanSizes.length === 1 ? "" : "s"} will be saved.
              </p>
            </>
          )}
        </section>

        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold text-ink">
              Colours <span className="font-normal text-muted">(optional)</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => bulkInputRef.current?.click()}
                disabled={bulkBusy}
                className="btn btn-secondary btn-sm"
              >
                {bulkBusy
                  ? `Uploading ${bulkProgress.done}/${bulkProgress.total}…`
                  : "Add colours from photos"}
              </button>
              <button
                type="button"
                onClick={addColor}
                disabled={bulkBusy}
                className="btn btn-secondary btn-sm"
              >
                + Add colour
              </button>
            </div>
          </div>

          <input
            ref={bulkInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
            className="hidden"
            onChange={(event) => void addColorsFromPhotos(event.target.files)}
          />

          {bulkError && (
            <p className="mt-3 rounded-[6px] border border-danger/25 bg-danger-soft px-3 py-2 text-[12px] text-danger">
              {bulkError}
            </p>
          )}

          {colors.length === 0 ? (
            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              No colours yet — customers see one picture and the single quantity shown on the
              right. Add a colour for each version of this product: upload or paste a photo, name
              it, and set its own quantity. Customers click a colour to switch the picture.
            </p>
          ) : (
            <>
              <div className="mt-4 space-y-3">
                {colors.map((color, index) => (
                  <div key={color.id ?? `new-${index}`} className="rounded-[8px] border border-line p-3">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[6px] border border-line bg-raised">
                        <ProductArt name={color.name || "Colour"} image={color.image || null} />
                      </div>

                      <div className="grid min-w-[220px] flex-1 gap-3 sm:grid-cols-[1fr_110px]">
                        <div>
                          <label htmlFor={`color-name-${index}`} className="sr-only">
                            Colour {index + 1} name
                          </label>
                          <input
                            id={`color-name-${index}`}
                            value={color.name}
                            onChange={(event) => updateColor(index, { name: event.target.value })}
                            className="input"
                            placeholder="Colour name — e.g. Rose Gold"
                            maxLength={MAX_COLOR_NAME_LENGTH}
                          />
                        </div>
                        <div>
                          <label htmlFor={`color-stock-${index}`} className="sr-only">
                            Quantity for colour {index + 1}
                          </label>
                          <input
                            id={`color-stock-${index}`}
                            type="number"
                            min="0"
                            step="1"
                            value={color.stock}
                            onChange={(event) => updateColor(index, { stock: event.target.value })}
                            className="input tabular-nums"
                            placeholder="Qty"
                          />
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveColor(index, -1)}
                          disabled={index === 0}
                          className="btn btn-ghost btn-sm px-2"
                          aria-label={`Move colour ${index + 1} up`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveColor(index, 1)}
                          disabled={index === colors.length - 1}
                          className="btn btn-ghost btn-sm px-2"
                          aria-label={`Move colour ${index + 1} down`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeColor(index)}
                          className="btn btn-ghost btn-sm shrink-0 text-danger"
                          aria-label={`Remove colour ${index + 1}`}
                        >
                          − Remove
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <ImagePicker
                        id={`color-image-${index}`}
                        label={`Photo for ${color.name || `colour ${index + 1}`}`}
                        value={color.image}
                        onChange={(value) => updateColor(index, { image: value })}
                        compact
                        hint="Upload from this device or paste an image URL."
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-muted">
                Each colour has its own picture and stock. The first colour is the default shown
                to customers. Blank colour names are ignored. {cleanColors.length} colour
                {cleanColors.length === 1 ? "" : "s"} will be saved.
              </p>
              <ErrorText message={state.fields?.colors} />
            </>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-[13px] font-semibold text-ink">Main picture</h2>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <div className="h-28 w-28 shrink-0 overflow-hidden border border-line bg-raised">
              <ProductArt name={name || "New product"} image={image || null} />
            </div>
            <div className="flex-1">
              <ImagePicker
                id="image"
                label="Picture"
                value={image}
                onChange={setImage}
                hint="Upload from this device or paste a URL. If left blank, the first colour photo is used as the cover."
              />
              <input type="hidden" name="image" value={image} />
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <section className="card p-5">
          <h2 className="text-[13px] font-semibold text-ink">Visibility</h2>
          <div className="mt-3">
            <label htmlFor="status" className="label">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={product?.status ?? "active"}
              className="input"
            >
              <option value="active">Active — visible in store</option>
              <option value="draft">Draft — hidden from store</option>
            </select>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-[13px] font-semibold text-ink">Stock</h2>
          <div className="mt-3 space-y-3">
            {cleanColors.length > 0 ? (
              <div>
                <p className="label">Quantity on hand</p>
                <div className="input flex items-center justify-between bg-raised tabular-nums text-muted">
                  <span>{totalColorStock} total</span>
                  <span className="text-[11px]">across {cleanColors.length} colours</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Set each colour&apos;s quantity in the Colours section. This total is saved
                  automatically.
                </p>
              </div>
            ) : (
              <div>
                <label htmlFor="stock" className="label">
                  Quantity on hand
                </label>
                <input
                  id="stock"
                  name="stock"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={product?.stock ?? 0}
                  className="input tabular-nums"
                />
              </div>
            )}
            <div>
              <label htmlFor="low_stock_threshold" className="label">
                Low-stock threshold
              </label>
              <input
                id="low_stock_threshold"
                name="low_stock_threshold"
                type="number"
                min="0"
                step="1"
                defaultValue={product?.low_stock_threshold ?? 5}
                className="input tabular-nums"
              />
              <p className="mt-1 text-[11px] text-muted">
                Warn when the total stock falls to this number.
              </p>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-2">
          <Submit />
          <Link href="/admin/products" className="btn btn-ghost">
            Cancel
          </Link>
        </div>

        <p className="text-[11px] leading-relaxed text-muted">
          Changes to stock here are recorded in the stock history as a “correction”.
        </p>
      </aside>
    </form>
  );
}
