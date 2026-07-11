/** RSS / HTML kaynaklarından yayın tarihini çözümler (haber createdAt için). */

function decodeXmlText(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

function extractTagText(raw: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i");
  return decodeXmlText(raw.match(re)?.[1] ?? "");
}

/** ISO, RFC 822 (RSS pubDate) ve yaygın Türkçe/WordPress formatları. */
export function parseFlexiblePublishedDate(raw: string | undefined | null): Date | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (iso) {
    const hasTime = iso[4] != null;
    if (hasTime) {
      const withTz = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(s);
      if (withTz) {
        const t = Date.parse(s);
        if (Number.isFinite(t)) return new Date(t);
      }
      return new Date(
        Number(iso[1]),
        Number(iso[2]) - 1,
        Number(iso[3]),
        Number(iso[4]),
        Number(iso[5]),
        Number(iso[6] ?? 0),
      );
    }
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const parsed = Date.parse(s);
  if (Number.isFinite(parsed)) return new Date(parsed);
  return null;
}

/** RSS 2.0 / Atom `<item>` / `<entry>` içinden yayın tarihi. */
export function extractRssItemPublishedAt(rawInner: string): Date | null {
  const raw = String(rawInner ?? "");
  for (const tag of ["pubDate", "dc:date", "published", "updated"]) {
    const d = parseFlexiblePublishedDate(extractTagText(raw, tag));
    if (d) return d;
  }
  return null;
}

function metaContent(html: string, key: string): string {
  const re1 = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
    "i",
  );
  return (html.match(re1)?.[1] ?? html.match(re2)?.[1] ?? "").trim();
}

/** Makale HTML (Haberler.com ve genel haber siteleri). */
export function extractHtmlArticlePublishedAt(html: string): Date | null {
  const h = String(html ?? "");
  for (const key of [
    "article:published_time",
    "article:published-time",
    "datePublished",
    "publishdate",
    "pubdate",
    "og:published_time",
  ]) {
    const d = parseFlexiblePublishedDate(metaContent(h, key));
    if (d) return d;
  }

  const timeMatch = h.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1];
  const fromTime = parseFlexiblePublishedDate(timeMatch);
  if (fromTime) return fromTime;

  const jsonLd = h.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1];
  return parseFlexiblePublishedDate(jsonLd);
}

/** Geçersiz / gelecek tarihleri güvenli aralığa alır; yoksa şimdi. */
export function coerceNewsPublishedAt(date: Date | null | undefined): Date {
  const now = new Date();
  if (!date || !Number.isFinite(date.getTime())) return now;
  if (date.getTime() > now.getTime() + 120_000) return now;
  const min = new Date("1990-01-01T00:00:00Z").getTime();
  if (date.getTime() < min) return now;
  return date;
}
