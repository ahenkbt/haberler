import { filterNewsImageUrls } from "./newsImageHeuristics.js";

/** RSS öğesinden kapak ve gömülü görselleri çıkarır (AI RSS + kampanya import). */

export function absolutizeImageUrl(articleLink: string, src: string | undefined): string | undefined {
  if (!src) return undefined;
  const u = src.trim().replace(/&amp;/g, "&");
  if (!u || u.toLowerCase().startsWith("data:")) return undefined;
  try {
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith("//")) return `https:${u}`;
    const base = articleLink.trim();
    if (!base) return undefined;
    const withProto = /^https?:\/\//i.test(base) ? base : `https://${base.replace(/^\/\//, "")}`;
    return new URL(u, new URL(withProto).origin).href;
  } catch {
    return undefined;
  }
}

export function extractRssContentEncoded(raw: string): string {
  const mBlock = raw.match(/<content:encoded>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/content:encoded>/i);
  if (mBlock?.[1]) return mBlock[1].trim();
  const mOpen = raw.match(/<content:encoded>\s*<!\[CDATA\[([\s\S]*?)\]\]>/i);
  if (mOpen?.[1]) return mOpen[1].trim();
  const mPlain = raw.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i);
  if (!mPlain?.[1]) return "";
  let inner = mPlain[1].trim();
  const cdataFull = inner.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/i);
  if (cdataFull?.[1]) return cdataFull[1].trim();
  return inner;
}

function collectImgSrcs(html: string, link: string, out: string[], limit: number): void {
  if (!html || out.length >= limit) return;
  const re = /<img\b[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < limit) {
    const abs = absolutizeImageUrl(link, m[1]);
    if (abs && !out.includes(abs)) out.push(abs);
  }
}

/** Öncelik sırasıyla benzersiz harici görsel URL'leri (en fazla `max`). */
export function extractRssImageUrls(
  rawItem: string,
  descriptionHtml: string,
  link: string,
  max = 4,
): string[] {
  const contentEncoded = extractRssContentEncoded(rawItem);
  const urls: string[] = [];

  const pushUrl = (candidate: string | undefined) => {
    if (urls.length >= max) return;
    const abs = absolutizeImageUrl(link, candidate);
    if (abs && !urls.includes(abs)) urls.push(abs);
  };

  const mediaCandidates = [
    rawItem.match(/<media:thumbnail\b[^>]*url=["']([^"']+)["']/i)?.[1],
    rawItem.match(/<media:content\b[^>]*medium=["']image["'][^>]*url=["']([^"']+)["']/i)?.[1],
    rawItem.match(/<media:content\b[^>]*url=["']([^"']+)["']/i)?.[1],
    rawItem.match(/<itunes:image\b[^>]*href=["']([^"']+)["']/i)?.[1],
  ];
  for (const c of mediaCandidates) pushUrl(c);

  pushUrl(rawItem.match(/<image>\s*(https?:\/\/[^<\s]+)\s*<\/image>/i)?.[1]);

  collectImgSrcs(descriptionHtml, link, urls, max);
  collectImgSrcs(contentEncoded, link, urls, max);
  collectImgSrcs(rawItem, link, urls, max);

  const encBlock = rawItem.match(/<enclosure\b[^>]*>/i)?.[0];
  if (encBlock && urls.length < max) {
    const encUrl = encBlock.match(/\burl=["']([^"']+)["']/i)?.[1];
    const encType = encBlock.match(/\btype=["']([^"']+)["']/i)?.[1] ?? "";
    if (encUrl && (/image\//i.test(encType) || /\.(jpe?g|png|gif|webp|svg)(\?|#|$)/i.test(encUrl))) {
      pushUrl(encUrl);
    }
  }

  const filtered = filterNewsImageUrls(urls.slice(0, max * 2), link).slice(0, max);
  if (filtered.length) return filtered;

  // Some Turkish publishers serve article photos from a neutral CDN whose host
  // does not resemble the publisher domain. Keep real upload/crop images instead
  // of dropping the whole card image when the stricter logo filter is unsure.
  const fallback = urls
    .filter((u) => {
      const value = String(u ?? "").trim();
      if (!/^https?:\/\//i.test(value)) return false;
      if (!/\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(value)) return false;
      if (/(?:^|[/_.-])(?:logo|favicon|icon|sprite|placeholder|no-image|noimage)(?:[._-]|$)/i.test(value)) return false;
      return /\/(?:crop\/\d+x\d+\/)?(?:uploads?|media|images?|files|static\/content)\//i.test(value);
    })
    .filter((u, index, arr) => arr.indexOf(u) === index)
    .slice(0, max);

  return fallback;
}

export function extractRssCoverImage(
  rawItem: string,
  descriptionHtml: string,
  link: string,
): string | undefined {
  return extractRssImageUrls(rawItem, descriptionHtml, link, 1)[0];
}

/** Google News `<source url="…">` yayıncı adresi (og:image için). */
export function extractRssPublisherUrl(rawItem: string): string | undefined {
  const m = rawItem.match(/<source\b[^>]*\burl=["']([^"']+)["']/i);
  const raw = m?.[1]?.trim().replace(/&amp;/g, "&");
  if (!raw || raw.toLowerCase().startsWith("data:")) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return undefined;
}
