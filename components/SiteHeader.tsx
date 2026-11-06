"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CURRENCY_SYMBOL,
  DELIVERY_FEE_DHAKA,
  DELIVERY_FEE_OUTSIDE,
  STORE_LOGO,
  STORE_NAME,
  STORE_SHORT_NAME,
} from "@/lib/config";
import { useCart } from "./CartProvider";

type NavCategory = {
  id: string;
  name: string;
  slug: string;
  children: { id: string; name: string; slug: string }[];
};

export function SiteHeader({ categories }: { categories: NavCategory[] }) {
  const { count, ready } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40">
      <div className="announcement-bar">
        <div className="mx-auto flex min-h-9 max-w-[1280px] flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 px-4 py-1.5 text-center text-[10px] font-medium leading-snug tracking-[0.08em] uppercase sm:gap-x-2 sm:text-[11px] sm:tracking-[0.12em]">
          <span className="whitespace-nowrap">
            Delivery {CURRENCY_SYMBOL}
            {DELIVERY_FEE_DHAKA} inside Dhaka
          </span>
          <span className="whitespace-nowrap">
            <span className="hidden sm:inline">· </span>
            {CURRENCY_SYMBOL}
            {DELIVERY_FEE_OUTSIDE} outside Dhaka
          </span>
          <span className="whitespace-nowrap">
            <span className="hidden sm:inline">· </span>Cash on delivery
          </span>
        </div>
      </div>

      <div className="border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between gap-6 px-5">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${STORE_NAME} home`}>
            <img
              src={STORE_LOGO}
              alt=""
              aria-hidden="true"
              className="h-12 w-12 rounded-full object-cover ring-1 ring-line"
            />
            <span className="flex flex-col leading-none">
              <span className="font-script text-[36px] leading-[0.8] text-brand">{STORE_SHORT_NAME}</span>
              <span className="font-brand-serif -mt-1 text-[16px] font-medium italic leading-tight text-muted">
                collection
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
            <Link
              href="/products"
              className="text-[13px] font-medium text-ink-soft transition-colors hover:text-brand"
            >
              All products
            </Link>

            {categories.map((cat) => (
              <div key={cat.id} className="group relative">
                <Link
                  href={`/category/${cat.slug}`}
                  className="flex h-[72px] items-center text-[13px] font-medium text-ink-soft transition-colors hover:text-brand"
                >
                  {cat.name}
                </Link>
                {cat.children.length > 0 && (
                  <div className="invisible absolute left-1/2 top-full w-56 -translate-x-1/2 border border-line bg-surface p-2 opacity-0 shadow-[0_12px_40px_-12px_rgba(14,17,22,0.25)] transition-all duration-150 group-hover:visible group-hover:opacity-100">
                    {cat.children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/category/${child.slug}`}
                        className="block rounded-[6px] px-3 py-2 text-[13px] text-ink-soft transition-colors hover:bg-raised hover:text-ink"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/cart"
              className="relative flex h-10 items-center gap-2 rounded-[6px] px-3 text-[13px] font-medium text-ink transition-colors hover:bg-raised"
            >
              Cart
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">
                {ready ? count : 0}
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-[6px] text-ink hover:bg-raised lg:hidden"
              aria-expanded={open}
              aria-label="Toggle menu"
            >
              <span className="flex w-5 flex-col gap-[5px]">
                <span className="h-[1.5px] w-full bg-current" />
                <span className="h-[1.5px] w-full bg-current" />
                <span className="h-[1.5px] w-full bg-current" />
              </span>
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-line bg-surface px-5 py-4 lg:hidden">
            <Link
              href="/products"
              onClick={() => setOpen(false)}
              className="block py-2 text-sm font-medium text-ink"
            >
              All products
            </Link>
            {categories.map((cat) => (
              <div key={cat.id} className="py-1">
                <Link
                  href={`/category/${cat.slug}`}
                  onClick={() => setOpen(false)}
                  className="block py-1.5 text-sm font-medium text-ink"
                >
                  {cat.name}
                </Link>
                {cat.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/category/${child.slug}`}
                    onClick={() => setOpen(false)}
                    className="block py-1.5 pl-4 text-[13px] text-muted"
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
