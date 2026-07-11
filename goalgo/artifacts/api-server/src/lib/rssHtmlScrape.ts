export type ScrapedListingItem = {
  title: string;
  link: string;
  imageUrl: string | null;
  description: string;
};

const HTML_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8",
};

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function extractTitleFromArticleHtml(html: string): string | null {
  const metaOg =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1];
  if (metaOg) {
    const t = decodeHtmlEntities(metaOg);
    if (t.length >= 5) return t;
  }
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (h1) {
    const t = decodeHtmlEntities(h1.replace(/<[^>]+>/g, " "));
    if (t.length >= 5) return t;
  }
  return null;
}

function slugToTitle(slug: string): string {
  const base = slug.replace(/-\d+-haberi$/i, "").replace(/-haberi$/i, "");
  if (!base) return "";
  return decodeHtmlEntities(
    base
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
  );
}

function isArticlePath(pathname: string): boolean {
  return /-haberi\/?$/i.test(pathname) || /\/haber\//i.test(pathname);
}

function isListingPagePath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  if (segments.length === 1 && !isArticlePath(pathname)) return true;
  return segments.length >= 1 && !segments.some((s) => /-haberi$/i.test(s));
}

/** Haberler.com kart yapısı: anchor + title + görsel. */
function extractHaberlerCards(html: string, baseUrl: string, limit: number): ScrapedListingItem[] {
  const items: ScrapedListingItem[] = [];
  const seen = new Set<string>();
  const cardRe =
    /<a\s+href="([^"]+-haberi\/?)"[^>]*title="([^"]*)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = cardRe.exec(html)) !== null && items.length < limit) {
    let link: string;
    try {
      link = new URL(m[1]!, baseUrl).href;
    } catch {
      continue;
    }
    if (seen.has(link)) continue;
    seen.add(link);
    const title = decodeHtmlEntities(m[2] ?? "").slice(0, 300);
    if (title.length < 5) continue;
    const imageUrl = m[3]?.startsWith("http") ? m[3]! : null;
    items.push({ title, link, imageUrl, description: title });
  }
  return items;
}

function extractGenericArticleLinks(html: string, baseUrl: string, limit: number): ScrapedListingItem[] {
  const items: ScrapedListingItem[] = [];
  const seen = new Set<string>();
  const hrefRe = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*(?:title=["']([^"']*)["'])?[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null && items.length < limit) {
    let link: string;
    try {
      link = new URL(m[1]!, baseUrl).href;
    } catch {
      continue;
    }
    const path = new URL(link).pathname;
    if (!isArticlePath(path)) continue;
    if (seen.has(link)) continue;
    seen.add(link);
    const titleAttr = decodeHtmlEntities(m[2] ?? "");
    const title =
      titleAttr.length >= 5 ? titleAttr : slugToTitle(path.split("/").filter(Boolean).pop() ?? "");
    if (title.length < 5) continue;
    items.push({ title: title.slice(0, 300), link, imageUrl: null, description: title.slice(0, 500) });
  }
  return items;
}

export async function fetchListingPageHtml(
  pageUrl: string,
  opts?: { timeoutMs?: number },
): Promise<string> {
  const res = await fetch(pageUrl.trim(), {
    signal: AbortSignal.timeout(opts?.timeoutMs ?? 15_000),
    redirect: "follow",
    headers: HTML_HEADERS,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Kategori / liste sayfasından haber linkleri ve başlıkları kazar. */
export function parseListingPageItems(
  html: string,
  pageUrl: string,
  limit: number,
): ScrapedListingItem[] {
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return [];
  }
  const host = base.hostname.toLowerCase().replace(/^www\./, "");
  const haberler = host === "haberler.com" ? extractHaberlerCards(html, pageUrl, limit) : [];
  if (haberler.length > 0) return haberler.slice(0, limit);
  return extractGenericArticleLinks(html, pageUrl, limit).slice(0, limit);
}

export async function scrapeListingPageItems(
  pageUrl: string,
  opts?: { limit?: number; timeoutMs?: number },
): Promise<ScrapedListingItem[]> {
  const limit = Math.max(1, Math.min(30, opts?.limit ?? 20));
  const html = await fetchListingPageHtml(pageUrl, opts);
  const items = parseListingPageItems(html, pageUrl, limit);
  if (items.length > 0) return items;

  const path = new URL(pageUrl).pathname;
  if (isArticlePath(path)) {
    const title = extractTitleFromArticleHtml(html) ?? slugToTitle(path.split("/").pop() ?? "");
    if (title.length >= 5) {
      return [{ title, link: pageUrl, imageUrl: null, description: title }];
    }
  }
  if (!isListingPagePath(path)) {
    throw new Error("Sayfada haber linki bulunamadı");
  }
  throw new Error("Liste sayfasında haber linki bulunamadı (HTML yapısı tanınmadı)");
}
