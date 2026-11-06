import Link from "next/link";
import { HomepageSettingsForm } from "@/components/admin/HomepageSettingsForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { parseHeroSettings } from "@/lib/hero";
import { getSettings, listProducts } from "@/lib/queries";
import { HOMEPAGE_PRODUCT_PICKER_LIMIT } from "@/lib/config";

export const metadata = { title: "Homepage" };

export default async function HomepagePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const sp = await searchParams;
  const settings = await getSettings();
  const hero = parseHeroSettings(settings);

  const active = await listProducts({
    status: "active",
    perPage: HOMEPAGE_PRODUCT_PICKER_LIMIT,
    sort: "name-asc",
  });
  const products = active.rows.map((product) => ({
    id: product.id,
    name: product.name,
    image: product.image,
    slug: product.slug,
  }));

  return (
    <>
      <PageHeader
        title="Homepage pictures"
        description="Choose the pictures shown in the three boxes at the top of the customer landing page."
        action={
          <Link href="/" target="_blank" className="btn btn-secondary btn-sm">
            Preview storefront ↗
          </Link>
        }
      />

      {sp.saved && (
        <div className="mb-5 rounded-[6px] border border-success/25 bg-success-soft px-4 py-3 text-[13px] text-success">
          Homepage pictures saved.
        </div>
      )}

      <section className="card p-5">
        <h2 className="text-[13px] font-semibold text-ink">The three landing-page boxes</h2>
        <p className="mt-1 text-[12px] text-muted">
          Upload a picture from your computer or paste an image URL for each box. Box 1 is the
          large offer, box 2 is the upcoming product, and box 3 is the slider.
        </p>
        <HomepageSettingsForm hero={hero} products={products} />
      </section>
    </>
  );
}
