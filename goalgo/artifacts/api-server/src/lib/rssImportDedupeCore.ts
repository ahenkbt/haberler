import { portalRssTitleKey } from "./portal-rss-fetch.js";

export const RSS_TITLE_NEAR_DUPLICATE_THRESHOLD = 0.78;

export function normalizeRssSourceUrl(link: string): string | null {
  const t = link.trim();
  if (!t) return null;
  try {
    const abs = /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/\//, "")}`;
    const u = new URL(abs);
    u.protocol = u.protocol.toLowerCase();
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    u.hash = "";
    for (const key of Array.from(u.searchParams.keys())) {
      if (/^(utm_|fbclid$|gclid$|yclid$|mc_|ref$|ref_src$)/i.test(key)) u.searchParams.delete(key);
    }
    u.searchParams.sort();
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.href;
  } catch {
    return t.toLowerCase();
  }
}

export function rssTitleKeyWords(key: string): Set<string> {
  return new Set(key.split(/\s+/).filter((w) => w.length >= 3));
}

export function rssTitleJaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 0;
}

/** Aynı veya çok yakın başlık (normalize + Jaccard). */
export function rssTitlesAreNearDuplicate(
  a: string,
  b: string,
  threshold = RSS_TITLE_NEAR_DUPLICATE_THRESHOLD,
): boolean {
  const ka = portalRssTitleKey(a);
  const kb = portalRssTitleKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  return rssTitleJaccardSimilarity(rssTitleKeyWords(ka), rssTitleKeyWords(kb)) >= threshold;
}

export function rssTitleMatchesAny(
  title: string,
  candidates: Iterable<string>,
  threshold = RSS_TITLE_NEAR_DUPLICATE_THRESHOLD,
): boolean {
  const t = title.trim();
  if (!t) return false;
  for (const candidate of candidates) {
    if (rssTitlesAreNearDuplicate(t, candidate, threshold)) return true;
  }
  return false;
}
