/** Anasayfa kapak zinciri: birincil → yedek → aynı-köken vekil. */

export type HmNewsImageFailBehavior = "placeholder" | "hide";

export function uniqueImageSrcs(...urls: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const s = String(raw ?? "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function isNewsCoverProxySrc(src: string | null | undefined): boolean {
  return /\/api\/media\/news-cover(?:\?|$)/i.test(String(src ?? "").trim());
}

export function newsCoverProxyPath(url: string | null | undefined): string | null {
  const t = String(url ?? "").trim();
  if (!t || t.startsWith("data:")) return null;
  if (isNewsCoverProxySrc(t) || /\/api\/media\/uploads\//i.test(t)) return null;
  const abs = t.startsWith("//") ? `https:${t}` : t;
  if (!/^https?:\/\//i.test(abs)) return null;
  try {
    const parsed = new URL(abs);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".localhost")) return null;
    return `/api/media/news-cover?u=${encodeURIComponent(parsed.toString())}`;
  } catch {
    return null;
  }
}

export function buildHmNewsImageSrcChain(primary: string, fallback: string): string[] {
  const direct = uniqueImageSrcs(primary, fallback);
  const proxied = uniqueImageSrcs(...direct.map((src) => newsCoverProxyPath(src)));
  return uniqueImageSrcs(...direct, ...proxied);
}

export function nextHmNewsImageSrc(chain: readonly string[], current: string): string | null {
  const idx = chain.indexOf(current);
  if (idx < 0) return chain[0] ?? null;
  return chain[idx + 1] ?? null;
}

export function homeCoverItemKey(item: {
  id?: string | number | null;
  slug?: string | null;
  title?: string | null;
}): string {
  return String(item.id ?? item.slug ?? item.title ?? "").trim();
}

export function takeVisibleHomeCoverItems<T>(
  items: readonly T[],
  hiddenKeys: ReadonlySet<string>,
  itemKey: (item: T) => string,
  limit: number,
): T[] {
  if (limit <= 0) return [];
  const out: T[] = [];
  for (const item of items) {
    const key = itemKey(item);
    if (key && hiddenKeys.has(key)) continue;
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}
