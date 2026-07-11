import { resolveClientMediaSrc } from "@/lib/apiBase";
import { hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { applyHmSiteBranding, applyHmPublisherStructuredData, upsertHmGeoMeta } from "@/lib/pageSeo";
import { parseNewsSiteLayoutFromJson } from "@/lib/newsSiteLayout";
import {
  hmSiteDisplayNameFromMeta,
  hmSiteIconUrlFromLayout,
  type HmNestedMetaCached,
} from "@/lib/hmNestedMetaStorage";

export function hmSiteBrandingIconUrl(layoutPrefs: {
  faviconUrl?: string | null;
  logoUrl?: string | null;
}): string | null {
  const fav = layoutPrefs.faviconUrl?.trim();
  if (fav) return fav;
  const logo = layoutPrefs.logoUrl?.trim();
  return logo || null;
}

function upsertMetaProperty(key: string, content: string): void {
  let el = document.head.querySelector(`meta[property="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertMetaName(key: string, content: string): void {
  let el = document.head.querySelector(`meta[name="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** API/meta önbelleğinden sekme başlığı + favicon + temel OG (ilk boyamadan önce). */
export function applyHmEarlyBrandingFromMeta(meta: HmNestedMetaCached, pathSlug?: string): void {
  if (typeof document === "undefined") return;
  try {
    const slug = pathSlug?.trim() || meta.slug;
    const layoutPrefs = parseNewsSiteLayoutFromJson(
      meta.layout != null ? JSON.stringify(meta.layout) : null,
      slug,
    );
    const rawIcon = hmSiteBrandingIconUrl(layoutPrefs) ?? hmSiteIconUrlFromLayout(meta.layout);
    const iconResolved = rawIcon ? resolveClientMediaSrc(rawIcon) || rawIcon : null;
    const siteName = hmSiteDisplayNameFromMeta(meta);
    const siteOrigin = hmPublicSiteOrigin(meta.domain) ?? window.location.origin;
    applyHmSiteBranding({
      logoUrl: iconResolved,
      siteOrigin,
      domain: meta.domain,
      siteDisplayName: siteName,
    });
    const root = document.documentElement;
    const theme = layoutPrefs.hmVitrinTheme;
    if (theme) root.setAttribute("data-hm-vitrin-theme-early", theme);
    else root.removeAttribute("data-hm-vitrin-theme-early");
    const mansetVariant = layoutPrefs.mansetVariant;
    if (mansetVariant) root.setAttribute("data-hm-manset-variant-early", mansetVariant);
    else root.removeAttribute("data-hm-manset-variant-early");
    const description =
      String(meta.description ?? "").trim() ||
      `${siteName} güncel haberler, duyurular ve köşe yazıları`;
    const title = `${siteName} — Haber`;
    const shareImage = iconResolved
      ? iconResolved.startsWith("http")
        ? iconResolved
        : `${siteOrigin.replace(/\/+$/, "")}${iconResolved.startsWith("/") ? iconResolved : `/${iconResolved}`}`
      : `${siteOrigin.replace(/\/+$/, "")}/apple-touch-icon.png`;
    const canonicalUrl = `${siteOrigin.replace(/\/+$/, "")}${window.location.pathname || "/"}`;

    document.title = title;
    upsertMetaName("description", description.slice(0, 320));
    upsertMetaProperty("og:site_name", siteName);
    upsertMetaProperty("og:title", title);
    upsertMetaProperty("og:description", description.slice(0, 300));
    upsertMetaProperty("og:url", canonicalUrl);
    upsertMetaProperty("og:image", shareImage);
    upsertMetaName("twitter:title", title);
    upsertMetaName("twitter:description", description.slice(0, 200));
    upsertMetaName("twitter:image", shareImage);
    upsertHmGeoMeta();
    applyHmPublisherStructuredData({
      siteName,
      siteUrl: siteOrigin,
      siteDescription: description,
      logoUrl: iconResolved,
    });
    const ap = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (ap) ap.setAttribute("content", siteName);

    /* HM vitrin — gece/Yekpare body rengi yerine açık zemin (mobil PTR / açılış flash). */
    const pageBg = "#ffffff";
    document.documentElement.style.backgroundColor = pageBg;
    document.body.style.backgroundColor = pageBg;
    let themeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!themeColor) {
      themeColor = document.createElement("meta");
      themeColor.setAttribute("name", "theme-color");
      document.head.appendChild(themeColor);
    }
    themeColor.setAttribute("content", pageBg);
  } catch {
    /* bozuk önbellek / layout — sayfa render'ını düşürme */
  }
}
