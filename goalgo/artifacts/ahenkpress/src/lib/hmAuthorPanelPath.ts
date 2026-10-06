import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";

function normalizeHost(host: string | null | undefined): string {
  return String(host ?? "")
    .toLowerCase()
    .split(":")[0]
    ?.replace(/^www\./, "")
    .replace(/\.$/, "") ?? "";
}

/**
 * Köşe yazarı paneli yolu.
 * PHP tema özel alanında Worker `/yazar/giris*` `/yazar/haber*` `/yazar/sifre*` sunar;
 * portalda `/tr/{slug}/yazar/...` kalır. `/yazar/a123` kamu sayfasına dokunulmaz.
 */
export function hmAuthorPanelHref(
  slug: string,
  rest: string,
  pageHost?: string | null,
): string {
  const r = String(rest ?? "").replace(/^\/+/, "");
  const host =
    pageHost !== undefined
      ? normalizeHost(pageHost)
      : typeof window !== "undefined"
        ? normalizeHost(window.location.hostname)
        : "";
  if (host && !isDefaultPortalHost(host)) {
    return `/yazar/${r}`;
  }
  const s = String(slug ?? "").trim();
  if (!s) return `/yazar/${r}`;
  return `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(s)}/yazar/${r}`;
}
