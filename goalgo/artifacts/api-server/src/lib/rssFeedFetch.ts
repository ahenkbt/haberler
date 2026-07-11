import net from "node:net";
import {
  extractRssAlternateLinkFromHtml,
  haberlerEtiketRssFromPageUrl,
  isLikelyRssXml,
} from "./rssFeedResolve.js";

/** Bilinen bozuk RSS URL'leri için yedek feed listesi (kampanya DB'si değiştirilmeden). */
const RSS_FEED_FALLBACKS: Record<string, string[]> = {
  "https://baskentpostasi.com/rss/category/ankara": ["https://cumha.com.tr/rss/lokasyon/ankara"],
};

/** RSS yanıtı bellek taşmasını önlemek için üst sınır (3 MiB). */
export const RSS_MAX_RESPONSE_BYTES = 3 * 1024 * 1024;
const RSS_MAX_FETCH_CANDIDATES = 6;

const RSS_FETCH_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml, text/xml, */*",
  "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
};

function normalizeFeedUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "").toLowerCase();
}

function assertPublicHttpUrl(raw: string): void {
  const u = new URL(raw);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("RSS URL http/https olmalı");
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) throw new Error("Yerel RSS hostuna izin verilmez");
  const ipType = net.isIP(host);
  if (ipType === 4) {
    const [a = 0, b = 0] = host.split(".").map((x) => Number(x));
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      throw new Error("Özel ağ RSS adreslerine izin verilmez");
    }
  }
  if (ipType === 6 && (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80"))) {
    throw new Error("Özel ağ RSS adreslerine izin verilmez");
  }
}

export function rssFeedFetchCandidates(feedUrl: string): string[] {
  const primary = feedUrl.trim();
  const key = normalizeFeedUrl(primary);
  const fallbacks = RSS_FEED_FALLBACKS[key] ?? RSS_FEED_FALLBACKS[primary] ?? [];
  const haberlerRss = haberlerEtiketRssFromPageUrl(primary);
  const ordered = haberlerRss ? [haberlerRss, primary, ...fallbacks] : [primary, ...fallbacks];
  return Array.from(new Set(ordered.filter(Boolean)));
}

async function readResponseTextLimited(
  res: Response,
  maxBytes: number,
  opts?: { stopAfterItems?: number },
): Promise<string> {
  const stopAfterItems = Math.max(0, Math.floor(Number(opts?.stopAfterItems ?? 0) || 0));
  const contentLength = res.headers.get("content-length");
  if (contentLength && stopAfterItems <= 0) {
    const n = Number(contentLength);
    if (Number.isFinite(n) && n > maxBytes) {
      throw new Error(`RSS yanıtı çok büyük (${n} bayt)`);
    }
  }

  const reader = res.body?.getReader();
  if (!reader) {
    const fallback = await res.text();
    if (fallback.length > maxBytes) throw new Error(`RSS yanıtı çok büyük (>${maxBytes} bayt)`);
    return fallback;
  }

  const chunks: Uint8Array[] = [];
  const decoder = new TextDecoder();
  let scanBuffer = "";
  let closedItems = 0;
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new Error(`RSS yanıtı çok büyük (>${maxBytes} bayt)`);
    }
    chunks.push(value);
    if (stopAfterItems > 0) {
      const decoded = decoder.decode(value, { stream: true });
      scanBuffer += decoded;
      while (true) {
        const match = /<\/(?:item|entry)>/i.exec(scanBuffer);
        if (!match) break;
        closedItems += 1;
        scanBuffer = scanBuffer.slice(match.index + match[0].length);
        if (closedItems >= stopAfterItems) {
          await reader.cancel().catch(() => {});
          break;
        }
      }
      if (closedItems >= stopAfterItems) break;
      if (scanBuffer.length > 16_384) {
        scanBuffer = scanBuffer.slice(-16_384);
      }
    }
  }

  return Buffer.concat(chunks).toString("utf8");
}

export async function fetchRssFeedXml(
  feedUrl: string,
  opts?: { timeoutMs?: number; maxBytes?: number; stopAfterItems?: number },
): Promise<{ xml: string; usedUrl: string }> {
  const candidates = rssFeedFetchCandidates(feedUrl);
  let lastError = "bilinmeyen hata";
  const timeoutMs = opts?.timeoutMs ?? 12_000;
  const maxBytes = opts?.maxBytes ?? RSS_MAX_RESPONSE_BYTES;

  const tried = new Set<string>();

  for (let i = 0; i < candidates.length && tried.size < RSS_MAX_FETCH_CANDIDATES; i++) {
    const url = candidates[i]!;
    if (tried.has(url)) continue;
    tried.add(url);

    try {
      assertPublicHttpUrl(url);
      const fetchRes = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "follow",
        headers: RSS_FETCH_HEADERS,
      });
      if (!fetchRes.ok) {
        lastError = `HTTP ${fetchRes.status}`;
        continue;
      }
      const body = await readResponseTextLimited(fetchRes, maxBytes, {
        stopAfterItems: opts?.stopAfterItems,
      });
      if (!isLikelyRssXml(body)) {
        const discovered =
          extractRssAlternateLinkFromHtml(body, url) ?? haberlerEtiketRssFromPageUrl(url);
        if (discovered && !tried.has(discovered) && !candidates.includes(discovered)) {
          candidates.push(discovered);
        }
        lastError = "geçerli RSS/XML değil (sayfa adresi yerine RSS/XML linki kullanın)";
        continue;
      }
      return { xml: body, usedUrl: url };
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  throw new Error(`${feedUrl} (${lastError})`);
}
