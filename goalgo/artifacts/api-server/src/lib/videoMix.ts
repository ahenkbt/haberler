/** Video listelerinde aynı kanal/kategori tekrarını azaltır — anasayfa karma akışı */
import { turkishContentScore } from "./turkishContent.js";

type MixableVideo = {
  id: number;
  videoId?: string | null;
  title?: string | null;
  sourceId?: number | null;
  channelId?: string | null;
  channelName?: string | null;
  sourceName?: string | null;
  description?: string | null;
  categorySlug?: string | null;
  publishedAt?: string | null;
};

/** YouTube id veya tam URL'den 11 karakterlik video id */
export function normalizeYoutubeVideoId(raw: string | null | undefined): string {
  const v = raw?.trim() ?? "";
  if (!v) return "";
  const m = v.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|^)([a-zA-Z0-9_-]{11})/);
  return (m?.[1] ?? v).toLowerCase();
}

function normalizeTitleKey(title: string | null | undefined): string {
  return (title ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 160);
}

/** Aynı YouTube videoId (veya aynı başlık+kanal) yalnızca bir kez — en yüksek id kalır. */
export function dedupeVideosByVideoId<T extends MixableVideo>(videos: T[]): T[] {
  const seenVid = new Set<string>();
  const seenTitleChannel = new Set<string>();
  const out: T[] = [];
  const sorted = [...videos].sort((a, b) => b.id - a.id);
  for (const v of sorted) {
    const vid = normalizeYoutubeVideoId(v.videoId);
    if (vid) {
      if (seenVid.has(vid)) continue;
      seenVid.add(vid);
    }
    const titleKey = normalizeTitleKey(v.title);
    if (titleKey) {
      const tcKey = `${titleKey}|${channelKey(v)}`;
      if (seenTitleChannel.has(tcKey)) continue;
      seenTitleChannel.add(tcKey);
    }
    out.push(v);
  }
  return out;
}

function channelKey(v: MixableVideo): string {
  if (v.sourceId != null && v.sourceId > 0) return `s:${v.sourceId}`;
  const cid = v.channelId?.trim();
  if (cid) return `c:${cid}`;
  const name = v.channelName?.trim();
  if (name) return `n:${name.toLowerCase()}`;
  return `v:${v.id}`;
}

function publishedAtMs(v: MixableVideo): number {
  const raw = String(v.publishedAt ?? "").trim();
  if (!raw) return 0;
  const n = Date.parse(raw);
  return Number.isFinite(n) ? n : 0;
}

function contentPriority<T extends MixableVideo>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      turkishContentScore(b.title, b.description, b.channelName ?? b.sourceName) -
        turkishContentScore(a.title, a.description, a.channelName ?? a.sourceName) ||
      publishedAtMs(b) - publishedAtMs(a) ||
      b.id - a.id,
  );
}

/** Her kanaldan sırayla en fazla bir video — en yeni önce */
export function mixVideosByChannel<T extends MixableVideo>(videos: T[], limit: number): T[] {
  if (videos.length === 0 || limit <= 0) return [];

  const buckets = new Map<string, T[]>();
  for (const v of contentPriority(videos)) {
    const k = channelKey(v);
    const list = buckets.get(k) ?? [];
    list.push(v);
    buckets.set(k, list);
  }

  const keys = [...buckets.keys()].sort(
    (a, b) =>
      turkishContentScore(
        buckets.get(b)?.[0]?.title,
        buckets.get(b)?.[0]?.description,
        buckets.get(b)?.[0]?.channelName ?? buckets.get(b)?.[0]?.sourceName,
      ) -
        turkishContentScore(
          buckets.get(a)?.[0]?.title,
          buckets.get(a)?.[0]?.description,
          buckets.get(a)?.[0]?.channelName ?? buckets.get(a)?.[0]?.sourceName,
        ) ||
      publishedAtMs(buckets.get(b)?.[0] ?? { id: 0 }) - publishedAtMs(buckets.get(a)?.[0] ?? { id: 0 }) ||
      (buckets.get(b)?.[0]?.id ?? 0) - (buckets.get(a)?.[0]?.id ?? 0),
  );

  const out: T[] = [];
  let round = 0;
  while (out.length < limit) {
    let added = false;
    for (const k of keys) {
      if (out.length >= limit) break;
      const bucket = buckets.get(k);
      if (!bucket || round >= bucket.length) continue;
      out.push(bucket[round]!);
      added = true;
    }
    if (!added) break;
    round++;
  }

  return out;
}

