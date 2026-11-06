import type { HeroContent, HeroOffer, HeroSlide } from "./types";

export const MAX_HERO_SLIDES = 12;

function cleanText(value: unknown, max: number) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Accepts site-relative paths and absolute http(s) URLs, rejects everything else. */
export function cleanHeroUrl(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw.slice(0, 300);
  try {
    const url = new URL(raw);
    if (url.protocol === "http:" || url.protocol === "https:") return raw.slice(0, 600);
  } catch {
    /* not a URL */
  }
  return "";
}

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function cleanProductId(value: unknown): string | null {
  const id = String(value ?? "").trim();
  return OBJECT_ID_RE.test(id) ? id : null;
}

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function parseSlide(value: unknown): HeroSlide | null {
  const raw = asObject(value);
  const productId = cleanProductId(raw.productId);
  const image = cleanHeroUrl(raw.image);
  const title = cleanText(raw.title, 80);
  const href = cleanHeroUrl(raw.href);

  if (!productId && !image && !title) return null;
  return { productId, image, title, href };
}

export function emptyHero(): HeroContent {
  return {
    offer: { image: "", badge: "", title: "", href: "" },
    upcoming: { productId: null, image: "", title: "", href: "" },
    carousel: [],
  };
}

/**
 * Reads the three `hero_*` settings rows. Accepts either parsed values or the
 * raw JSON strings stored in the settings table, so the same function is used
 * by the admin form and the storefront.
 */
export function parseHeroSettings(settings: Record<string, string | undefined>): HeroContent {
  const offerRaw = asObject(settings.hero_offer);
  const offer: HeroOffer = {
    image: cleanHeroUrl(offerRaw.image),
    badge: cleanText(offerRaw.badge, 32),
    title: cleanText(offerRaw.title, 80),
    href: cleanHeroUrl(offerRaw.href),
  };

  const upcoming = parseSlide(settings.hero_upcoming) ?? emptyHero().upcoming;

  const carouselRaw = (() => {
    const value = settings.hero_carousel;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value : [];
  })();

  const carousel: HeroSlide[] = [];
  for (const entry of carouselRaw) {
    const slide = parseSlide(entry);
    if (!slide) continue;
    if (slide.productId && carousel.some((s) => s.productId === slide.productId)) continue;
    carousel.push(slide);
    if (carousel.length >= MAX_HERO_SLIDES) break;
  }

  return { offer, upcoming, carousel };
}

/* ------------------------------ resolution ------------------------------ */

export type HeroProduct = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
};

export type ResolvedHeroBox = {
  image: string | null;
  title: string;
  href: string;
  badge?: string;
  /** Seed for the generated gradient artwork when there is no image. */
  name: string;
};

export type ResolvedHero = {
  offer: ResolvedHeroBox;
  upcoming: ResolvedHeroBox;
  slides: ResolvedHeroBox[];
};

function productBox(product: HeroProduct, badge?: string): ResolvedHeroBox {
  return {
    image: product.image,
    title: product.name,
    href: `/product/${product.slug}`,
    badge,
    name: product.name,
  };
}

function resolveSlide(slide: HeroSlide, products: Map<string, HeroProduct>): ResolvedHeroBox {
  const product = slide.productId ? products.get(slide.productId) : undefined;
  return {
    image: product ? product.image || slide.image || null : slide.image || null,
    title: product?.name || slide.title,
    href: product ? `/product/${product.slug}` : slide.href || "/products",
    name: product?.name || slide.title || "Product",
  };
}

/**
 * Turns stored settings into what the hero actually renders, with the previous
 * newest-products behaviour as the fallback for anything left unconfigured.
 */
export function resolveHero(
  hero: HeroContent,
  products: Map<string, HeroProduct>,
  fallback: HeroProduct[],
): ResolvedHero {
  const configuredOffer = hero.offer.image || hero.offer.title || hero.offer.href;
  const offerFallback = fallback[0];

  const offer: ResolvedHeroBox = configuredOffer
    ? {
        image: hero.offer.image || null,
        title: hero.offer.title,
        href: hero.offer.href || "/products",
        badge: hero.offer.badge || undefined,
        name: hero.offer.title || "Offer",
      }
    : offerFallback
      ? productBox(offerFallback, "New season")
      : {
          image: null,
          title: "",
          href: "/products",
          badge: "New season",
          name: "Offer",
        };

  const upcomingResolved = resolveSlide(hero.upcoming, products);
  const upcoming: ResolvedHeroBox =
    upcomingResolved.image || upcomingResolved.title
      ? { ...upcomingResolved, badge: "Upcoming" }
      : fallback[1]
        ? productBox(fallback[1], "Upcoming")
        : fallback[0]
          ? productBox(fallback[0], "Upcoming")
          : { ...upcomingResolved, badge: "Upcoming" };

  const configuredSlides = hero.carousel
    .map((slide) => resolveSlide(slide, products))
    .filter((slide) => slide.image || slide.title);

  const slides = configuredSlides.length
    ? configuredSlides
    : fallback.slice(0, 5).map((product) => productBox(product));

  return { offer, upcoming, slides };
}
