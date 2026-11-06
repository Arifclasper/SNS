"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveCategory, type AdminState } from "@/app/admin/actions";
import type { Category } from "@/lib/types";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

export function CategoryForm({
  category,
  roots,
}: {
  category?: Category | null;
  roots: Category[];
}) {
  const [state, formAction] = useActionState<AdminState, FormData>(saveCategory, {});

  return (
    <form action={formAction} className="space-y-3">
      {category && <input type="hidden" name="id" value={category.id} />}

      {state.error && (
        <p className="rounded-[6px] border border-danger/25 bg-danger-soft px-3 py-2 text-[12px] text-danger">
          {state.error}
        </p>
      )}

      <div>
        <label className="label" htmlFor={`name-${category?.id ?? "new"}`}>
          Name
        </label>
        <input
          id={`name-${category?.id ?? "new"}`}
          name="name"
          defaultValue={category?.name ?? ""}
          className="input"
          placeholder="e.g. Women's Watches"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor={`parent-${category?.id ?? "new"}`}>
          Parent
        </label>
        <select
          id={`parent-${category?.id ?? "new"}`}
          name="parent_id"
          defaultValue={category?.parent_id ? String(category.parent_id) : ""}
          className="input"
        >
          <option value="">Top level</option>
          {roots
            .filter((root) => root.id !== category?.id)
            .map((root) => (
              <option key={root.id} value={root.id}>
                Under {root.name}
              </option>
            ))}
        </select>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Submit label={category ? "Save changes" : "Create category"} />
        {category && (
          <span className="text-[11px] text-muted">
            Slug: <code>{category.slug}</code>
          </span>
        )}
      </div>
    </form>
  );
}
