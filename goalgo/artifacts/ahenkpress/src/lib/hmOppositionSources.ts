/**
 * Muhalif RSS host listesi. Sunucu listesiyle aynı tutulur:
 * goalgo/artifacts/api-server/src/lib/hm-rss-kaynak-yonelim.ts
 * Görünürlüğü kesmez. Yalnız sol site manşet / öne çıkan seçiminde öncelik için.
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

function isMuhalifRssHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  if (!host) return false;
  return MUHALIF_RSS_HOSTS.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

function isMuhalifRssUrl(raw: unknown): boolean {
  const text = String(raw ?? "").trim();
  if (!/^https?:\/\//i.test(text)) return false;
  try {
    return isMuhalifRssHostname(new URL(text).hostname);
  } catch {
    return false;
  }
}

export function isOppositionNewsItem(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const row = item as {
    kaynakYonelim?: unknown;
    rssSourceUrl?: unknown;
    url?: unknown;
    link?: unknown;
    href?: unknown;
    feedUrl?: unknown;
    originUrl?: unknown;
    externalUrl?: unknown;
  };
  const marked = String(row.kaynakYonelim ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g");
  if (marked === "sol") return true;
  return [row.rssSourceUrl, row.url, row.link, row.href, row.feedUrl, row.originUrl, row.externalUrl].some((raw) =>
    isMuhalifRssUrl(raw),
  );
}

/** Sol manşet: muhalifler öne, kendi iç sırası korunur. Muhalif yoksa aynı dizi. */
export function prioritizeOppositionHeadlineItems<T>(items: readonly T[]): T[] {
  if (items.length < 2) return items as T[];
  const lead: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    if (isOppositionNewsItem(item)) lead.push(item);
    else rest.push(item);
  }
  if (lead.length === 0 || rest.length === 0) return items as T[];
  return [...lead, ...rest];
}

export function sitePrefersOppositionManset(yonelim: unknown): boolean {
  const v = String(yonelim ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g");
  return v === "sol" || v === "left";
}
