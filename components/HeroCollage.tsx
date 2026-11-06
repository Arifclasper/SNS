"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductArt } from "./ProductArt";
import type { ResolvedHeroBox } from "@/lib/hero";

export function HeroCollage({
  offer,
  upcoming,
  slides,
}: {
  offer: ResolvedHeroBox;
  upcoming: ResolvedHeroBox;
  slides: ResolvedHeroBox[];
}) {
  const [index, setIndex] = useState(0);
  const total = slides.length;
  const safeIndex = total > 0 ? ((index % total) + total) % total : 0;
  const slide = total > 0 ? slides[safeIndex] : null;

  function step(delta: number) {
    if (total < 2) return;
    setIndex((current) => (current + delta + total) % total);
  }

  return (
    <div className="grid h-[420px] grid-cols-5 grid-rows-6 gap-3 sm:h-[480px]">
      {/* large offer */}
      <Link
        href={offer.href || "/products"}
        className="group relative col-span-3 row-span-6 overflow-hidden rounded-[18px] border border-white/70 bg-raised shadow-[0_28px_60px_-38px_rgba(92,58,74,0.6)] transition-transform duration-300 hover:-translate-y-0.5"
      >
        <ProductArt name={offer.name} image={offer.image} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        {(offer.badge || offer.title) && (
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            {offer.badge && (
              <span className="inline-block rounded-[3px] bg-brand-soft/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-ink">
                {offer.badge}
              </span>
            )}
            {offer.title && (
              <p className="mt-2 max-w-[22ch] font-display text-[22px] font-semibold leading-tight text-white sm:text-[26px]">
                {offer.title}
              </p>
            )}
          </div>
        )}
      </Link>

      {/* upcoming product */}
      <Link
        href={upcoming.href || "/products"}
        className="group relative col-span-2 row-span-3 overflow-hidden rounded-[18px] border border-white/70 bg-raised shadow-[0_24px_50px_-36px_rgba(92,58,74,0.6)] transition-transform duration-300 hover:-translate-y-0.5"
      >
        <ProductArt name={upcoming.name} image={upcoming.image} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <span className="inline-block rounded-[3px] bg-white/15 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
            {upcoming.badge || "Upcoming"}
          </span>
          {upcoming.title && (
            <p className="mt-1.5 line-clamp-2 text-[12px] font-medium text-white">
              {upcoming.title}
            </p>
          )}
        </div>
      </Link>

      {/* product carousel */}
      <div className="group relative col-span-2 row-span-3 overflow-hidden rounded-[18px] border border-white/70 bg-raised shadow-[0_24px_50px_-36px_rgba(92,58,74,0.6)]">
        {slide ? (
          <Link
            href={slide.href || "/products"}
            aria-label={slide.title || "Featured product"}
            className="block h-full w-full"
          >
            <ProductArt name={slide.name} image={slide.image} />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3.5 pb-8">
              <p className="line-clamp-2 text-[12px] font-medium text-white">{slide.title}</p>
            </div>
          </Link>
        ) : (
          <div className="flex h-full items-center justify-center text-[12px] text-muted">
            No products yet
          </div>
        )}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous product"
              className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 pb-0.5 text-[18px] leading-none text-white backdrop-blur transition-colors hover:bg-black/75"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next product"
              className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 pb-0.5 text-[18px] leading-none text-white backdrop-blur transition-colors hover:bg-black/75"
            >
              ›
            </button>
            <div className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-1.5">
              {slides.map((item, dotIndex) => (
                <button
                  key={`${item.href}-${dotIndex}`}
                  type="button"
                  onClick={() => setIndex(dotIndex)}
                  aria-label={`Go to slide ${dotIndex + 1}`}
                  aria-current={dotIndex === safeIndex ? "true" : undefined}
                  className={`h-1.5 rounded-full transition-all ${
                    dotIndex === safeIndex
                      ? "w-4 bg-white"
                      : "w-1.5 bg-white/45 hover:bg-white/75"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
