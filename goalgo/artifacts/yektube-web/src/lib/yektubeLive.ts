import type { YektubeSource, YektubeVideo } from "@workspace/yektube-core";

export function isYoutubeVideoId(id: string): boolean {
  const t = id.trim();
  return /^[a-zA-Z0-9_-]{11}$/.test(t) && !t.startsWith("UC");
}

/** YouTube watch URL veya ham metinden video ID çıkarır */
export function extractYoutubeVideoIdFromText(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  if (isYoutubeVideoId(t)) return t;
  try {
    const url = /^https?:\/\//i.test(t) ? new URL(t) : new URL(`https://www.youtube.com/${t.replace(/^\//, "")}`);
    const v = url.searchParams.get("v");
    if (v && isYoutubeVideoId(v)) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    if (["shorts", "embed", "live"].includes(parts[0] ?? "") && parts[1] && isYoutubeVideoId(parts[1])) {
      return parts[1];
    }
    if (url.hostname.includes("youtu.be") && parts[0] && isYoutubeVideoId(parts[0])) return parts[0];
  } catch {
    /* fall through */
  }
  const m = t.match(/(?:v=|\/vi\/|youtu\.be\/|\/embed\/|\/live\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] && isYoutubeVideoId(m[1]) ? m[1] : null;
}

export function isLiveSource(source: Pick<YektubeSource, "isLive" | "sourceType">): boolean {
  return Boolean(source.isLive || source.sourceType === "live");
}

/** TV canlı kaynağı için oynatılacak video ID */
export function resolveLiveVideoId(
  source: Pick<YektubeSource, "id" | "channelId" | "sourceType" | "name" | "url">,
  videos: Pick<YektubeVideo, "videoId" | "sourceId">[] = [],
): string | null {
  const fromDb = videos.find((v) => v.sourceId === source.id && v.videoId?.trim())?.videoId?.trim();
  if (fromDb) return fromDb;

  const cid = source.channelId?.trim() ?? "";
  const fromChannel = extractYoutubeVideoIdFromText(cid);
  if (fromChannel) return fromChannel;

  const fromUrl = extractYoutubeVideoIdFromText(source.url ?? "");
  if (fromUrl) return fromUrl;

  if (source.sourceType === "video" && isYoutubeVideoId(cid)) return cid;
  return null;
}

/** Aynı kanalın tekrarlayan kayıtlarını filtrele */
export function dedupeLiveSources(sources: YektubeSource[]): YektubeSource[] {
  const seen = new Set<string>();
  const out: YektubeSource[] = [];
  for (const s of sources) {
    const vid = extractYoutubeVideoIdFromText(s.channelId) ?? extractYoutubeVideoIdFromText(s.url ?? "") ?? "";
    const key = vid ? `vid:${vid}` : `${s.channelId?.trim() ?? ""}:${s.name.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function parseLiveChannelParam(raw: string | undefined): number | null {
  const n = parseInt(String(raw ?? "").split("-").pop() ?? "", 10);
  return Number.isNaN(n) ? null : n;
}

const LIVE_FILM_DIZI_ALIASES = new Set([
  "film-dizi",
  "sinema",
  "dizi",
  "film-ve-animasyon",
  "film",
  "filmler",
  "sinema-filmleri",
]);

const LIVE_COCUK_ANIMATION_SLUG = "cocuk-animasyon";

const COCUK_LIVE_CHANNEL =
  /\b(çocuk|cocuk|kids|kid'?s?)\b|mutlu\s*çocuk|mutlu\s*cocuk|hophop|hop\s*hop|bayku[sş]\s*hop|niloya|rafadan|tayfa|cocomelon|peppa\s*pig|trt\s*çocuk|trt\s*cocuk|çizgi\s*film|cizgi\s*film|cartoon\s*(for\s*)?kids|minik\s*(çocuk|cocuk|kamyon|traktör|traktor|otobüs|otobus)|kukuli|kral\s*[şs]akir|ma[şs]a\s*(ve|&)\s*ay[ıi]|pororo|paw\s*patrol|bluey|blippi|dave\s*and\s*ava|super\s*çocuk|super\s*cocuk|bebek\s*tv|çocuk\s*tv|cocuk\s*tv|yard[ıi]mc[ıi]\s*arabalar?|arabalar|küçük\s*kamyon|kucuk\s*kamyon|kamyon\s*leo|\bleo\b|traktör\s*tom|traktor\s*tom|otobüs\s*güler|otobus\s*guler|bebek\s*ile|animasyon\s*(kanal|tv)|kids?\s*animation/i;

/** Canlı TV — grafik doğum / hamilelik içeriği (API liveTvCategoryGuess ile uyumlu) */
const LIVE_BIRTH_KEYWORDS =
  /\b(doğum|dogum|doğu[mş]|dogus|birth(?:ing)?|childbirth|giving\s*birth|live\s*birth|labor|labour|parturition|pregnancy|pregnant|hamile(?:lik)?|geburt|geburts|por[oó]d|rodzic|maternity|obstetric|midwife|doula|perinatal|doğum\s*(?:anı|videosu|yayın|yayini)|dogum\s*(?:ani|videosu|yayin|yayını)|birth\s*(?:video|stream|vlog|footage|cam|live)|real\s*birth|natural\s*birth|home\s*birth|hospital\s*birth|c[\-\s]?section|cesarean|caesarean|vbac|epidural|contractions?|cervix|dilated|placenta|newborn\s*(?:birth|delivery))\b/i;

const LIVE_BIRTH_CHANNEL_BLOCKLIST =
  /(?:^|[\s|·\-–—])zrozum(?:ie[cć]|iec)|zrozumie[cć]|rozumie[cć]|understand\s*birth|birth\s*understand/i;

const LIVE_BIRTH_DECOY_TITLES = new Set([
  "epic unreal planet",
  "sand & sea walks",
  "sand and sea walks",
]);

function normalizeLiveBirthText(...parts: Array<string | null | undefined>): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Kanal adı / başlıkta grafik doğum içeriği mi? (istemci yedeği) */
export function isBlockedLiveBirthContent(input: {
  name?: string | null;
  title?: string | null;
  description?: string | null;
  channelTitle?: string | null;
  channelName?: string | null;
}): boolean {
  const text = normalizeLiveBirthText(
    input.name,
    input.title,
    input.description,
    input.channelTitle,
    input.channelName,
  );
  if (!text) return false;
  if (LIVE_BIRTH_KEYWORDS.test(text)) return true;
  if (LIVE_BIRTH_CHANNEL_BLOCKLIST.test(text)) return true;
  for (const decoy of LIVE_BIRTH_DECOY_TITLES) {
    if (text.includes(decoy)) return true;
  }
  return false;
}

export function filterBlockedLiveBirthSources<T extends Pick<YektubeSource, "name" | "isLive" | "sourceType">>(
  sources: T[],
): T[] {
  return sources.filter((s) => {
    if (!isLiveSource(s)) return true;
    return !isBlockedLiveBirthContent({ name: s.name });
  });
}

/** Canlı TV kanal adı / başlığı çocuk animasyon mu? (API liveTvCategoryGuess ile uyumlu) */
function isKidsLiveChannel(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return COCUK_LIVE_CHANNEL.test(t);
}

function liveCategoryShelfSlug(raw: string | null | undefined, name?: string | null): string {
  const label = `${name ?? ""}`.trim();
  if (label && isKidsLiveChannel(label)) return LIVE_COCUK_ANIMATION_SLUG;

  const slug = raw?.trim() || "diger";
  if (slug === LIVE_COCUK_ANIMATION_SLUG || slug === "cocuk" || slug === "cocuk-animasyonu") {
    return LIVE_COCUK_ANIMATION_SLUG;
  }
  if (LIVE_FILM_DIZI_ALIASES.has(slug)) {
    return label && isKidsLiveChannel(label) ? LIVE_COCUK_ANIMATION_SLUG : "film-dizi";
  }
  return slug;
}

export { liveCategoryShelfSlug, isKidsLiveChannel };

const LIVE_CATEGORY_ORDER = [
  "haberler",
  "eglence",
  "film-dizi",
  "muzik",
  "doga",
  "komedi",
  "spor",
  "diger",
  "cocuk-animasyon",
];

export function groupLiveSourcesByCategory(
  sources: YektubeSource[],
): Array<{ slug: string; label: string; items: YektubeSource[] }> {
  const map = new Map<string, YektubeSource[]>();
  for (const s of sources) {
    const slug = liveCategoryShelfSlug(s.categorySlug, s.name);
    const list = map.get(slug) ?? [];
    list.push(s);
    map.set(slug, list);
  }
  return [...map.entries()]
    .map(([slug, items]) => ({ slug, label: slug, items }))
    .sort((a, b) => {
      const ai = LIVE_CATEGORY_ORDER.indexOf(a.slug);
      const bi = LIVE_CATEGORY_ORDER.indexOf(b.slug);
      const ar = ai >= 0 ? ai : LIVE_CATEGORY_ORDER.length;
      const br = bi >= 0 ? bi : LIVE_CATEGORY_ORDER.length;
      if (ar !== br) return ar - br;
      return b.items.length - a.items.length;
    });
}
