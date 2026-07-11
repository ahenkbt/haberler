export type MarketplaceCheckoutLine = {
  vendorId?: number;
  menuItemId?: number;
  id?: number;
  name?: string;
  price?: number | string;
  qty?: number;
  quantity?: number;
  variant?: string;
};

export function parseMarketplaceLineId(line: MarketplaceCheckoutLine): number | null {
  const raw = line.menuItemId ?? line.id;
  const n = parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseMarketplaceLineQty(line: MarketplaceCheckoutLine): number {
  const n = parseInt(String(line.qty ?? line.quantity ?? 1), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function parseMarketplaceLinePrice(line: MarketplaceCheckoutLine): number {
  const n = parseFloat(String(line.price ?? "0").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function groupMarketplaceLinesByVendor(
  lines: MarketplaceCheckoutLine[],
  vendorIdByMenuItem: Map<number, number>,
): Map<number, MarketplaceCheckoutLine[]> {
  const map = new Map<number, MarketplaceCheckoutLine[]>();
  for (const line of lines) {
    const menuItemId = parseMarketplaceLineId(line);
    if (menuItemId == null) continue;
    const vendorId =
      line.vendorId != null && Number.isFinite(Number(line.vendorId)) && Number(line.vendorId) > 0
        ? Number(line.vendorId)
        : vendorIdByMenuItem.get(menuItemId);
    if (vendorId == null || vendorId <= 0) continue;
    const bucket = map.get(vendorId) ?? [];
    bucket.push(line);
    map.set(vendorId, bucket);
  }
  return map;
}

export function computeEcommerceShippingFee(
  subtotal: number,
  shippingFee: number,
  freeShippingAbove: number,
): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  if (!Number.isFinite(shippingFee) || shippingFee <= 0) return 0;
  if (Number.isFinite(freeShippingAbove) && freeShippingAbove > 0 && subtotal >= freeShippingAbove) return 0;
  return shippingFee;
}

export function marketplaceLineSubtotal(lines: MarketplaceCheckoutLine[]): number {
  return lines.reduce((sum, line) => sum + parseMarketplaceLinePrice(line) * parseMarketplaceLineQty(line), 0);
}