/** Bitişik aynı kategori slug'larını ayır */
export function spreadByCategorySlug<T extends MixableVideo>(videos: T[], limit: number): T[] {
  const remaining = [...videos];
  const out: T[] = [];
  let lastCat = "";

  while (out.length < limit && remaining.length > 0) {
    let idx = remaining.findIndex((v) => (v.categorySlug?.trim() || "_") !== lastCat);
    if (idx < 0) idx = 0;
    const pick = remaining.splice(idx, 1)[0]!;
    out.push(pick);
    lastCat = pick.categorySlug?.trim() || "_";
  }

  return out;
}

/** Aynı kategoriden ardışık en fazla `maxRun` video — Yekçek feed çeşitliliği */
export function spreadByCategorySlugMaxRun<T extends MixableVideo>(
  videos: T[],
  limit: number,
  maxRun = 2,
): T[] {
  const remaining = [...videos];
  const out: T[] = [];
  let lastCat = "";
  let run = 0;

  while (out.length < limit && remaining.length > 0) {
    let idx = remaining.findIndex((v) => {
      const cat = v.categorySlug?.trim() || "_";
      return cat !== lastCat || run < maxRun;
    });
    if (idx < 0) idx = 0;
    const pick = remaining.splice(idx, 1)[0]!;
    const cat = pick.categorySlug?.trim() || "_";
    if (cat === lastCat) run += 1;
    else {
      lastCat = cat;
      run = 1;
    }
    out.push(pick);
  }

  return out;
}

const NEWS_CATEGORY_SLUGS = new Set([
  "haberler",
  "haber",
  "gundem",
  "politika",
  "spor",
  "dunya",
  "ekonomi",
  "magazin",
]);

function isNewsCategory(slug: string | null | undefined): boolean {
  const s = (slug ?? "").trim().toLowerCase();
  if (!s) return false;
  if (NEWS_CATEGORY_SLUGS.has(s)) return true;
  return s.includes("haber") || s.includes("gundem");
}

/** Kanal adından haber kaynağı tahmini — DB kategori yanlış olsa bile */
export function isNewsChannelName(name: string | null | undefined): boolean {
  const n = (name ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!n) return false;
  if (n.includes("haber") || n.includes("gundem") || n.includes("news")) return true;
  return /\b(ntv|cnn|trt|sozcu|sözcü|a haber|haberturk|halk tv|tv100|tele1|ulusal|bloomberg|ekonomi|spor)\b/.test(n);
}

export function isNewsLikeVideo(v: Pick<MixableVideo, "categorySlug" | "channelName">): boolean {
  return isNewsCategory(v.categorySlug) || isNewsChannelName(v.channelName);
}

/** Haber siteleri: yalnızca haber kanalları, karma */
export function mixVideosNewsOnly<T extends MixableVideo>(
  videos: T[],
  limit: number,
  sessionSeed?: number,
): T[] {
  const news = dedupeVideosByVideoId(videos.filter((v) => isNewsLikeVideo(v)));
  const pool = sessionSeed != null ? contentPriority(shuffleBySeed(news, sessionSeed)) : contentPriority(news);
  return spreadByCategorySlug(mixVideosByChannel(pool, limit), limit);
}

/** Haber siteleri: haber kanalları önde, diğer kategorilerle karma */
export function mixVideosForNewsSiteFeed<T extends MixableVideo>(
  videos: T[],
  limit: number,
  sessionSeed?: number,
): T[] {
  const unique = dedupeVideosByVideoId(videos);
  const pool = sessionSeed != null ? contentPriority(shuffleBySeed(unique, sessionSeed)) : contentPriority(unique);

  const news = pool.filter((v) => isNewsLikeVideo(v));
  const rest = pool.filter((v) => !isNewsLikeVideo(v));

  const newsTarget = Math.min(news.length, Math.max(Math.ceil(limit * 0.55), Math.min(4, limit)));
  const newsMixed = mixVideosByChannel(news, newsTarget);
  const restMixed = mixVideosByChannel(rest, limit);

  const out: T[] = [];
  let ni = 0;
  let ri = 0;
  while (out.length < limit && (ni < newsMixed.length || ri < restMixed.length)) {
    for (let i = 0; i < 2 && ni < newsMixed.length && out.length < limit; i++) {
      out.push(newsMixed[ni++]!);
    }
    if (ri < restMixed.length && out.length < limit) {
      out.push(restMixed[ri++]!);
    }
    if (ni >= newsMixed.length) {
      while (ri < restMixed.length && out.length < limit) out.push(restMixed[ri++]!);
    }
  }

  return spreadByCategorySlug(out, limit);
}

