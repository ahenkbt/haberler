import { isEffectivePortalHost } from "@/lib/hmPortalHosts";

/** turk.eco (ve kanonik portal hostları) — haber merkezi + video + arama; süper app modülleri kapalı. */
export function isPortalNewsPlatformHost(host?: string): boolean {
  const h =
    host ??
    (typeof window !== "undefined" ? window.location.hostname : "");
  return isEffectivePortalHost(h);
}

/** Sol admin menüsünden tamamen kaldırılan bölümler. */
export const PORTAL_RETIRED_ADMIN_SECTION_IDS = new Set([
  "odeme",
  "harita",
  "turizm",
  "cagri-merkezi",
]);

/** Portal admininde erişilemez rota önekleri (doğrudan URL dahil). */
export const PORTAL_RETIRED_ADMIN_PATH_PREFIXES = [
  "/admin/odeme",
  "/admin/turizm",
  "/admin/haritalar-yonetimi",
  "/admin/global-map-news",
  "/admin/one-cikan-isletmeler",
  "/admin/yekpare-ai-call",
  "/admin/pbx",
  "/admin/whatsapp",
  "/admin/magaza",
  "/admin/urunler",
  "/admin/urun-kategorileri",
  "/admin/siparisler",
  "/admin/alisveris",
  "/admin/kasiyer",
  "/admin/hizli-kurulum",
  "/admin/servis-saglayicilar",
  "/admin/is-ortaklari",
  "/admin/anasayfa-modulleri",
  "/admin/anasayfa-tasarim",
] as const;

const PORTAL_RETIRED_ADMIN_HREFS = new Set<string>([
  ...PORTAL_RETIRED_ADMIN_PATH_PREFIXES,
]);

/** Görünür admin menü öğeleri — site bölümünden ek kaldırımlar. */
export const PORTAL_RETIRED_ADMIN_MENU_HREFS = new Set<string>([
  "/admin/servis-saglayicilar",
  "/admin/is-ortaklari",
  "/admin/anasayfa-modulleri",
  "/admin/anasayfa-tasarim",
  "/admin/resmi-ilanlar",
]);

/** Public rotalar — HM özel alan ve /tr/{slug} hariç portalda kapatılır. */
const PORTAL_RETIRED_PUBLIC_PREFIXES = [
  "/kesfet",
  "/turizm",
  "/ai-cagri-merkezi",
  "/hizmetler",
  "/firma-rehberi",
  "/isletme-",
  "/isletmeler",
  "/servis-saglayici",
  "/turizm-paneli",
  "/ulasim-paneli",
  "/odeme",
  "/pwastore",
  "/map/",
  "/map",
  "/haritalar",
  "/alisveris",
  "/servisler",
  "/konumagore",
  "/magaza/",
  "/kurye-paneli",
  "/surucu-paneli",
  "/usta-paneli",
  "/servis-paneli",
  "/kasiyer",
  "/sitene-ekle",
  "/is-ortagi",
  "/isletme-basvuru",
  "/isletme-giris",
  "/isletme-paneli",
  "/firma-rehberi-paneli",
  "/rental",
  "/sigorta",
  "/otomotiv",
  "/etkinlik",
  "/demo",
  "/eski",
  "/home-classic",
] as const;

const PORTAL_ALLOWED_PUBLIC_EXACT = new Set([
  "/",
  "/ara",
  "/haberler",
  "/tum-haberler",
  "/sondakika",
  "/yektube",
  "/canlitv",
  "/habermerkezi",
  "/newsmap",
  "/bilgiagaci",
  "/yazarlar",
  "/destek",
  "/sss",
  "/iletisim-kunye",
  "/site-haritalari",
  "/admin",
  "/editor",
  "/giris",
  "/uye-ol",
  "/hesabim",
  "/sifre-sifirla",
  "/sifre-yenile",
  "/kariyer",
  "/lisans-aktivasyon",
]);

function normalizePublicPath(path: string): string {
  const p = (path.split("?")[0] ?? "").trim().toLowerCase();
  if (!p) return "/";
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

export function isPortalRetiredAdminPath(location: string): boolean {
  const path = location.split("?")[0] ?? "";
  return PORTAL_RETIRED_ADMIN_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(prefix),
  );
}

export function isPortalRetiredPublicPath(path: string): boolean {
  const p = normalizePublicPath(path);
  if (PORTAL_ALLOWED_PUBLIC_EXACT.has(p)) return false;
  if (p === "/admin" || p.startsWith("/admin/")) return false;
  if (p === "/editor" || p.startsWith("/editor/")) return false;
  if (p.startsWith("/tr/")) return false;
  if (p.startsWith("/haberler")) return false;
  if (p.startsWith("/tum-haberler")) return false;
  if (p.startsWith("/yektube")) return false;
  if (p.startsWith("/canlitv")) return false;
  if (p.startsWith("/yp/")) return false;
  if (p.startsWith("/yazar")) return false;
  if (p.startsWith("/kategori/")) return false;
  if (p.startsWith("/newsmap")) return false;
  if (p.startsWith("/habermerkezi")) return false;
  if (p.startsWith("/bilgiagaci")) return false;
  if (p.startsWith("/foto-galeri")) return false;
  if (p.startsWith("/resmi-ilanlar")) return false;
  if (p.startsWith("/ara")) return false;
  return PORTAL_RETIRED_PUBLIC_PREFIXES.some(
    (prefix) => p === prefix.replace(/\/$/, "") || p.startsWith(prefix),
  );
}

export function portalRetiredPublicRedirectTarget(path: string): string {
  const p = normalizePublicPath(path);
  if (p.startsWith("/yektube") || p.startsWith("/canlitv") || p.startsWith("/yp/")) return p;
  if (p.startsWith("/habermerkezi")) return p;
  if (p === "/" || p.startsWith("/ara")) return p;
  return "/haberler";
}

export function filterAdminNavForPortalNewsPlatform<T extends { id: string; items: { href: string }[] }>(
  sections: T[],
): T[] {
  return sections
    .filter((sec) => !PORTAL_RETIRED_ADMIN_SECTION_IDS.has(sec.id))
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((it) => !PORTAL_RETIRED_ADMIN_MENU_HREFS.has(it.href)),
    }))
    .filter((sec) => sec.items.length > 0);
}

export function isPortalRetiredAdminHref(href: string): boolean {
  if (PORTAL_RETIRED_ADMIN_HREFS.has(href)) return true;
  return PORTAL_RETIRED_ADMIN_PATH_PREFIXES.some(
    (prefix) => href === prefix || href.startsWith(`${prefix}/`),
  );
}
