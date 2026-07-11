export function parseOrderLineItemId(item: Record<string, unknown>): number | null {
  for (const key of ["menuItemId", "menu_item_id", "id", "productId", "product_id"]) {
    const raw = item[key];
    const n = parseInt(String(raw ?? ""), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export function parseOrderLineQuantity(item: Record<string, unknown>): number {
  const raw = item.qty ?? item.quantity ?? item.q ?? 1;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Aynı ürün satırlarını toplar (menu item id → adet). */
export function aggregateMenuItemQuantities(items: Array<Record<string, unknown>>): Map<number, number> {
  const map = new Map<number, number>();
  for (const item of items) {
    const id = parseOrderLineItemId(item);
    const qty = parseOrderLineQuantity(item);
    if (id == null || qty <= 0) continue;
    map.set(id, (map.get(id) ?? 0) + qty);
  }
  return map;
}

export function aggregateProductQuantities(items: Array<{ productId: number; qty: number }>): Map<number, number> {
  const map = new Map<number, number>();
  for (const item of items) {
    const id = Number(item.productId);
    const qty = Number(item.qty);
    if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(qty) || qty <= 0) continue;
    map.set(id, (map.get(id) ?? 0) + qty);
  }
  return map;
}
