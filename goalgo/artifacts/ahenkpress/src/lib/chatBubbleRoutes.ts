/**
 * Floating sipariş/sohbet balonu (ChatBubble) — yalnızca mağaza/sipariş işlem bağlamında.
 * Genel servis vitrinleri, haber, harita, keşfet vb. sayfalarda gösterilmez.
 */

const PROVIDER_PANEL_PREFIXES = [
  "/servis-saglayici-paneli",
  "/turizm-paneli",
  "/ulasim-paneli",
  "/isletme-paneli",
  "/firma-rehberi-paneli",
  "/surucu-paneli",
  "/kurye-paneli",
  "/kasiyer",
] as const;

/** Mağaza vitrin, ürün, sepet/ödeme ve sipariş takip rotaları */
const STORE_TRANSACTION_PATTERNS: RegExp[] = [
  /^\/siparis\/(?:satici|isletme)\/[^/]+(?:\/.*)?$/,
  /^\/alisveris\/magaza\/[^/]+(?:\/.*)?$/,
  /^\/magaza\/(?:urun|magaza)\/[^/]+$/,
  /^\/magaza\/(?:sepet|odeme)$/,
  /^\/odeme$/,
  /^\/siparis-takip(?:\/[^/]+)?$/,
  /^\/siparislerim$/,
  /^\/takip(?:\/[^/]+)?$/,
  /^\/turizm\/rezervasyon\/[^/]+$/,
  /^\/turizm\/tur\/[^/]+$/,
  /^\/turizm\/destinasyon\/[^/]+$/,
  /^\/turizm\/[^/]+\/[^/]+(?:\/.*)?$/,
];

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Turizm kategori hub'ları (slug yok) — sohbet balonu yok */
const TURIZM_HUB_ONLY = new Set([
  "konaklama",
  "villa-ev",
  "arac-kiralama",
  "yat-turlari",
  "turlar",
  "etkinlik",
  "ucus",
  "otobus",
  "destinasyonlar",
  "liste",
  "hotel",
  "car",
  "boat",
  "villa",
  "space",
  "uzay",
]);

function isTurizmHubOnly(path: string): boolean {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "turizm") return false;
  if (parts.length === 1) return true;
  if (parts.length === 2 && TURIZM_HUB_ONLY.has(parts[1])) return true;
  return false;
}

/**
 * Kullanıcı aktif alışveriş/sipariş/rezervasyon işlemi yaptığı mağaza veya sağlayıcı sayfası mı?
 */
export function isStoreTransactionRoute(pathNoQuery: string): boolean {
  const p = (pathNoQuery || "/").trim();
  if (!p || p === "/" || p === "/home" || p === "/servisler") return false;
  if (p.startsWith("/siparis/qr-menu/")) return false;
  if (p.startsWith("/admin") || p.startsWith("/editor") || p.startsWith("/pbx")) return false;
  if (isTurizmHubOnly(p)) return false;
  if (p === "/turizm" || p === "/siparis" || p === "/magaza" || p === "/alisveris") return false;
  if (p === "/yemek" || p === "/market" || p === "/isletmeler" || p === "/ulasim") return false;

  for (const prefix of PROVIDER_PANEL_PREFIXES) {
    if (matchesPrefix(p, prefix)) return true;
  }

  return STORE_TRANSACTION_PATTERNS.some((re) => re.test(p));
}

/** @deprecated use isStoreTransactionRoute — geriye dönük uyumluluk */
export function isChatBubbleRoute(pathNoQuery: string): boolean {
  return isStoreTransactionRoute(pathNoQuery);
}

export function shouldShowChatBubble(pathNoQuery: string): boolean {
  return isStoreTransactionRoute(pathNoQuery);
}
