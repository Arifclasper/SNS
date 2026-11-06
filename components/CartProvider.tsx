"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartLine } from "@/lib/types";
import { cartLineKey } from "@/lib/utils";

const KEY = "sns_cart_v2";
const LEGACY_KEY = "sns_cart_v1";
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function isObjectId(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_RE.test(value);
}

type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (lineId: string, qty: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function normalized(lines: CartLine[]): CartLine[] {
  return lines
    .filter((line) => isObjectId(line?.productId))
    .map((line) => ({
      ...line,
      size: line.size ?? null,
      colorId: isObjectId(line.colorId) ? line.colorId : null,
      color: line.color ?? null,
    }));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_KEY);
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLines(normalized(parsed));
      }
    } catch {
      /* ignore corrupt cart */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const add = useCallback((line: Omit<CartLine, "qty">, qty = 1) => {
    const addSize = line.size ?? null;
    const addColorId = line.colorId ?? null;
    const addKey = cartLineKey(line.productId, addSize, addColorId);
    setLines((current) => {
      const existing = current.find(
        (l) => cartLineKey(l.productId, l.size, l.colorId) === addKey,
      );
      if (existing) {
        return current.map((l) =>
          cartLineKey(l.productId, l.size, l.colorId) === addKey
            ? { ...l, qty: l.qty + qty }
            : l,
        );
      }
      return [...current, { ...line, size: addSize, colorId: addColorId, qty }];
    });
  }, []);

  const setQty = useCallback((lineId: string, qty: number) => {
    setLines((current) =>
      qty <= 0
        ? current.filter((l) => cartLineKey(l.productId, l.size, l.colorId) !== lineId)
        : current.map((l) =>
            cartLineKey(l.productId, l.size, l.colorId) === lineId ? { ...l, qty } : l,
          ),
    );
  }, []);

  const remove = useCallback((lineId: string) => {
    setLines((current) =>
      current.filter((l) => cartLineKey(l.productId, l.size, l.colorId) !== lineId),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, l) => sum + l.qty, 0);
    const subtotal = lines.reduce((sum, l) => sum + l.qty * l.price, 0);
    return { lines, ready, count, subtotal, add, setQty, remove, clear };
  }, [lines, ready, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
