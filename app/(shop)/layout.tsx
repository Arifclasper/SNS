import { CartProvider } from "@/components/CartProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getCategoryTree } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const tree = await getCategoryTree();
  const nav = tree.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    children: cat.children.map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
    })),
  }));

  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader categories={nav} />
        <main className="flex-1">{children}</main>
        <SiteFooter categories={tree.map((c) => ({ name: c.name, slug: c.slug }))} />
      </div>
    </CartProvider>
  );
}
