import { useState, useEffect, useCallback } from "react";

export interface CartProduct {
  id: number; name: string; price: string; salePrice?: string | null;
  imageUrl?: string | null; slug: string; stock: number;
  vendorId?: number | null;
  vendorName?: string | null; storefrontHref?: string | null;
}

export interface CartItem { product: CartProduct; qty: number; variant?: string }

const CART_KEY = "ahenkpress_cart";

function loadCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]"); } catch { return []; }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  // Also keep sessionStorage in sync for checkout page
  sessionStorage.setItem("checkout_cart", JSON.stringify(items));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => loadCart());

  const persist = useCallback((newItems: CartItem[]) => {
    setItems(newItems);
    saveCart(newItems);
  }, []);

  // Sync on storage events from other tabs
  useEffect(() => {
    const handler = () => setItems(loadCart());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const addItem = useCallback((product: CartProduct, qty = 1, variant?: string) => {
    setItems(prev => {
      const key = `${product.id}__${variant ?? ""}`;
      const existing = prev.find(i => `${i.product.id}__${i.variant ?? ""}` === key);
      const next = existing
        ? prev.map(i => `${i.product.id}__${i.variant ?? ""}` === key ? { ...i, qty: Math.min(i.qty + qty, product.stock || 99) } : i)
        : [...prev, { product, qty, variant }];
      saveCart(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((productId: number, variant?: string) => {
    setItems(prev => {
      const next = prev.filter(i => !(i.product.id === productId && (i.variant ?? "") === (variant ?? "")));
      saveCart(next);
      return next;
    });
  }, []);

  const updateQty = useCallback((productId: number, qty: number, variant?: string) => {
    setItems(prev => {
      const next = qty <= 0
        ? prev.filter(i => !(i.product.id === productId && (i.variant ?? "") === (variant ?? "")))
        : prev.map(i => i.product.id === productId && (i.variant ?? "") === (variant ?? "") ? { ...i, qty } : i);
      saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => { persist([]); }, [persist]);

  const total = items.reduce((s, i) => s + parseFloat(i.product.salePrice ?? i.product.price) * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return { items, addItem, removeItem, updateQty, clearCart, total, count };
}
