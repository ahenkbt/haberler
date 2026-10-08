/**
 * Global RSS URL blocklist — ingest, hibrit akış ve kampanyalardan hariç tutulur.
 */

const BIRGUN_POLITIKA_PATH = /birgun\.net\/rss\/kategori\/siyaset-8(?:\/|$|\?)/i;

/** BirGün «Siyaset / Politika» kategorisi — yayından çıkarıldı. */
export function isBlockedHmRssFeedUrl(raw: unknown): boolean {
  const url = String(raw ?? "").trim();
  if (!url) return false;
  return BIRGUN_POLITIKA_PATH.test(url);
}

export function filterBlockedHmRssFeedUrls(urls: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const url = String(raw ?? "").trim();
    if (!url || isBlockedHmRssFeedUrl(url)) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}
