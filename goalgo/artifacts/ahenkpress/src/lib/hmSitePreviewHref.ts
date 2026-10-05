import {
  hmPublicSiteOrigin,
  resolveHmPublicDomainFromSite,
  type HmSiteDomainFields,
} from "@/lib/hmPublicLinks";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

export type HmPreviewSite = HmSiteDomainFields & { slug?: string | null };

/**
 * Panel "Vitrinde önizle" bağlantıları için sitenin yayın kökü.
 * Özel alanı olan siteler (ör. ankarasehirgazetesi.com → PHP tema) `https://alan` döner;
 * alan yoksa null (portal `/tr/{slug}` şekli kullanılır).
 */
export function hmSitePreviewOrigin(site: HmPreviewSite | null | undefined, pageHost?: string): string | null {
  if (!site) return null;
  return hmPublicSiteOrigin(resolveHmPublicDomainFromSite(site, pageHost));
}

/** Haber / köşe yazısı önizleme öneki: `https://alan/haber` ya da `/tr/{slug}/haber`. */
export function hmSiteNewsPreviewHrefPrefix(site: HmPreviewSite | null | undefined, pageHost?: string): string | null {
  const origin = hmSitePreviewOrigin(site, pageHost);
  if (origin) return `${origin}/haber`;
  const slug = String(site?.slug ?? "").trim();
  return slug ? `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(slug)}/haber` : null;
}

/** Yazar sayfası: PHP tema `/yazar/a{id}`; portal `/tr/{slug}/yazar/{id}`. */
export function hmSiteAuthorPreviewHref(
  site: HmPreviewSite | null | undefined,
  authorId: number | string,
  pageHost?: string,
): string | null {
  const id = String(authorId ?? "").trim();
  if (!/^\d+$/.test(id)) return null;
  const origin = hmSitePreviewOrigin(site, pageHost);
  if (origin) return `${origin}/yazar/a${id}`;
  const slug = String(site?.slug ?? "").trim();
  return slug ? `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(slug)}/yazar/${id}` : null;
}

/** Tam URL (`https://…`) wouter `Link` ile açılamaz; düz `<a>` gerekir. */
export function isAbsolutePreviewHref(href: string | null | undefined): boolean {
  return /^https?:\/\//i.test(String(href ?? ""));
}
