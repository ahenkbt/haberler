/** Anasayfa RSS/SHA kapakları: harici URL hotlink/404 olunca aynı-köken vekil. */

export const NEWS_COVER_PROXY_PATH = "/api/media/news-cover";
export const NEWS_COVER_PROXY_MAX_BYTES = 6 * 1024 * 1024;
export const NEWS_COVER_PROXY_TIMEOUT_MS = 8_000;

export function parseNewsCoverProxyTarget(raw: string | null | undefined): URL | null {
  const t = String(raw ?? "").trim();
  if (!t || t.length > 2048) return null;
  const abs = t.startsWith("//") ? `https:${t}` : t;
  let parsed: URL;
  try {
    parsed = new URL(abs);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  const host = parsed.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return null;
  }
  if (host === "127.0.0.1" || host === "0.0.0.0" || host === "::1" || host === "[::1]") return null;
  if (host === "169.254.169.254" || host === "metadata.google.internal" || host.endsWith(".internal")) {
    return null;
  }
  if (/\/api\/media\/news-cover\b/i.test(parsed.pathname)) return null;
  return parsed;
}

export function newsCoverProxyPath(url: string | null | undefined): string | null {
  const target = parseNewsCoverProxyTarget(url);
  if (!target) return null;
  return `${NEWS_COVER_PROXY_PATH}?u=${encodeURIComponent(target.toString())}`;
}

export function isAlreadyNewsCoverProxySrc(src: string | null | undefined): boolean {
  const t = String(src ?? "").trim();
  return /\/api\/media\/news-cover(?:\?|$)/i.test(t);
}
