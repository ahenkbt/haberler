/** Haberler.com terim/etiket sayfası slug'ı (ör. /gazi/ → gazi). */
export function haberlerEtiketSlugFromUrl(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl.trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "rss.haberler.com") {
      const etiket = u.searchParams.get("etiket")?.trim().toLowerCase();
      if (etiket && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(etiket)) return etiket;
      const kategori = u.searchParams.get("kategori")?.trim().toLowerCase();
      if (kategori && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(kategori)) return kategori;
      return null;
    }
    if (host !== "haberler.com") return null;
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments.length !== 1) return null;
    const slug = segments[0]!.toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(slug)) return null;
    return slug;
  } catch {
    return null;
  }
}

/** Haberler.com etiket/terim sayfası → rss.haberler.com etiket beslemesi. */
export function haberlerEtiketRssFromPageUrl(pageUrl: string): string | null {
  const slug = haberlerEtiketSlugFromUrl(pageUrl);
  if (!slug) return null;
  return `https://rss.haberler.com/rss.asp?etiket=${encodeURIComponent(slug)}`;
}

/** @deprecated haberlerEtiketRssFromPageUrl kullanın */
export function haberlerCategoryRssFromPageUrl(pageUrl: string): string | null {
  return haberlerEtiketRssFromPageUrl(pageUrl);
}

/** HTML sayfasındaki `<link rel="alternate" type="application/rss+xml">` href değeri. */
export function extractRssAlternateLinkFromHtml(html: string, pageUrl: string): string | null {
  const linkRe =
    /<link\b[^>]*\brel=["']alternate["'][^>]*\btype=["']application\/rss\+xml["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) !== null) {
    const tag = match[0];
    const hrefMatch = /\bhref=["']([^"']+)["']/i.exec(tag);
    if (!hrefMatch?.[1]) continue;
    try {
      return new URL(hrefMatch[1], pageUrl).href;
    } catch {
      continue;
    }
  }
  const altRe =
    /<link\b[^>]*\btype=["']application\/rss\+xml["'][^>]*\brel=["']alternate["'][^>]*>/gi;
  while ((match = altRe.exec(html)) !== null) {
    const tag = match[0];
    const hrefMatch = /\bhref=["']([^"']+)["']/i.exec(tag);
    if (!hrefMatch?.[1]) continue;
    try {
      return new URL(hrefMatch[1], pageUrl).href;
    } catch {
      continue;
    }
  }
  return null;
}

export function isLikelyRssXml(body: string): boolean {
  return /<(?:rss|feed|rdf:RDF)\b/i.test(body) || /<item[\s>]/i.test(body);
}
