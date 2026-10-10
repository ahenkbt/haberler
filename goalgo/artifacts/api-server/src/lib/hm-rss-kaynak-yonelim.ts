/**
 * Site yönelimi ve RSS kaynak yönelimi.
 * Muhalif (sol) kaynaklar yalnız yonelim=sol sitelere dağılır.
 * İşaretsiz kaynaklar mevcut akışta kalır (sağ, sol, karma).
 */

export const SITE_YONELIM_VALUES = ["sag", "sol", "karma"] as const;
export type SiteYonelim = (typeof SITE_YONELIM_VALUES)[number];
export type RssKaynakYonelim = SiteYonelim;

/**
 * Muhalif yayınlar. Alt alan adları da sayılır (www, rss, haber…).
 * Liste dışı adresler işaretsizdir; mevcut RSS akışı bozulmaz.
 */
export const MUHALIF_RSS_HOSTS = [
  "birgun.net",
  "evrensel.net",
  "diken.com.tr",
  "medyascope.tv",
  "bianet.org",
  "artigercek.com",
  "artigercek.com.tr",
  "karar.com",
  "karar.com.tr",
  "sol.org.tr",
  "kronos36.news",
  "kronos36.com",
  "kronoshaber.com",
  "kronoshaber.tr",
  "cumhuriyet.com.tr",
] as const;

export function normalizeSiteYonelim(raw: unknown): SiteYonelim {
  const v = String(raw ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g");
  if (v === "sag" || v === "right") return "sag";
  if (v === "sol" || v === "left") return "sol";
  if (v === "karma") return "karma";
  return "karma";
}

/** Geçersiz açık değer null döner (API 400). Boş değer varsayılan karma. */
export function parseSiteYonelim(raw: unknown): SiteYonelim | null {
  if (raw == null || String(raw).trim() === "") return "karma";
  const v = String(raw)
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g");
  if (v === "sag" || v === "right") return "sag";
  if (v === "sol" || v === "left") return "sol";
  if (v === "karma") return "karma";
  return null;
}

export function normalizeRssKaynakYonelim(raw: unknown): RssKaynakYonelim | null {
  if (raw == null || String(raw).trim() === "") return null;
  const v = String(raw)
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g");
  if (v === "sag") return "sag";
  if (v === "sol") return "sol";
  if (v === "karma") return "karma";
  return null;
}

export function isMuhalifRssHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  if (!host) return false;
  return MUHALIF_RSS_HOSTS.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

export function isMuhalifRssUrl(raw: unknown): boolean {
  const text = String(raw ?? "").trim();
  if (!/^https?:\/\//i.test(text)) return false;
  try {
    return isMuhalifRssHostname(new URL(text).hostname);
  } catch {
    return false;
  }
}

/** Postgres `~` ile aynı kalıp. İşaretsiz / merkez anahtarları eşleşmez. */
export function muhalifRssUrlPatternSource(): string {
  const alt = MUHALIF_RSS_HOSTS.map((host) => host.replace(/\./g, "\\.")).join("|");
  return `^https?://([^/]*\\.)?(${alt})(:\\d+)?(/|$)`;
}

export function isMuhalifRssUrlByPattern(raw: unknown): boolean {
  const text = String(raw ?? "").trim().toLowerCase();
  if (!text) return false;
  return new RegExp(muhalifRssUrlPatternSource(), "i").test(text);
}

/**
 * sol işaretli veya muhalif host: yalnız sol site.
 * sag/karma işareti ve işaretsiz adres: her site (mevcut akış).
 */
export function rssSourceAllowedForSiteYonelim(
  source: { url?: string | null; kaynakYonelim?: unknown },
  siteYonelim: unknown,
): boolean {
  const marked = normalizeRssKaynakYonelim(source.kaynakYonelim);
  const opposition = marked === "sol" || isMuhalifRssUrl(source.url);
  if (!opposition) return true;
  return normalizeSiteYonelim(siteYonelim) === "sol";
}

export function filterItemsForSiteYonelim<T extends { rssSourceUrl?: string | null; link?: string | null }>(
  items: T[],
  siteYonelim: unknown,
): T[] {
  if (normalizeSiteYonelim(siteYonelim) === "sol") return items;
  return items.filter((item) =>
    rssSourceAllowedForSiteYonelim({ url: item.rssSourceUrl || item.link || null }, siteYonelim),
  );
}
