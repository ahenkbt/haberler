import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import {
  hmPublicSiteOrigin as hmOriginFromDomain,
  resolveHmPublicDomainFromSite,
  type HmSiteDomainFields,
} from "@/lib/hmPublicLinks";
import { PORTAL_ORIGIN } from "@/lib/portalBrand";

/**
 * Panel (editör / yazar / admin) → gerçek vitrin bağlantıları.
 *
 * Özel alan adı tanımlı sitelerde vitrin artık sunucu tarafındaki PHP temadan
 * yayınlanır; SPA yalnızca `/editor`, `/admin`, `/api` vb. yolları taşır. Bu
 * yüzden panelden verilen her "siteyi gör / önizle" bağlantısı mutlak URL ile
 * **tam sayfa** gezinme yapmalıdır (wouter `Link` pushState ile SPA içinde eski
 * TSX temayı açar). Özel alan yoksa portal kökü `https://ahenk.net.tr/tr/{slug}`
 * yine mutlak verilir ki istemci tarafı yönlendirme olmasın.
 */
export type HmPublicSiteRef = HmSiteDomainFields & { slug?: string | null };

export type HmPublicSiteUrlOpts = {
  /** Test / SSR için sayfa hostu; verilmezse `window.location.hostname`. */
  pageHost?: string | null;
  /** Test / SSR için sayfa kökü; verilmezse `window.location.origin`. */
  pageOrigin?: string | null;
};

function normalizeHost(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/:\d+$/, "");
}

function currentPageHost(opts?: HmPublicSiteUrlOpts): string {
  if (opts && opts.pageHost !== undefined) return String(opts.pageHost ?? "");
  return typeof window !== "undefined" ? window.location.hostname : "";
}

function currentPageOrigin(opts?: HmPublicSiteUrlOpts): string {
  if (opts && opts.pageOrigin !== undefined) return String(opts.pageOrigin ?? "");
  return typeof window !== "undefined" ? window.location.origin : "";
}

function encodePathSegment(value: string | number): string {
  return encodeURIComponent(String(value).trim());
}

/**
 * Sitenin özel alan adı kökü (`https://ankarasehirgazetesi.com`); yoksa `null`.
 * Ziyaretçi zaten sitenin kayıtlı alan adlarından birindeyse o sayfa kökü kullanılır.
 */
export function hmPublicSiteOrigin(
  site: HmPublicSiteRef | null | undefined,
  opts?: HmPublicSiteUrlOpts,
): string | null {
  if (!site) return null;
  const pageHost = currentPageHost(opts);
  const domain = resolveHmPublicDomainFromSite(site, pageHost);
  const origin = hmOriginFromDomain(domain);
  if (!origin) return null;
  const pageOrigin = currentPageOrigin(opts);
  if (pageOrigin && pageHost && normalizeHost(pageHost) === normalizeHost(new URL(origin).hostname)) {
    return pageOrigin;
  }
  return origin;
}

/** Özel alan yoksa portal üzerindeki mutlak site kökü: `https://ahenk.net.tr/tr/{slug}`. */
export function hmPublicPortalSiteBase(site: HmPublicSiteRef | null | undefined): string {
  const slug = String(site?.slug ?? "").trim();
  if (!slug) return PORTAL_ORIGIN;
  return `${PORTAL_ORIGIN}/${HM_SITE_PUBLIC_PREFIX}/${encodePathSegment(slug)}`;
}

/** Vitrin yolu için taban: özel alan kökü ya da portal `/tr/{slug}` kökü (sonunda `/` yok). */
export function hmPublicSiteBase(site: HmPublicSiteRef | null | undefined, opts?: HmPublicSiteUrlOpts): string {
  return hmPublicSiteOrigin(site, opts) ?? hmPublicPortalSiteBase(site);
}

/** Vitrin ana sayfası. */
export function hmPublicHomeHref(site: HmPublicSiteRef | null | undefined, opts?: HmPublicSiteUrlOpts): string {
  const origin = hmPublicSiteOrigin(site, opts);
  if (origin) return `${origin}/`;
  return hmPublicPortalSiteBase(site);
}

/** Vitrinde istenen yol (`/video-tv`, `/foto-galeri`, `/sayfa/kunye` ...). */
export function hmPublicPathHref(
  site: HmPublicSiteRef | null | undefined,
  path: string,
  opts?: HmPublicSiteUrlOpts,
): string {
  const raw = String(path ?? "").trim();
  if (!raw || raw === "/") return hmPublicHomeHref(site, opts);
  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  return `${hmPublicSiteBase(site, opts)}${normalized}`;
}

/** Haber detayı: `/haber/{slug}`. */
export function hmPublicNewsHref(
  site: HmPublicSiteRef | null | undefined,
  newsSlugOrId: string | number,
  opts?: HmPublicSiteUrlOpts,
): string {
  return `${hmPublicSiteBase(site, opts)}/haber/${encodePathSegment(newsSlugOrId)}`;
}

/** Kategori: `/kategori/{slug}`. */
export function hmPublicCategoryHref(
  site: HmPublicSiteRef | null | undefined,
  categorySlug: string,
  opts?: HmPublicSiteUrlOpts,
): string {
  return `${hmPublicSiteBase(site, opts)}/kategori/${encodePathSegment(categorySlug)}`;
}

/** Yazarlar listesi: `/yazarlar`. */
export function hmPublicAuthorsHref(site: HmPublicSiteRef | null | undefined, opts?: HmPublicSiteUrlOpts): string {
  return `${hmPublicSiteBase(site, opts)}/yazarlar`;
}

/**
 * Yazar sayfası. PHP tema `/yazar/a{id}` biçimini kullanır; portal SPA yedeğinde
 * (`/tr/{slug}/yazar/:authorKey`) sayısal kimlik beklenir.
 */
export function hmPublicAuthorHref(
  site: HmPublicSiteRef | null | undefined,
  authorId: number | string,
  opts?: HmPublicSiteUrlOpts,
): string {
  const key = String(authorId).trim();
  const numeric = /^\d+$/.test(key);
  const origin = hmPublicSiteOrigin(site, opts);
  if (origin) {
    return `${origin}/yazar/${numeric ? `a${key}` : encodePathSegment(key)}`;
  }
  return `${hmPublicPortalSiteBase(site)}/yazar/${encodePathSegment(key)}`;
}
