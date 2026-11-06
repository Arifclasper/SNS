import Link from "next/link";
import { HeroCollage } from "@/components/HeroCollage";
import { ProductCard } from "@/components/ProductCard";
import { parseHeroSettings, resolveHero } from "@/lib/hero";
import {
  getCategoryTree,
  getNewArrivals,
  getProductsByIds,
  getSettings,
} from "@/lib/queries";
import { gradientFor } from "@/lib/utils";
import { NEW_ARRIVALS_LIMIT, STORE_LOGO } from "@/lib/config";

export default async function HomePage() {
  const [tree, arrivals, settings] = await Promise.all([
    getCategoryTree(),
    getNewArrivals(NEW_ARRIVALS_LIMIT),
    getSettings(),
  ]);

  const hero = parseHeroSettings(settings);
  const heroIds = [
    ...(hero.upcoming.productId ? [hero.upcoming.productId] : []),
    ...hero.carousel
      .map((slide) => slide.productId)
      .filter((id): id is string => id !== null),
  ];
  const heroProducts = await getProductsByIds(heroIds);
  const resolvedHero = resolveHero(
    hero,
    new Map(heroProducts.map((product) => [product.id, product])),
    arrivals,
  );

  return (
    <>
      {/* Hero */}
      <section className="splash-bg watercolor-band border-b border-line">
        <img
          src={STORE_LOGO}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 -top-36 -z-10 w-[420px] opacity-[0.045] mix-blend-multiply"
        />
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
              New season · Ballet & little wonders
            </p>
            <h1 className="mt-5 font-display text-[52px] font-semibold leading-[0.98] tracking-[-0.03em] text-ink sm:text-[64px]">
              Tiny steps,
              <br />
              big twirls.
            </h1>
            <p className="mt-6 max-w-[42ch] text-[15px] leading-relaxed text-ink-soft">
              Ballerina flats, party shoes and sweet little extras for girls — picked for
              comfort, made for twirling.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/products" className="btn btn-primary btn-lg">
                Shop the collection
              </Link>
              <Link href="/products" className="btn btn-secondary btn-lg">
                See new arrivals
              </Link>
            </div>

            <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">Delivery</dt>
                <dd className="mt-0.5 text-[13px] text-ink-soft">2–4 days nationwide</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">Payment</dt>
                <dd className="mt-0.5 text-[13px] text-ink-soft">Cash on delivery</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.12em] text-muted">Exchange</dt>
                <dd className="mt-0.5 text-[13px] text-ink-soft">7 days, no questions</dd>
              </div>
            </dl>
          </div>

          <HeroCollage
            offer={resolvedHero.offer}
            upcoming={resolvedHero.upcoming}
            slides={resolvedHero.slides}
          />
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-[1280px] px-5 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
              Browse
            </p>
            <h2 className="mt-2 font-display text-[32px] font-semibold text-ink">
              Three ways in
            </h2>
          </div>
          <Link href="/products" className="text-[13px] text-muted link-underline hover:text-brand">
            See everything
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {tree.map((cat) => {
            const [from, to] = gradientFor(cat.name);
            return (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-[18px] border border-white/70 shadow-[0_24px_50px_-34px_rgba(92,58,74,0.55)] transition-transform duration-300 hover:-translate-y-1"
                style={{ background: `linear-gradient(150deg, ${from}, ${to})` }}
              >
                <div className="absolute inset-0 opacity-45" style={{ background: "radial-gradient(circle at 25% 20%, rgba(255,255,255,.7), transparent 52%)" }} />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 via-ink/25 to-transparent p-5 pt-14">
                  <h3 className="font-display text-2xl font-semibold text-white">{cat.name}</h3>
                  <p className="mt-0.5 text-[12px] text-white/80">
                    {cat.totalCount} {cat.totalCount === 1 ? "product" : "products"}
                  </p>
                </div>
                <span className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/75 text-ink opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                  →
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* New arrivals */}
      <section className="border-t border-line bg-raised">
        <div className="mx-auto max-w-[1280px] px-5 py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
                Just added
              </p>
              <h2 className="mt-2 font-display text-[32px] font-semibold text-ink">
                New arrivals
              </h2>
            </div>
            <Link href="/products" className="text-[13px] text-muted link-underline hover:text-brand">
              View all
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
            {arrivals.slice(0, NEW_ARRIVALS_LIMIT).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Promise */}
      <section className="mx-auto max-w-[1280px] px-5 py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            {
              title: "Order, then we call",
              body: "Place the order online and we ring you to confirm the address and timing before anything ships.",
            },
            {
              title: "Pay when it arrives",
              body: "Cash on delivery everywhere in Bangladesh. No card details, no accounts, no fuss.",
            },
            {
              title: "Seven-day exchange",
              body: "If it is not right, send it back within a week. We will swap it or refund you.",
            },
          ].map((item) => (
            <div key={item.title} className="border-t-2 border-brand pt-5">
              <h3 className="text-[15px] font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
