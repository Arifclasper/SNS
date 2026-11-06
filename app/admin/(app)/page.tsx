import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductArt } from "@/components/ProductArt";
import { getDashboard } from "@/lib/queries";
import {
  formatDate,
  money,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  STORE_TIME_ZONE,
} from "@/lib/utils";
import { STORE_DATE_LOCALE } from "@/lib/config";

export default async function AdminDashboard() {
  const data = await getDashboard();

  const stats = [
    {
      label: "Products",
      value: String(data.productCount),
      hint: `${data.categoryCount} categories`,
      href: "/admin/products",
      tone: "text-ink",
    },
    {
      label: "Low stock",
      value: String(data.lowStock),
      hint: "at or below threshold",
      href: "/admin/stock?stock=low",
      tone: data.lowStock > 0 ? "text-warning" : "text-ink",
    },
    {
      label: "Out of stock",
      value: String(data.outOfStock),
      hint: "needs restocking",
      href: "/admin/stock?stock=out",
      tone: data.outOfStock > 0 ? "text-danger" : "text-ink",
    },
    {
      label: "New orders",
      value: String(data.newOrders),
      hint: "waiting to confirm",
      href: "/admin/orders?status=new",
      tone: data.newOrders > 0 ? "text-brand" : "text-ink",
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={new Date().toLocaleDateString(STORE_DATE_LOCALE, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: STORE_TIME_ZONE,
        })}
        action={
          <Link href="/admin/products/new" className="btn btn-primary btn-sm">
            + New product
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card p-5 transition-shadow hover:shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              {stat.label}
            </p>
            <p className={`mt-2 font-display text-[34px] font-semibold leading-none ${stat.tone}`}>
              {stat.value}
            </p>
            <p className="mt-2 text-[11px] text-muted">{stat.hint}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-[13px] font-semibold text-ink">Needs restocking</h2>
            <Link href="/admin/stock" className="text-[12px] text-muted hover:text-ink">
              All stock →
            </Link>
          </div>

          {data.lowStockRows.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-[13px] font-medium text-ink">Everything is in stock</p>
              <p className="mt-1 text-[12px] text-muted">
                No product is at or below its threshold.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {data.lowStockRows.map((product) => (
                <li key={product.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="h-9 w-9 shrink-0 overflow-hidden bg-raised">
                    <ProductArt name={product.name} image={product.image} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="block truncate text-[13px] font-medium text-ink hover:text-brand"
                    >
                      {product.name}
                    </Link>
                    <p className="text-[11px] text-muted">{product.sku}</p>
                  </div>
                  <span
                    className={`pill ${
                      product.stock <= 0
                        ? "bg-danger-soft text-danger"
                        : "bg-warning-soft text-warning"
                    }`}
                  >
                    {product.stock <= 0 ? "Out" : `${product.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-[13px] font-semibold text-ink">Recent orders</h2>
            <Link href="/admin/orders" className="text-[12px] text-muted hover:text-ink">
              All orders →
            </Link>
          </div>

          {data.recentOrders.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-[13px] font-medium text-ink">No orders yet</p>
              <p className="mt-1 text-[12px] text-muted">
                Customer orders will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {data.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-raised"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink">{order.customer_name}</p>
                      <p className="text-[11px] text-muted">
                        {order.code} · {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-semibold tabular-nums">{money(order.total)}</p>
                      <span className={`pill mt-1 ${ORDER_STATUS_STYLE[order.status]}`}>
                        {ORDER_STATUS_LABEL[order.status]}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { href: "/admin/categories", label: "Organise categories", body: "Add, rename and reorder the catalogue." },
          { href: "/admin/products/new", label: "Add a product", body: "Photos, price and stock in one form." },
          { href: "/admin/stock", label: "Adjust stock", body: "Receive, correct or write off units." },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-[10px] border border-dashed border-line-strong bg-surface p-5 transition-colors hover:border-brand"
          >
            <p className="text-[13px] font-semibold text-ink group-hover:text-brand">
              {item.label} →
            </p>
            <p className="mt-1 text-[12px] text-muted">{item.body}</p>
          </Link>
        ))}
      </section>
    </>
  );
}
