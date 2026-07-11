/**
 * Google Places (New) `priceLevel` enum'unu kullanıcıya gösterilebilir ₺ seviyesine çevirir.
 * NOT: Google Places API per-oda/gece fiyatı veya envanteri DÖNDÜRMEZ. Bu yalnızca
 * işletmenin genel fiyat seviyesi göstergesidir — gerçek rezervasyon fiyatı değildir.
 */
const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

export function priceLevelToSymbols(priceLevel: string | null | undefined): string | null {
  if (!priceLevel) return null;
  const level = PRICE_LEVEL_MAP[priceLevel.trim().toUpperCase()];
  if (level == null || level <= 0) return null;
  return "₺".repeat(Math.min(4, level));
}

export function priceLevelLabel(priceLevel: string | null | undefined): string | null {
  const symbols = priceLevelToSymbols(priceLevel);
  if (!symbols) return null;
  return `${symbols} · Fiyat seviyesi`;
}
