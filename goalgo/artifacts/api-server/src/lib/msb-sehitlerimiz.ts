const MSB_BASE = "https://www.msb.gov.tr";
const MSB_LIST_URL = `${MSB_BASE}/SehitVefat/Sehitlerimiz`;
const MSB_LOAD_MORE_URL = `${MSB_BASE}/SehitVefat/LoadMoreSehit/`;
const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; YekpareVKD/1.0; +https://yekpare.net)",
  Accept: "text/html,application/xhtml+xml,*/*",
};

export type MsbSehitRecord = {
  id: string;
  name: string;
  rank: string;
  registry: string;
  notice: string;
  martyrdomDate: string | null;
  year: number | null;
  imagePath: string;
};

export type MsbSehitlerimizPayload = {
  items: MsbSehitRecord[];
  fetchedAt: string;
  sourceUrl: string;
  total: number;
};

type CacheEntry = {
  fetchedAt: number;
  items: MsbSehitRecord[];
};

let cache: CacheEntry | null = null;
let inflight: Promise<MsbSehitRecord[]> | null = null;

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeWhitespace(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function parseMartyrdomMeta(notice: string): { martyrdomDate: string | null; year: number | null } {
  const match = notice.match(/(\d{2})\.(\d{2})\.(\d{4})\s+tarihinde/i);
  if (!match) return { martyrdomDate: null, year: null };
  const [, dd, mm, yyyy] = match;
  const year = Number(yyyy);
  return {
    martyrdomDate: `${dd}.${mm}.${yyyy}`,
    year: Number.isFinite(year) ? year : null,
  };
}

export function parseMsbSehitCardsFromHtml(html: string): MsbSehitRecord[] {
  const cards: MsbSehitRecord[] = [];
  const cardRe =
    /class="sehit-resim" style="background-image: url\(([^)]+)\);"[\s\S]*?class="sehit-adi">([^<]+)<[\s\S]*?class="sehit-sinif">([^<]+)<[\s\S]*?class="sehit-sicil">([^<]+)<[\s\S]*?(?:id="(\d+)"[^>]*class="sehit-slide-inner"|class="sehit-slide-inner"[^>]*\sid="(\d+)")[\s\S]*?class="sehit-slide-inner-text">\s*([\s\S]*?)\s*<\/p>/gi;

  for (const match of html.matchAll(cardRe)) {
    const notice = normalizeWhitespace(decodeHtmlEntities(match[7] ?? ""));
    const meta = parseMartyrdomMeta(notice);
    const id = match[5] ?? match[6] ?? "";
    cards.push({
      id,
      name: decodeHtmlEntities(match[2].trim()),
      rank: decodeHtmlEntities(match[3].trim()),
      registry: decodeHtmlEntities(match[4].trim()),
      notice,
      martyrdomDate: meta.martyrdomDate,
      year: meta.year,
      imagePath: decodeHtmlEntities(match[1].trim()),
    });
  }

  return cards;
}

function dedupeRecords(items: MsbSehitRecord[]): MsbSehitRecord[] {
  const seen = new Set<string>();
  const out: MsbSehitRecord[] = [];
  for (const item of items) {
    const key = `${item.id}|${item.registry}|${item.name}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function msbCookieHeader(setCookie: string[] | undefined): string {
  if (!setCookie?.length) return "";
  return setCookie.map((entry) => entry.split(";")[0] ?? "").filter(Boolean).join("; ");
}

async function fetchMsbHtml(url: string, cookie = ""): Promise<string> {
  const res = await fetch(url, {
    headers: {
      ...FETCH_HEADERS,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
  if (!res.ok) throw new Error(`MSB HTTP ${res.status}`);
  return res.text();
}

async function fetchMoreSehitBatch(cookie: string, size: number): Promise<string> {
  const res = await fetch(MSB_LOAD_MORE_URL, {
    method: "POST",
    headers: {
      ...FETCH_HEADERS,
      Cookie: cookie,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: MSB_LIST_URL,
    },
    body: new URLSearchParams({ size: String(size) }),
  });
  if (!res.ok) throw new Error(`MSB LoadMore HTTP ${res.status}`);
  const data = (await res.json()) as { ModelString?: string };
  return data.ModelString ?? "";
}

export async function scrapeMsbSehitlerimiz(): Promise<MsbSehitRecord[]> {
  const mainRes = await fetch(MSB_LIST_URL, { headers: FETCH_HEADERS });
  if (!mainRes.ok) throw new Error(`MSB liste HTTP ${mainRes.status}`);
  const cookie = msbCookieHeader(mainRes.headers.getSetCookie?.());
  const mainHtml = await mainRes.text();

  const collected = [...parseMsbSehitCardsFromHtml(mainHtml)];
  let loadCount = 1;
  for (;;) {
    const fragment = await fetchMoreSehitBatch(cookie, loadCount * 12);
    const batch = parseMsbSehitCardsFromHtml(fragment);
    if (!batch.length) break;
    collected.push(...batch);
    loadCount += 1;
    if (loadCount > 80) break;
  }

  return dedupeRecords(collected).sort((a, b) => {
    const ay = a.year ?? 0;
    const by = b.year ?? 0;
    if (by !== ay) return by - ay;
    return a.name.localeCompare(b.name, "tr");
  });
}

export async function getMsbSehitlerimizList(forceRefresh = false): Promise<MsbSehitlerimizPayload> {
  const now = Date.now();
  if (!forceRefresh && cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return {
      items: cache.items,
      fetchedAt: new Date(cache.fetchedAt).toISOString(),
      sourceUrl: MSB_LIST_URL,
      total: cache.items.length,
    };
  }

  if (!inflight) {
    inflight = scrapeMsbSehitlerimiz()
      .then((items) => {
        cache = { fetchedAt: Date.now(), items };
        return items;
      })
      .finally(() => {
        inflight = null;
      });
  }

  const items = await inflight;
  return {
    items,
    fetchedAt: new Date(cache?.fetchedAt ?? Date.now()).toISOString(),
    sourceUrl: MSB_LIST_URL,
    total: items.length,
  };
}

export function resolveMsbAssetUrl(imagePath: string): string {
  const trimmed = imagePath.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${MSB_BASE}${path}`;
}

export function isSafeMsbImagePath(imagePath: string): boolean {
  const decoded = decodeURIComponent(imagePath.trim());
  if (!decoded.startsWith("/Content/")) return false;
  if (decoded.includes("..")) return false;
  return true;
}
