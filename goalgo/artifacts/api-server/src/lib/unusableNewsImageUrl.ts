/** Askıdaki Render host — `/api/media/` yolu mevcut origin / R2 üzerinden denenebilir. */
const DEAD_NEWS_IMAGE_HOST_RE = /(?:^|\.)onrender\.com$/i;

function hostnameOf(url: string): string | null {
  const abs = url.startsWith("//") ? `https:${url}` : url;
  if (!/^https?:\/\//i.test(abs)) return null;
  try {
    return new URL(abs).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function pathnameOf(url: string): string | null {
  const abs = url.startsWith("//") ? `https:${url}` : url;
  if (!/^https?:\/\//i.test(abs)) return null;
  try {
    return new URL(abs).pathname;
  } catch {
    return null;
  }
}

/**
 * Kapak olarak yüklenmemesi gereken adres: boş, about:, veya Render’da kalan
 * (ve `/api/media/` vekiline çevrilemeyen) URL.
 */
export function isUnusableNewsImageUrl(url: string | null | undefined): boolean {
  const t = String(url ?? "").trim();
  if (!t) return true;
  if (/^(data:|blob:)/i.test(t)) return false;
  if (/^about:/i.test(t)) return true;
  const host = hostnameOf(t);
  if (host && DEAD_NEWS_IMAGE_HOST_RE.test(host)) {
    const path = pathnameOf(t) ?? "";
    if (path.startsWith("/api/media/")) return false;
    return true;
  }
  return false;
}
