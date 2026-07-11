import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

/** HM vitrin: `/tr/{siteSlug}/bilgiagaci` ve alt rotalar. */
export function isHmBilgiAgaciPublicPath(pathname: string): boolean {
  const path = String(pathname ?? "").split("?")[0]?.replace(/\/+$/, "") ?? "";
  return new RegExp(`^/${HM_SITE_PUBLIC_PREFIX}/[^/]+/bilgiagaci(?:/|$)`, "i").test(path);
}

/** Bilgi Ağacı kategori şeridi yüksekliği — son dakika sticky `top` telafisi. */
export const HM_BILGI_AGACI_CHROME_BAND_HEIGHT_PX = 48;
