import Link from "next/link";
import {
  STORE_DESCRIPTION,
  STORE_LOGO,
  STORE_NAME,
  STORE_PHONE,
  STORE_PHONE_DISPLAY,
  STORE_SHORT_NAME,
} from "@/lib/config";

export function SiteFooter({
  categories,
}: {
  categories: { name: string; slug: string }[];
}) {
  return (
    <footer className="splash-bg splash-bg-dark mt-24 border-t border-line bg-ink text-white/75">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={STORE_LOGO}
              alt={STORE_NAME}
              className="h-16 w-16 rounded-full object-cover ring-1 ring-white/20"
            />
            <div className="flex flex-col leading-none">
              <span className="font-script text-[38px] leading-[0.8] text-white">{STORE_SHORT_NAME}</span>
              <span className="font-brand-serif -mt-1 text-[17px] font-medium italic leading-tight text-white/65">
                collection
              </span>
            </div>
          </div>
          <p className="mt-4 max-w-[28ch] text-[13px] leading-relaxed text-white/60">
            {STORE_DESCRIPTION}
          </p>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
            Shop
          </h3>
          <ul className="mt-4 space-y-2.5 text-[13px]">
            <li>
              <Link href="/products" className="transition-colors hover:text-white">
                All products
              </Link>
            </li>
            {categories.slice(0, 4).map((cat) => (
              <li key={cat.slug}>
                <Link href={`/category/${cat.slug}`} className="transition-colors hover:text-white">
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
            Help
          </h3>
          <ul className="mt-4 space-y-2.5 text-[13px]">
            <li>Cash on delivery</li>
            <li>Delivery in 2–4 days</li>
            <li>7-day exchange</li>
            <li>
              <a href={`tel:${STORE_PHONE}`} className="transition-colors hover:text-white">
                {STORE_PHONE_DISPLAY}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
            Ordering
          </h3>
          <p className="mt-4 text-[13px] leading-relaxed text-white/60">
            Place your order online and we will call to confirm before dispatch. Pay the courier
            when it arrives.
          </p>
          <Link href="/products" className="btn btn-primary btn-sm mt-5">
            Start shopping
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-5 py-5 text-[12px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {STORE_NAME}. All rights reserved.</span>
          <Link href="/admin" className="transition-colors hover:text-white/70">
            Owner login
          </Link>
        </div>
      </div>
    </footer>
  );
}
