/** Harici QR görseli (api.qrserver.com). */
export function qrCodeImageUrl(targetUrl: string, size = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(targetUrl)}&size=${size}x${size}&bgcolor=ffffff&color=1e1b4b&qzone=2`;
}

/** Masaya sipariş / QR menü hedef URL (işletme + isteğe bağlı masa/bölüm). */
export function buildVendorTableOrderUrl(params: {
  origin: string;
  slug: string;
  tableServiceEnabled: boolean;
  qrMenuPublic: boolean;
  sectionId?: string;
}): string {
  const { origin, slug, tableServiceEnabled, qrMenuPublic, sectionId } = params;
  const enc = encodeURIComponent(slug);
  const q = new URLSearchParams();
  if (sectionId) q.set("masa", sectionId);
  if (tableServiceEnabled && qrMenuPublic) {
    const qs = q.toString();
    return `${origin}/siparis/qr-menu/${enc}${qs ? `?${qs}` : ""}`;
  }
  q.set("teslimat", "masa");
  const qs = q.toString();
  return `${origin}/siparis/satici/${enc}?${qs}#menu`;
}
