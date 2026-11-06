import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getSettings } from "@/lib/queries";
import {
  CURRENCY_CODE,
  CURRENCY_SYMBOL,
  DEFAULT_FREE_SHIPPING_THRESHOLD,
  DEFAULT_SHIPPING_FEE,
  STORE_NAME,
} from "@/lib/config";

export const metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const sp = await searchParams;
  const settings = await getSettings();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Store details used across the storefront and checkout."
      />

      {sp.saved && (
        <div className="mb-5 rounded-[6px] border border-success/25 bg-success-soft px-4 py-3 text-[13px] text-success">
          Settings saved.
        </div>
      )}

      <section className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="text-[13px] font-semibold text-ink">Homepage pictures</h2>
          <p className="mt-1 text-[12px] text-muted">
            Choose the pictures for the three boxes at the top of the landing page.
          </p>
        </div>
        <Link href="/admin/homepage" className="btn btn-secondary btn-sm">
          Manage homepage
        </Link>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="card p-5">
          <h2 className="text-[13px] font-semibold text-ink">Delivery</h2>
          <p className="mt-1 mb-4 text-[12px] text-muted">
            Applied at checkout. Orders at or above the threshold ship free.
          </p>
          <SettingsForm
            shippingFee={Number(settings.shipping_fee ?? DEFAULT_SHIPPING_FEE)}
            freeThreshold={Number(
              settings.free_shipping_threshold ?? DEFAULT_FREE_SHIPPING_THRESHOLD,
            )}
          />
        </section>

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="text-[13px] font-semibold text-ink">Store</h2>
            <dl className="mt-3 space-y-2.5 text-[13px]">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Name</dt>
                <dd className="font-medium">{settings.store_name ?? STORE_NAME}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Currency</dt>
                <dd className="font-medium">
                  {settings.currency ?? CURRENCY_SYMBOL} {CURRENCY_CODE}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Payment</dt>
                <dd className="font-medium">Cash on delivery</dd>
              </div>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="text-[13px] font-semibold text-ink">Owner access</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">
              The admin password is set with the <code className="rounded bg-raised px-1">ADMIN_PASSWORD</code>{" "}
              environment variable in <code className="rounded bg-raised px-1">.env.local</code>. Change it
              and restart the server to apply.
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">
              Sessions last 12 hours. Signing out clears the cookie immediately.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