/** Anasayfa: tekrar eden videoId'leri ayıkla, seed ile karıştır, kanal başına bir + kategori çeşitliliği */
export function mixVideosForHomeFeed<T extends MixableVideo>(
  videos: T[],
  limit: number,
  sessionSeed?: number,
): T[] {
  const unique = dedupeVideosByVideoId(videos);
  const pool =
    sessionSeed != null ? contentPriority(shuffleBySeed(unique, sessionSeed)) : contentPriority(unique);
  const byChannel = mixVideosByChannel(pool, limit);
  return spreadByCategorySlug(byChannel, limit);
}

/** Deterministik karışım — büyük SQL havuzlarında md5 ORDER BY yerine bellek içi kullan */
export function shuffleBySeed<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = Math.abs(seed) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Aynı kanaldan ardışık en fazla `maxRun` video — Yekçek feed kanal tekrarını azaltır */
export function spreadByChannelMaxRun<T extends MixableVideo>(
  videos: T[],
  limit: number,
  maxRun = 1,
): T[] {
  const remaining = [...videos];
  const out: T[] = [];
  let lastChannel = "";
  let run = 0;

  while (out.length < limit && remaining.length > 0) {
    let idx = remaining.findIndex((v) => {
      const ch = channelKey(v);
      return ch !== lastChannel || run < maxRun;
    });
    if (idx < 0) idx = 0;
    const pick = remaining.splice(idx, 1)[0]!;
    const ch = channelKey(pick);
    if (ch === lastChannel) run += 1;
    else {
      lastChannel = ch;
      run = 1;
    }
    out.push(pick);
  }

  return out;
}

/** YekÇek: oturum seed ile karıştır, kanal/kategori tekrarını azalt (ardışık aynı kanal yok) */
export function mixShortsFeed<T extends MixableVideo>(videos: T[], limit: number, sessionSeed?: number): T[] {
  const unique = dedupeVideosByVideoId(videos);
  const seed = sessionSeed ?? Math.floor(Math.random() * 1_000_000_000);
  const shuffled = shuffleBySeed(unique, seed);
  const byChannel = mixVideosByChannel(shuffled, Math.min(limit * 4, shuffled.length));
  const channelSpread = spreadByChannelMaxRun(byChannel, Math.min(limit * 3, byChannel.length), 1);
  return spreadByCategorySlugMaxRun(channelSpread, limit, 1);
}

/** YekÇek — son izlenen kanalları geriye it, yeni kanalları öne al */
export function mixShortsFeedPersonalized<T extends MixableVideo>(
  videos: T[],
  limit: number,
  sessionSeed?: number,
  recentSourceIds?: Set<number>,
): T[] {
  if (!recentSourceIds?.size) return mixShortsFeed(videos, limit, sessionSeed);
  const fresh = videos.filter((v) => !v.sourceId || !recentSourceIds.has(v.sourceId));
  const repeat = videos.filter((v) => v.sourceId && recentSourceIds.has(v.sourceId));
  const primary = mixShortsFeed(fresh, limit, sessionSeed);
  if (primary.length >= limit) return primary;
  const filler = mixShortsFeed(repeat, limit - primary.length, sessionSeed);
  return [...primary, ...filler];
}

export function parseShortsSessionSeed(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

/** Yekçek feed'den hariç tutulacak YouTube video ID'leri (son izlenenler) */
export function parseExcludeYoutubeVideoIds(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  const out = new Set<string>();
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(id)) out.add(id);
    if (out.size >= 80) break;
  }
  return out;
}
