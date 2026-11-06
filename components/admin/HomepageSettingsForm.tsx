"use client";

import { useState } from "react";
import { saveHomepageSettings } from "@/app/admin/actions";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { ProductArt } from "@/components/ProductArt";
import type { HeroContent, HeroOffer, HeroSlide } from "@/lib/types";

type ProductOption = { id: string; name: string; image: string | null; slug: string };

function slideFromProduct(product: ProductOption): HeroSlide {
  return {
    productId: product.id,
    image: product.image ?? "",
    title: product.name,
    href: `/product/${product.slug}`,
  };
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input text-[13px]"
        placeholder={placeholder}
      />
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

export function HomepageSettingsForm({
  hero,
  products,
}: {
  hero: HeroContent;
  products: ProductOption[];
}) {
  const [offer, setOffer] = useState<HeroOffer>(hero.offer);
  const [upcoming, setUpcoming] = useState<HeroSlide>(hero.upcoming);
  const [slides, setSlides] = useState<HeroSlide[]>(hero.carousel);
  const [pick, setPick] = useState("");

  const picked = products.find((product) => product.id === pick) ?? null;

  function patchOffer(patch: Partial<HeroOffer>) {
    setOffer((current) => ({ ...current, ...patch }));
  }

  function patchUpcoming(patch: Partial<HeroSlide>) {
    setUpcoming((current) => ({ ...current, ...patch }));
  }

  function chooseUpcoming(value: string) {
    const product = products.find((item) => item.id === value);
    if (!product) {
      patchUpcoming({ productId: null });
      return;
    }
    setUpcoming(slideFromProduct(product));
  }

  function addPicked() {
    if (!picked) return;
    if (slides.some((slide) => slide.productId === picked.id)) {
      setPick("");
      return;
    }
    setSlides((current) => [...current, slideFromProduct(picked)]);
    setPick("");
  }

  function addCustom() {
    setSlides((current) => [
      ...current,
      { productId: null, image: "", title: "", href: "" },
    ]);
  }

  function patchSlide(index: number, patch: Partial<HeroSlide>) {
    setSlides((current) =>
      current.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)),
    );
  }

  function moveSlide(index: number, direction: -1 | 1) {
    setSlides((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeSlide(index: number) {
    setSlides((current) => current.filter((_, i) => i !== index));
  }

  return (
    <form action={saveHomepageSettings} className="mt-4">
      <input type="hidden" name="hero_offer" value={JSON.stringify(offer)} />
      <input type="hidden" name="hero_upcoming" value={JSON.stringify(upcoming)} />
      <input type="hidden" name="hero_carousel" value={JSON.stringify(slides)} />

      <div className="grid gap-5 xl:grid-cols-3">
        {/* ------------------------------ offer ------------------------------ */}
        <section className="rounded-[6px] border border-line p-4">
          <h3 className="text-[12px] font-semibold text-ink">1 · Large offer box</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            The big box on the left. Upload a picture, or paste an image link.
          </p>

          <div className="mt-3 aspect-[4/3] overflow-hidden bg-raised">
            <ProductArt name={offer.title || "Offer"} image={offer.image || null} />
          </div>

          <div className="mt-3 space-y-3">
            <Field
              id="offer-badge"
              label="Badge"
              value={offer.badge}
              onChange={(badge) => patchOffer({ badge })}
              placeholder="Offer · Coming soon"
              hint="Small label above the title. Leave blank to hide."
            />
            <Field
              id="offer-title"
              label="Title"
              value={offer.title}
              onChange={(title) => patchOffer({ title })}
              placeholder="Tiny steps, big twirls"
            />
            <ImagePicker
              id="offer-image"
              label="Picture"
              value={offer.image}
              onChange={(image) => patchOffer({ image })}
              hint="Upload a picture from your computer, or paste a direct image link. Leave blank for the gradient tile."
            />
            <Field
              id="offer-link"
              label="Link"
              value={offer.href}
              onChange={(href) => patchOffer({ href })}
              placeholder="/products or https://…"
            />
          </div>
        </section>

        {/* ---------------------------- upcoming ----------------------------- */}
        <section className="rounded-[6px] border border-line p-4">
          <h3 className="text-[12px] font-semibold text-ink">2 · Upcoming product</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            The top-right box. Pick a catalogue product, or upload a custom teaser picture.
          </p>

          <div className="mt-3 aspect-[4/3] overflow-hidden bg-raised">
            <ProductArt
              name={upcoming.title || "Upcoming"}
              image={upcoming.image || null}
            />
          </div>

          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="upcoming-product" className="label">
                Product
              </label>
              <select
                id="upcoming-product"
                value={upcoming.productId ? String(upcoming.productId) : ""}
                onChange={(event) => chooseUpcoming(event.target.value)}
                className="input text-[13px]"
              >
                <option value="">Custom picture / no product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Choosing a product fills the picture and link below.
              </p>
            </div>

            {upcoming.productId ? (
              <p className="rounded-[6px] bg-raised px-3 py-2 text-[11px] leading-relaxed text-muted">
                Picture, title and link come from the selected product and update
                automatically. Choose “Custom picture / no product” to write your own teaser.
              </p>
            ) : (
              <>
                <ImagePicker
                  id="upcoming-image"
                  label="Picture"
                  value={upcoming.image}
                  onChange={(image) => patchUpcoming({ image })}
                  hint="Upload a picture, or paste a direct image link."
                />
                <Field
                  id="upcoming-title"
                  label="Title"
                  value={upcoming.title}
                  onChange={(title) => patchUpcoming({ title })}
                  placeholder="e.g. Aurora Chronograph"
                />
                <Field
                  id="upcoming-link"
                  label="Link"
                  value={upcoming.href}
                  onChange={(href) => patchUpcoming({ href })}
                  placeholder="/product/… or https://…"
                />
              </>
            )}
          </div>
        </section>

        {/* ---------------------------- carousel ----------------------------- */}
        <section className="rounded-[6px] border border-line p-4">
          <h3 className="text-[12px] font-semibold text-ink">3 · Slider box</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            Visitors flip through these with the arrows. Add catalogue products or your own
            uploaded pictures.
          </p>

          <div className="mt-3 flex gap-2">
            <select
              value={pick}
              onChange={(event) => setPick(event.target.value)}
              className="input text-[13px]"
              aria-label="Product to add to the carousel"
            >
              <option value="">Choose a product…</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addPicked}
              disabled={!picked}
              className="btn btn-secondary btn-sm shrink-0"
            >
              Add
            </button>
          </div>

          <button
            type="button"
            onClick={addCustom}
            className="btn btn-ghost btn-sm mt-2"
          >
            + Custom picture slide
          </button>

          <div className="mt-3 space-y-2">
            {slides.length === 0 && (
              <p className="rounded-[6px] bg-raised px-3 py-2 text-[11px] leading-relaxed text-muted">
                No slides yet — the storefront shows the newest products until you add some.
              </p>
            )}

            {slides.map((slide, index) => (
              <div
                key={`${slide.productId ?? "custom"}-${index}`}
                className="rounded-[6px] border border-line p-2.5"
              >
                <div className="flex items-start gap-2">
                  <div className="h-11 w-11 shrink-0 overflow-hidden bg-raised">
                    <ProductArt
                      name={slide.title || "Slide"}
                      image={slide.image || null}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-ink">
                      {slide.title || "Untitled slide"}
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {slide.productId ? "From catalogue" : "Custom picture"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveSlide(index, -1)}
                      disabled={index === 0}
                      className="btn btn-ghost btn-sm h-7 px-2"
                      aria-label={`Move slide ${index + 1} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlide(index, 1)}
                      disabled={index === slides.length - 1}
                      className="btn btn-ghost btn-sm h-7 px-2"
                      aria-label={`Move slide ${index + 1} down`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSlide(index)}
                      className="btn btn-ghost btn-sm h-7 px-2 text-danger"
                      aria-label={`Remove slide ${index + 1}`}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {slide.productId === null && (
                  <div className="mt-2 space-y-2">
                    <ImagePicker
                      id={`slide-image-${index}`}
                      label={`Slide ${index + 1} picture`}
                      value={slide.image}
                      onChange={(image) => patchSlide(index, { image })}
                      compact
                    />
                    <input
                      value={slide.title}
                      onChange={(event) => patchSlide(index, { title: event.target.value })}
                      className="input text-[12px]"
                      placeholder="Title"
                      aria-label={`Slide ${index + 1} title`}
                    />
                    <input
                      value={slide.href}
                      onChange={(event) => patchSlide(index, { href: event.target.value })}
                      className="input text-[12px]"
                      placeholder="/link or https://…"
                      aria-label={`Slide ${index + 1} link`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button type="submit" className="btn btn-primary">
          Save homepage
        </button>
        <p className="text-[11px] leading-relaxed text-muted">
          Uploaded pictures are stored with the store data. Empty slots fall back to the newest
          products.
        </p>
      </div>
    </form>
  );
}
