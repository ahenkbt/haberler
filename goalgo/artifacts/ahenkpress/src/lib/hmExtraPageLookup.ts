import type { HmExtraPage } from "@/lib/newsSiteLayout";

export const HM_STANDARD_PAGE_SLUGS = ["kunye", "iletisim", "reklam", "abonelik", "telif-kullanim"] as const;

export type HmStandardPageSlug = (typeof HM_STANDARD_PAGE_SLUGS)[number];

/** `/tr/:site/:segment` — özel sayfa rotasına düşmemesi gereken sistem segmentleri. */
export const HM_RESERVED_HM_ROUTE_SEGMENTS = new Set([
  "etiket",
  "etiketler",
  "tag",
  "haber",
  "yazar",
  "yazarlar",
  "kategori",
  "tum-haberler",
  "sondakika",
  "kisa-kisa",
  "rss-baglantilari",
  "sitene-ekle",
  "savaslar",
  "milli-gunler",
  "kultur-portali",
  "ataturk",
  "foto-galeri",
  "video-tv",
  "yemek-tarifleri",
  "sayfa",
  "ansiklopedi",
  "bilgiagaci",
  "haritalar",
  "ara",
  "editor",
  "api",
]);

export function normalizeHmExtraPageSlug(raw: string): string {
  return String(raw ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

export function findHmExtraPageBySlug(
  pages: HmExtraPage[] | null | undefined,
  slug: string,
): HmExtraPage | undefined {
  const wanted = normalizeHmExtraPageSlug(slug);
  return (pages ?? []).find((p) => p.enabled && normalizeHmExtraPageSlug(p.slug) === wanted);
}

/** Vitrin sayfa yolu: `/tr/{site}/{slug}` ( `/sayfa/` yok ). */
export function hmPublicExtraPagePath(slug: string): string {
  const s = slug.trim().replace(/^\/+|\/+$/g, "");
  if (!s) return "";
  return `/${encodeURIComponent(s)}`;
}

export function hmPublicExtraPagePreviewHref(hmBase: string, slug: string): string {
  const path = hmPublicExtraPagePath(slug);
  if (!hmBase || !path) return "";
  return `${hmBase}${path}`;
}

export function isHmReservedRouteSegment(segment: string): boolean {
  const norm = normalizeHmExtraPageSlug(segment);
  return HM_RESERVED_HM_ROUTE_SEGMENTS.has(norm);
}

/** Tek segmentli vitrin yolu özel sayfa adayı mı (ör. `/hakkimizda`). */
export function isLikelyHmExtraPagePublicPath(pathname: string): boolean {
  const p = (pathname || "/").split("?")[0]?.replace(/\/+$/, "") || "/";
  if (p === "/") return false;
  const parts = p.split("/").filter(Boolean);
  if (parts.length !== 1) return false;
  const seg = parts[0] ?? "";
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(seg)) return false;
  return !isHmReservedRouteSegment(seg);
}
