"use client";

import { useEffect } from "react";

/**
 * Triggers the PDF receipt download once, right after the order is placed.
 * Browsers treat a download started from a fresh navigation as a same-origin
 * download; the visible button is the fallback for iOS Safari and for anyone
 * who dismissed it.
 */
export function AutoReceiptDownload({
  token,
  code,
  auto,
}: {
  token: string;
  code: string;
  auto: boolean;
}) {
  const href = `/api/orders/${encodeURIComponent(token)}/receipt`;

  useEffect(() => {
    if (!auto) return;

    const key = `sns_receipt_${token}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* private mode — still try the download */
    }

    const link = document.createElement("a");
    link.href = href;
    link.download = `${code}.pdf`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [auto, code, href, token]);

  return (
    <div className="mt-6 rounded-[6px] border border-line bg-white px-5 py-4 text-center">
      <a href={href} download={`${code}.pdf`} className="btn btn-secondary btn-sm">
        Download receipt (PDF)
      </a>
      <p className="mt-2 text-[11px] text-muted">
        {auto
          ? "Your receipt should download automatically. If it did not, use the button above."
          : "Keep this receipt for your records — it includes your order number and items."}
      </p>
    </div>
  );
}
