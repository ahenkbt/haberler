/** Gemini kota / hata durumunda ücretsiz web arama yedeği (DuckDuckGo). */

export type WebSearchFallbackResult = {
  id: string;
  title: string;
  url: string;
  snippet: string | null;
};

const DDG_LITE = "https://lite.duckduckgo.com/lite/";
const DDG_JSON = "https://api.duckduckgo.com/";
const USER_AGENT = "Yekpare/1.0 (contact@yekpare.net)";

function normalizeExternalUrl(raw: string): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  try {
    let candidate = value;
    if (candidate.startsWith("//")) candidate = `https:${candidate}`;

    if (candidate.includes("duckduckgo.com/l/") || candidate.includes("duckduckgo.com/l?")) {
      const parsed = new URL(candidate);
      const uddg = parsed.searchParams.get("uddg") ?? parsed.searchParams.get("u");
      if (uddg) return normalizeExternalUrl(decodeURIComponent(uddg));
      return null;
    }

    if (candidate.startsWith("/l/") || candidate.startsWith("/l?")) {
      const params = new URLSearchParams(candidate.split("?")[1] ?? "");
      const uddg = params.get("uddg") ?? params.get("u");
      if (uddg) return normalizeExternalUrl(decodeURIComponent(uddg));
    }

    if (!candidate.startsWith("http://") && !candidate.startsWith("https://")) return null;
    const parsed = new URL(candidate);
    const host = parsed.hostname.toLowerCase();
    if (
      host === "duckduckgo.com" ||
      host.endsWith(".duckduckgo.com") ||
      host === "google.com" ||
      host.endsWith(".google.com")
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function stripHtml(value: string): string {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function pushResult(
  out: WebSearchFallbackResult[],
  seen: Set<string>,
  title: string,
  url: string,
  snippet: string | null,
  limit: number,
): void {
  const normalized = normalizeExternalUrl(url);
  if (!normalized || seen.has(normalized) || out.length >= limit) return;
  seen.add(normalized);
  out.push({
    id: `web-fb-${out.length + 1}`,
    title: title.trim() || normalized,
    url: normalized,
    snippet: snippet?.trim() || null,
  });
}

function parseDdgLiteHtml(html: string, limit: number): WebSearchFallbackResult[] {
  const out: WebSearchFallbackResult[] = [];
  const seen = new Set<string>();
  const linkRe =
    /<a[^>]+class=["'][^"']*result-link[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) !== null) {
    pushResult(out, seen, stripHtml(match[2] ?? ""), match[1] ?? "", null, limit);
  }
  if (out.length) return out;

  const altLinkRe =
    /<a[^>]+href=["']([^"']+)["'][^>]+class=["'][^"']*result-link[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = altLinkRe.exec(html)) !== null) {
    pushResult(out, seen, stripHtml(match[2] ?? ""), match[1] ?? "", null, limit);
  }
  if (out.length) return out;

  const genericLinkRe = /<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = genericLinkRe.exec(html)) !== null) {
    pushResult(out, seen, stripHtml(match[2] ?? ""), match[1] ?? "", null, limit);
  }
  return out;
}

type DdgJsonTopic = {
  FirstURL?: string;
  Text?: string;
  Topics?: DdgJsonTopic[];
};

function parseDdgJsonPayload(data: {
  Heading?: string;
  AbstractURL?: string;
  AbstractText?: string;
  Results?: Array<{ FirstURL?: string; Text?: string }>;
  RelatedTopics?: DdgJsonTopic[];
}, limit: number): WebSearchFallbackResult[] {
  const out: WebSearchFallbackResult[] = [];
  const seen = new Set<string>();

  if (data.AbstractURL) {
    pushResult(
      out,
      seen,
      data.Heading?.trim() || "Özet",
      data.AbstractURL,
      data.AbstractText ?? null,
      limit,
    );
  }

  const walkTopics = (topics: DdgJsonTopic[] | undefined) => {
    for (const topic of topics ?? []) {
      if (topic.FirstURL) {
        const text = String(topic.Text ?? "");
        const title = text.split(" - ")[0]?.trim() || text.slice(0, 80) || topic.FirstURL;
        pushResult(out, seen, title, topic.FirstURL, text || null, limit);
      }
      if (topic.Topics?.length) walkTopics(topic.Topics);
      if (out.length >= limit) return;
    }
  };

  for (const row of data.Results ?? []) {
    if (!row.FirstURL) continue;
    const text = String(row.Text ?? "");
    pushResult(out, seen, text.split(" - ")[0]?.trim() || row.FirstURL, row.FirstURL, text || null, limit);
  }
  walkTopics(data.RelatedTopics);
  return out;
}

/** DuckDuckGo ile hızlı web sonuçları (Gemini yedeği). */
export async function fetchWebSearchFallback(
  query: string,
  limit = 8,
  timeoutMs = 4_500,
): Promise<WebSearchFallbackResult[]> {
  const q = String(query ?? "").trim();
  if (!q) return [];

  const safeLimit = Math.min(Math.max(limit, 1), 12);
  const signal = AbortSignal.timeout(timeoutMs);

  const litePromise = (async () => {
    const params = new URLSearchParams({ q });
    const res = await fetch(`${DDG_LITE}?${params}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal,
      redirect: "follow",
    });
    if (!res.ok) return [];
    const html = await res.text();
    return parseDdgLiteHtml(html, safeLimit);
  })().catch(() => []);

  const jsonPromise = (async () => {
    const params = new URLSearchParams({
      q,
      format: "json",
      no_redirect: "1",
      no_html: "1",
      skip_disambig: "1",
    });
    const res = await fetch(`${DDG_JSON}?${params}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Parameters<typeof parseDdgJsonPayload>[0];
    return parseDdgJsonPayload(data, safeLimit);
  })().catch(() => []);

  const [lite, json] = await Promise.all([litePromise, jsonPromise]);
  const merged: WebSearchFallbackResult[] = [];
  const seen = new Set<string>();
  for (const item of [...lite, ...json]) {
    const url = normalizeExternalUrl(item.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    merged.push({ ...item, id: `web-fb-${merged.length + 1}`, url });
    if (merged.length >= safeLimit) break;
  }
  return merged;
}
