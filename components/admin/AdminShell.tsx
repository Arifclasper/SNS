"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/admin/actions";
import { STORE_NAME, STORE_SHORT_NAME } from "@/lib/config";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "grid", exact: true },
  { href: "/admin/homepage", label: "Homepage", icon: "image" },
  { href: "/admin/categories", label: "Categories", icon: "tree" },
  { href: "/admin/products", label: "Products", icon: "box" },
  { href: "/admin/stock", label: "Stock", icon: "stack" },
  { href: "/admin/orders", label: "Orders", icon: "bag" },
  { href: "/admin/settings", label: "Settings", icon: "gear" },
];

function Icon({ name }: { name: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      );
    case "tree":
      return (
        <svg {...common}>
          <path d="M4 6h6M4 12h6M4 18h6" />
          <path d="M14 6h6M14 12h6M14 18h6" />
          <path d="M10 6v12" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
        </svg>
      );
    case "stack":
      return (
        <svg {...common}>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 13 9 5 9-5" />
        </svg>
      );
    case "bag":
      return (
        <svg {...common}>
          <path d="M4 7h16l-1.4 12a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8L4 7Z" />
          <path d="M9 7a3 3 0 0 1 6 0" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.4-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 20.6 11a2 2 0 1 1 0 4Z" />
        </svg>
      );
  }
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (item: (typeof NAV)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-line px-5">
        <Link href="/admin" className="flex items-baseline gap-2">
          <span className="font-script text-2xl leading-none text-brand">{STORE_SHORT_NAME}</span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-muted">
            Owner
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          Manage
        </p>
        <ul className="space-y-0.5">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-[6px] px-2.5 py-2 text-[13px] font-medium transition-colors ${
                  isActive(item)
                    ? "bg-brand-soft text-brand-ink"
                    : "text-ink-soft hover:bg-raised hover:text-ink"
                }`}
              >
                <span className={isActive(item) ? "text-brand" : "text-muted"}>
                  <Icon name={item.icon} />
                </span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-line p-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 rounded-[6px] px-2.5 py-2 text-[12px] text-muted transition-colors hover:bg-raised hover:text-ink"
        >
          View storefront ↗
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-left text-[12px] text-muted transition-colors hover:bg-raised hover:text-danger"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-raised">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] border-r border-line bg-surface lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] bg-surface shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-[236px]">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-[6px] text-ink hover:bg-raised lg:hidden"
            aria-label="Open menu"
          >
            <span className="flex w-4 flex-col gap-1">
              <span className="h-[1.5px] w-full bg-current" />
              <span className="h-[1.5px] w-full bg-current" />
              <span className="h-[1.5px] w-full bg-current" />
            </span>
          </button>

          <p className="hidden text-[12px] text-muted lg:block">
            {STORE_NAME} · owner console
          </p>

          <div className="flex items-center gap-3">
            <Link href="/" target="_blank" className="text-[12px] text-muted hover:text-ink">
              View store ↗
            </Link>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
              {STORE_SHORT_NAME.slice(0, 1)}
            </span>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
