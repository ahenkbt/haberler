import { buildSariSayfalarDetailPath } from "./sariSayfalarUtils";

/** Alanlar `/api/map/businesses` yanıtından veya vitrin kartı state'inden gelir. */
export type MapBusinessLinkInput = {
  id: string;
  slug?: string | null;
  isPremium?: boolean | null;
  hasPublicProfile?: boolean | null;
  hasDelivery?: boolean | null;
  hasOnlineOrder?: boolean | null;
  storeType?: string | null;
  discoverHref?: string | null;
  storefrontHref?: string | null;
  hasActiveStorefront?: boolean | null;
};

/** Keşfet özel sayfası veya Sarı Sayfalar detayı — premium/vendor kayıtlar önce Keşfet. */
export function resolveMapBusinessDiscoverHref(biz: MapBusinessLinkInput): string {
  const fromApi = String(biz.discoverHref ?? "").trim();
  if (fromApi.startsWith("/")) return fromApi;
  if (biz.hasPublicProfile || biz.isPremium) {
    const slug = String(biz.slug ?? "").trim();
    if (slug) return `/kesfet/${encodeURIComponent(slug)}`;
    return `/kesfet/isletme/${encodeURIComponent(biz.id)}`;
  }
  return buildSariSayfalarDetailPath(biz);
}

/** Bağlı vendor mağazası — `/siparis/satici/...` veya `/alisveris/magaza/...` */
export function resolveMapBusinessStoreHref(biz: MapBusinessLinkInput): string | null {
  if (biz.hasActiveStorefront === false) return null;
  const fromApi = String(biz.storefrontHref ?? "").trim();
  if (fromApi.startsWith("/")) return fromApi;
  const slug = String(biz.slug ?? "").trim();
  if (!slug) return null;
  const enc = encodeURIComponent(slug);
  const st = String(biz.storeType ?? "").toLowerCase();
  if (["alisveris", "ecommerce", "shop"].includes(st)) return `/alisveris/magaza/${enc}`;
  if (["siparis", "delivery", "restaurant", "restoran"].includes(st) || biz.hasDelivery) {
    return `/siparis/satici/${enc}`;
  }
  if (biz.hasOnlineOrder) return `/alisveris/magaza/${enc}`;
  return null;
}
