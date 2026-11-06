"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AdminState } from "@/app/admin/actions";
import { STORE_SHORT_NAME } from "@/lib/config";

export function LoginForm() {
  const [state, formAction] = useActionState<AdminState, FormData>(loginAction, {});

  return (
    <div className="w-full max-w-[380px]">
      <div className="flex flex-col items-center leading-none">
        <span className="font-script text-4xl leading-[0.8] text-brand">{STORE_SHORT_NAME}</span>
        <span className="font-brand-serif -mt-1 text-[17px] font-medium italic leading-tight text-muted">
          collection
        </span>
      </div>

      <div className="mt-8 rounded-[10px] border border-line bg-surface p-7 shadow-[0_18px_50px_-30px_rgba(14,17,22,.35)]">
        <h1 className="text-[17px] font-semibold text-ink">Owner sign in</h1>
        <p className="mt-1 text-[12px] text-muted">
          Manage categories, products and stock.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          {state.error && (
            <div className="rounded-[6px] border border-danger/25 bg-danger-soft px-3 py-2 text-[12px] text-danger">
              {state.error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-full">
            Sign in
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted">
          Set <code className="rounded bg-raised px-1 py-0.5">ADMIN_PASSWORD</code> in
          <code className="ml-1 rounded bg-raised px-1 py-0.5">.env.local</code>
        </p>
      </div>

      <p className="mt-6 text-center text-[12px] text-muted">
        <Link href="/" className="hover:text-ink">
          ← Back to the storefront
        </Link>
      </p>
    </div>
  );
}
