import { pickFirstNewsImageUrl } from "./newsImageHeuristics.js";
import { absolutizeImageUrl } from "./rssItemMedia.js";

const FETCH_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const META_IMAGE_PATTERNS = [
  /<meta\s+property=["']og:image(?::secure_url)?["']\s+content=["']([^"']+)["']/i,
  /<meta\s+content=["']([^"']+)["']\s+property=["']og:image(?::secure_url)?["']/i,
  /<meta\s+name=["']twitter:image(?::src)?["']\s+content=["']([^"']+)["']/i,
  /<meta\s+content=["']([^"']+)["']\s+name=["']twitter:image(?::src)?["']/i,
  /<link\s+rel=["']image_src["']\s+href=["']([^"']+)["']/i,
];

/** HTML parçasından og:image / twitter:image URL çıkarır. */
export function parseMetaImageFromHtml(html: string, pageUrl: string): string | null {
  const head = html.slice(0, 120_000);
  for (const re of META_IMAGE_PATTERNS) {
    const m = head.match(re);
    const raw = m?.[1]?.trim();
    if (!raw) continue;
    const abs = absolutizeImageUrl(pageUrl, raw.replace(/&amp;/g, "&"));
    if (abs && !abs.toLowerCase().startsWith("data:")) return abs;
  }
  return null;
}

const CANONICAL_PATTERNS = [
  /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i,
  /<link\s+href=["']([^"']+)["']\s+rel=["']canonical["']/i,
  /<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i,
  /<meta\s+content=["']([^"']+)["']\s+property=["']og:url["']/i,
];

function parseCanonicalFromHtml(html: string): string | null {
  const head = html.slice(0, 150_000);
  for (const re of CANONICAL_PATTERNS) {
    const m = head.match(re);
    const raw = m?.[1]?.trim().replace(/&amp;/g, "&");
    if (raw && /^https?:\/\//i.test(raw)) return raw;
  }
  return null;
}

/**
 * Google News / kısa link → yayıncı makale URL’si (yönlendirme + canonical).
 */
export async function resolveArticleUrl(pageUrl: string, timeoutMs = 10_000): Promise<string> {
  const start = String(pageUrl ?? "").trim();
  if (!start || !/^https?:\/\//i.test(start)) return start;
  if (!/news\.google\.com/i.test(start)) return start;

  try {
    const res = await fetch(start, {
      redirect: "follow",
      headers: {
        "User-Agent": FETCH_UA,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const final = res.url || start;
    if (final && !/news\.google\.com/i.test(final)) return final;

    const html = (await res.text()).slice(0, 200_000);
    const canonical = parseCanonicalFromHtml(html);
    if (canonical && !/news\.google\.com/i.test(canonical)) return canonical;
    return final || start;
  } catch {
    return start;
  }
}

/**
 * Haber sayfasından kapak görseli (og:image). Google News yönlendirmelerini takip eder.
 * Hafif: yalnızca HTML başı, varsayılan 5s zaman aşımı, ~400KB üst sınır.
 */
export async function fetchArticlePageImageUrl(pageUrl: string, timeoutMs = 5_000): Promise<string | null> {
  let url = String(pageUrl ?? "").trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;

  if (/news\.google\.com/i.test(url)) {
    url = await resolveArticleUrl(url, Math.min(timeoutMs, 8_000));
    if (/news\.google\.com/i.test(url)) return null;
  }

  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": FETCH_UA,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;

    const finalUrl = res.url || url;
    const reader = res.body?.getReader();
    if (!reader) {
      const text = (await res.text()).slice(0, 400_000);
      const raw = parseMetaImageFromHtml(text, finalUrl);
      return raw ? pickFirstNewsImageUrl([raw], finalUrl) : null;
    }

    let html = "";
    let total = 0;
    const max = 400_000;
    while (total < max) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      html += new TextDecoder().decode(value);
      total += value.length;
      if (html.length > 80_000 && parseMetaImageFromHtml(html, finalUrl)) break;
    }
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }

    const raw = parseMetaImageFromHtml(html.slice(0, max), finalUrl);
    return raw ? pickFirstNewsImageUrl([raw], finalUrl) : null;
  } catch {
    return null;
  }
}
