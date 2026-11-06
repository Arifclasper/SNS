"use client";

import { useEffect } from "react";

/** Starts the receipt download after a "Save & download" redirect. */
export function DownloadReceiptOnLoad({ href, auto }: { href: string; auto: boolean }) {
  useEffect(() => {
    if (!auto) return;

    // No de-duplication here on purpose: every "Save & download receipt" click
    // should produce a fresh PDF with the latest tracking ID.
    const link = document.createElement("a");
    link.href = href;
    link.download = "";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [auto, href]);

  return null;
}
