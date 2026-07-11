/** DuckDuckGo görsel ve video araması — API anahtarı gerektirmez (Bing kaynaklı sonuçlar). */

export type DdgImageResult = {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  title: string | null;
  pageUrl: string | null;
  source: string;
};

export type DdgVideoResult = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string;
  source: string;
  duration: string | null;
  publisher: string | null;
};

const DDG_BASE = "https://duckduckgo.com/";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function normalizeHttpUrl(raw: string): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  try {
    const candidate = value.startsWith("//") ? `https:${value}` : value;
    if (!candidate.startsWith("http://") && !candidate.startsWith("https://")) return null;
    return new URL(candidate).toString();
  } catch {
    return null;
  }
}

function extractVqd(html: string): string | null {
  const patterns = [
    /vqd=['"]([^'"]+)['"]/,
    /vqd=([\d-]+)/,
    /"vqd":"([^"]+)"/,
    /vqd\\x3d([^\\&"'\s]+)/,
    /vqd\\u003d([^\\&"'\s]+)/,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const value = match?.[1]?.trim();
    if (value) return value;
  }
  return null;
}

function ddgHeaders(referer = "https://duckduckgo.com/"): Record<string, string> {
  return {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/json,*/*",
    Referer: referer,
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
  };
}

async function fetchDdgVqd(
  query: string,
  mode: "images" | "videos",
  timeoutMs: number,
): Promise<string | null> {
  const params = new URLSearchParams({ q: query, iax: mode, ia: mode });
  const signal = AbortSignal.timeout(timeoutMs);
  const res = await fetch(`${DDG_BASE}?${params}`, {
    headers: ddgHeaders(),
    signal,
    redirect: "follow",
  });
  if (!res.ok) return null;
  const html = await res.text();
  return extractVqd(html);
}

type DdgImageApiRow = {
  image?: string;
  thumbnail?: string;
  title?: string;
  url?: string;
  source?: string;
};

type DdgVideoApiRow = {
  content?: string;
  title?: string;
  description?: string;
  duration?: string;
  publisher?: string;
  provider?: string;
  images?: { large?: string; medium?: string; small?: string };
};

async function fetchDdgVqdWithRetry(
  query: string,
  mode: "images" | "videos",
  timeoutMs: number,
): Promise<string | null> {
  const perAttempt = Math.max(Math.floor(timeoutMs / 2), 2_500);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const vqd = await fetchDdgVqd(query, mode, perAttempt).catch(() => null);
    if (vqd) return vqd;
    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  return null;
}

/** DuckDuckGo/Bing kaynaklı görsel sonuçları. */
export async function fetchDdgImageResults(
  query: string,
  limit = 20,
  timeoutMs = 6_000,
): Promise<DdgImageResult[]> {
  const q = String(query ?? "").trim();
  if (!q) return [];

  const safeLimit = Math.min(Math.max(limit, 1), 36);
  const vqd = await fetchDdgVqdWithRetry(q, "images", timeoutMs);
  if (!vqd) return [];

  const params = new URLSearchParams({
    l: "tr-tr",
    o: "json",
    q,
    vqd,
    p: "1",
    f: ",,,,,",
  });
  const signal = AbortSignal.timeout(timeoutMs);
  const res = await fetch(`${DDG_BASE}i.js?${params}`, {
    headers: ddgHeaders(`${DDG_BASE}?${new URLSearchParams({ q, iax: "images", ia: "images" })}`),
    signal,
  });
  if (!res.ok) return [];

  const data = (await res.json()) as { results?: DdgImageApiRow[] };
  const out: DdgImageResult[] = [];
  const seen = new Set<string>();

  for (const row of data.results ?? []) {
    const imageUrl = normalizeHttpUrl(row.image ?? row.thumbnail ?? "");
    const thumbnailUrl = normalizeHttpUrl(row.thumbnail ?? row.image ?? "");
    if (!imageUrl && !thumbnailUrl) continue;
    const primary = imageUrl ?? thumbnailUrl!;
    if (seen.has(primary)) continue;
    seen.add(primary);
    out.push({
      id: `ddg-img-${out.length + 1}`,
      imageUrl: primary,
      thumbnailUrl: thumbnailUrl ?? primary,
      title: String(row.title ?? "").trim() || null,
      pageUrl: normalizeHttpUrl(row.url ?? ""),
      source: String(row.source ?? "Web").trim() || "Web",
    });
    if (out.length >= safeLimit) break;
  }
  return out;
}

/** DuckDuckGo/Bing kaynaklı video sonuçları (çoğunlukla YouTube). */
export async function fetchDdgVideoResults(
  query: string,
  limit = 12,
  timeoutMs = 6_000,
): Promise<DdgVideoResult[]> {
  const q = String(query ?? "").trim();
  if (!q) return [];

  const safeLimit = Math.min(Math.max(limit, 1), 24);
  const vqd = await fetchDdgVqdWithRetry(q, "videos", timeoutMs);
  if (!vqd) return [];

  const params = new URLSearchParams({
    l: "tr-tr",
    o: "json",
    q,
    vqd,
    p: "1",
    f: ",,,,,",
  });
  const signal = AbortSignal.timeout(timeoutMs);
  const res = await fetch(`${DDG_BASE}v.js?${params}`, {
    headers: ddgHeaders(`${DDG_BASE}?${new URLSearchParams({ q, iax: "videos", ia: "videos" })}`),
    signal,
  });
  if (!res.ok) return [];

  const data = (await res.json()) as { results?: DdgVideoApiRow[] };
  const out: DdgVideoResult[] = [];
  const seen = new Set<string>();

  for (const row of data.results ?? []) {
    const videoUrl = normalizeHttpUrl(row.content ?? "");
    if (!videoUrl || seen.has(videoUrl)) continue;
    seen.add(videoUrl);
    const thumb =
      normalizeHttpUrl(row.images?.large ?? "") ??
      normalizeHttpUrl(row.images?.medium ?? "") ??
      normalizeHttpUrl(row.images?.small ?? "");
    const publisher = String(row.publisher ?? row.provider ?? "").trim() || null;
    out.push({
      id: `ddg-vid-${out.length + 1}`,
      title: String(row.title ?? "").trim() || videoUrl,
      thumbnailUrl: thumb,
      videoUrl,
      source: (publisher ?? String(row.provider ?? "Web").trim()) || "Web",
      duration: String(row.duration ?? "").trim() || null,
      publisher,
    });
    if (out.length >= safeLimit) break;
  }
  return out;
}

/** Görsel + video aramasını paralel çalıştırır. */
export async function fetchDdgMediaSearch(
  query: string,
  opts?: { imageLimit?: number; videoLimit?: number; timeoutMs?: number },
): Promise<{ images: DdgImageResult[]; videos: DdgVideoResult[] }> {
  const timeoutMs = opts?.timeoutMs ?? 7_000;
  const imageLimit = opts?.imageLimit ?? 20;
  const videoLimit = opts?.videoLimit ?? 12;
  const [images, videos] = await Promise.all([
    fetchDdgImageResults(query, imageLimit, timeoutMs).catch(() => []),
    fetchDdgVideoResults(query, videoLimit, timeoutMs).catch(() => []),
  ]);
  return { images, videos };
}
