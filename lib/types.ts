export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  position: number;
  is_active: number;
  created_at: string;
};

export type CategoryNode = Category & {
  children: CategoryNode[];
  productCount: number;
  totalCount: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  category_id: string;
  image: string | null;
  stock: number;
  low_stock_threshold: number;
  status: string;
  sizes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductWithCategory = Product & {
  category_name: string;
  category_slug: string;
  parent_name: string | null;
  parent_slug: string | null;
};

export type ProductColor = {
  id: string;
  product_id: string;
  name: string;
  image: string | null;
  stock: number;
  position: number;
  created_at: string;
};

export type StockMove = {
  id: string;
  product_id: string;
  delta: number;
  reason: string;
  note: string | null;
  color: string | null;
  order_id: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  code: string;
  public_token: string | null;
  customer_name: string;
  phone: string;
  address: string;
  city: string | null;
  note: string | null;
  status: string;
  subtotal: number;
  shipping: number;
  total: number;
  tracking_id: string | null;
  courier: string | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  color_id: string | null;
  unit_price: number;
  qty: number;
};

/* ------------------------------ homepage hero ----------------------------- */

export type HeroOffer = {
  image: string;
  badge: string;
  title: string;
  href: string;
};

export type HeroSlide = {
  productId: string | null;
  image: string;
  title: string;
  href: string;
};

export type HeroContent = {
  offer: HeroOffer;
  upcoming: HeroSlide;
  carousel: HeroSlide[];
};

export type CartLine = {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  image: string | null;
  size: string | null;
  colorId: string | null;
  color: string | null;
  qty: number;
};
