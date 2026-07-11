/** Travlla paketinde görseller yok — Unsplash + Yekpare demo görselleri */
export const TRV_HERO_VIDEO =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80";

export const TRV_INNER_BANNER =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80";

export const TRV_DEST_IMAGES: Record<string, string> = {
  antalya: "https://images.unsplash.com/photo-1589561253831-b8421dd58261?w=900&q=80",
  istanbul: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=900&q=80",
  kapadokya: "https://images.unsplash.com/photo-1570633774822-44f52c0b3455?w=900&q=80",
  bodrum: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=900&q=80",
  fethiye: "https://images.unsplash.com/photo-1602002418082-dd4a3f5b3f5e?w=900&q=80",
  trabzon: "https://images.unsplash.com/photo-1596484552834-065fdc54d390?w=900&q=80",
  pamukkale: "https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=900&q=80",
  izmir: "https://images.unsplash.com/photo-1569336410468-a4d64ed5c3df?w=900&q=80",
};

export function trvImageFor(cityOrSlug: string, fallback?: string | null): string {
  const key = cityOrSlug
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "");
  return TRV_DEST_IMAGES[key] || fallback || TRV_INNER_BANNER;
}

export function formatTrvPrice(value: string | number | null | undefined, unit?: string): string {
  const n = Number(value ?? 0);
  if (!n) return "Teklif alın";
  const formatted = n.toLocaleString("tr-TR");
  const unitMap: Record<string, string> = {
    gece: "gece",
    gün: "gün",
    gun: "gün",
    kişi: "kişi",
    kisi: "kişi",
    person: "kişi",
    night: "gece",
    day: "gün",
  };
  const u = unit ? unitMap[unit] || unit : "";
  return u ? `${formatted}₺ / ${u}` : `${formatted}₺`;
}

export function priceUnitLabel(unit: string): string {
  const m: Record<string, string> = {
    gece: "gece",
    gün: "gün",
    gun: "gün",
    kişi: "kişi başı",
    kisi: "kişi başı",
    person: "kişi başı",
    night: "gece",
    day: "gün",
  };
  return m[unit] || unit;
}
