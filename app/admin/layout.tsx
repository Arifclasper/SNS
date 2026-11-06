import type { Metadata } from "next";
import { STORE_SHORT_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: "Owner console", template: `%s · ${STORE_SHORT_NAME} Owner` },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
