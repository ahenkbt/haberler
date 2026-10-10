/**
 * Site yönelimi ve RSS kaynak yönelimi.
 * Muhalif (sol) kaynaklar tüm sitelerde (sağ, sol, karma) görünür.
 * İşaretsiz kaynaklar mevcut akışta kalır.
 * Sol sitede muhalif vurgu yalnızca manşet / öne çıkan seçimindedir.
 * Sağ ve karma sitelerde aynı haberler normal akışta, editör AI ılımlı tonla yeniden yazar.
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

/**
 * Ton ve sol manşet önceliği yalnız yönelimi açıkça atanmış sitelerde (yonelim_aktif=true).
 * Mevcut siteler (yonelim_aktif=false) ek kural almaz. null = atanmamış.
 * Muhalif kaynak gizlemesi yok; null bir süzgeç değildir.
 */
export function effectiveSiteYonelim(site: { yonelim?: unknown; yonelimAktif?: unknown } | null | undefined): SiteYonelim | null {
  if (!site || site.yonelimAktif !== true) return null;
  return normalizeSiteYonelim(site.yonelim);
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

export type OppositionSourceRef = {
  url?: string | null;
  link?: string | null;
  href?: string | null;
  rssSourceUrl?: string | null;
  feedUrl?: string | null;
  originUrl?: string | null;
  externalUrl?: string | null;
  kaynakYonelim?: unknown;
};

/** sol işaret veya muhalif host. Görünürlüğü kesmez; manşet önceliği ve ton için. */
export function isOppositionRssSource(source: OppositionSourceRef | null | undefined): boolean {
  if (!source) return false;
  if (normalizeRssKaynakYonelim(source.kaynakYonelim) === "sol") return true;
  return [source.url, source.rssSourceUrl, source.link, source.href, source.feedUrl, source.originUrl, source.externalUrl].some(
    (raw) => isMuhalifRssUrl(raw),
  );
}

/**
 * Muhalif kaynaklar her yönde açıktır. Eski çağrılar gizleme için kullanıyordu;
 * gizleme kaldırıldı, imza durur.
 */
export function rssSourceAllowedForSiteYonelim(
  _source: { url?: string | null; kaynakYonelim?: unknown },
  _siteYonelim: unknown,
): boolean {
  return true;
}

/** Liste süzgeci yok. Dönen dizi aynı referanstır (mevcut akış sırası bozulmaz). */
export function filterItemsForSiteYonelim<T extends { rssSourceUrl?: string | null; link?: string | null }>(
  items: T[],
  _siteYonelim: unknown,
): T[] {
  return items;
}

/**
 * Yalnız yonelim=sol manşet / öne çıkan seçimi: muhalif kaynaklar öne alınır,
 * grupların kendi sırası korunur. Diğer yönlerde ve muhalif yoksa dizi aynen döner.
 * Normal haber listesine uygulanmaz.
 */
export function prioritizeOppositionForManset<T>(items: readonly T[], siteYonelim: unknown): T[] {
  if (normalizeSiteYonelim(siteYonelim) !== "sol" || items.length < 2) return items as T[];
  const lead: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    if (item && typeof item === "object" && isOppositionRssSource(item as OppositionSourceRef)) lead.push(item);
    else rest.push(item);
  }
  if (lead.length === 0 || rest.length === 0) return items as T[];
  return [...lead, ...rest];
}
