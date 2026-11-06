"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveSettings, type AdminState } from "@/app/admin/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Saving…" : "Save settings"}
    </button>
  );
}

export function SettingsForm({
  shippingFee,
  freeThreshold,
}: {
  shippingFee: number;
  freeThreshold: number;
}) {
  const [state, formAction] = useActionState<AdminState, FormData>(saveSettings, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-[6px] border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="shipping_fee" className="label">
            Delivery fee (৳)
          </label>
          <input
            id="shipping_fee"
            name="shipping_fee"
            type="number"
            min="0"
            step="1"
            defaultValue={shippingFee}
            className="input tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="free_shipping_threshold" className="label">
            Free delivery over (৳)
          </label>
          <input
            id="free_shipping_threshold"
            name="free_shipping_threshold"
            type="number"
            min="0"
            step="1"
            defaultValue={freeThreshold}
            className="input tabular-nums"
          />
        </div>
      </div>

      <Submit />
    </form>
  );
}
