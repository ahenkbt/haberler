import { slugifyVideoCategory } from "./yektubeCategoryCatalog.js";
import { LIVE_FILM_DIZI_SLUG } from "../data/videoTvLiveCategories.js";

export const LIVE_COCUK_ANIMATION_SLUG = "cocuk-animasyon";

const LIVE_FILM_DIZI_ALIASES = new Set([
  LIVE_FILM_DIZI_SLUG,
  "sinema",
  "dizi",
  "film-ve-animasyon",
  "film",
  "filmler",
  "sinema-filmleri",
]);

export function normalizeLiveFilmDiziSlug(slug: string | null | undefined): string {
  const norm = slugifyVideoCategory(slug ?? "");
  if (!norm) return "";
  return LIVE_FILM_DIZI_ALIASES.has(norm) ? LIVE_FILM_DIZI_SLUG : norm;
}

const SPOR =
  /\b(spor|sports|bein|a\s*spor|ht\s*spor|trt\s*spor|fb\s*tv|gs\s*tv|tjk\s*tv)\b/i;
const MUzik =
  /\b(müzik|muzik|akustik|kral\s*akustik|dream\s*flow|music\s*tv|radyo\s*tv)\b/i;
const HABER =
  /\b(haber|news|ntv|cnn|trt|sozc|sözc|szc|global|turk|türk|ulke|ülke|akit|tvnet|bloomberg|lider|kanal\s*7|a\s*haber|a\s*news|a\s*para|24\s*tv|haberturk|habertürk|tgrt|bengü|bengu|ulusal|paras|tv100|haber\s*global|sözcü|sozcu|szc\s*tv|television|televizyon)\b/i;
const FILM = /\b(film|sinema|movie|sinema\s*tv|cinema)\b/i;
const DIZI = /\b(dizi|series|drama\s*tv)\b/i;
const DOGA = /\b(doğa|doga|nature|wildlife)\b/i;
const KOMEDI = /\b(komedi|comedy|güldür|guldur)\b/i;
const COCUK =
  /\b(çocuk|cocuk|kids|kid'?s?)\b|mutlu\s*çocuk|mutlu\s*cocuk|hophop|hop\s*hop|bayku[sş]\s*hop|niloya|rafadan|tayfa|cocomelon|peppa\s*pig|trt\s*çocuk|trt\s*cocuk|çizgi\s*film|cizgi\s*film|cartoon\s*(for\s*)?kids|minik\s*(çocuk|cocuk|kamyon|traktör|traktor|otobüs|otobus)|kukuli|kral\s*[şs]akir|ma[şs]a\s*(ve|&)\s*ay[ıi]|pororo|paw\s*patrol|bluey|blippi|dave\s*and\s*ava|super\s*çocuk|super\s*cocuk|bebek\s*tv|çocuk\s*tv|cocuk\s*tv|yard[ıi]mc[ıi]\s*arabalar?|arabalar|küçük\s*kamyon|kucuk\s*kamyon|kamyon\s*leo|\bleo\b|traktör\s*tom|traktor\s*tom|otobüs\s*güler|otobus\s*guler|bebek\s*ile|animasyon\s*(kanal|tv)|kids?\s*animation/i;

/** Canlı TV — grafik doğum / hamilelik içeriği (tüm raflardan gizle) */
const LIVE_BIRTH_KEYWORDS =
  /\b(doğum|dogum|doğu[mş]|dogus|birth(?:ing)?|childbirth|giving\s*birth|live\s*birth|labor|labour|parturition|pregnancy|pregnant|hamile(?:lik)?|geburt|geburts|por[oó]d|rodzic|maternity|obstetric|midwife|doula|perinatal|doğum\s*(?:anı|videosu|yayın|yayini)|dogum\s*(?:ani|videosu|yayin|yayını)|birth\s*(?:video|stream|vlog|footage|cam|live)|real\s*birth|natural\s*birth|home\s*birth|hospital\s*birth|c[\-\s]?section|cesarean|caesarean|vbac|epidural|contractions?|cervix|dilated|placenta|newborn\s*(?:birth|delivery))\b/i;

const LIVE_BIRTH_CHANNEL_BLOCKLIST =
  /(?:^|[\s|·\-–—])zrozum(?:ie[cć]|iec)|zrozumie[cć]|rozumie[cć]|understand\s*birth|birth\s*understand/i;

/** Spam doğum yayınlarında kullanılan yanıltıcı başlıklar */
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

/** Kanal adı, başlık veya açıklamada grafik doğum içeriği mi? */
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

/** Canlı TV kanal adı / başlığı çocuk animasyon mu? */
export function isKidsLiveChannel(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return COCUK.test(t);
}

/** Canlı TV kanal adına göre kategori tahmini */
export function guessLiveTvCategory(name: string, title?: string | null): string {
  const text = `${name} ${title ?? ""}`.trim();
  if (!text) return "haberler";
  if (isKidsLiveChannel(text)) return LIVE_COCUK_ANIMATION_SLUG;
  if (SPOR.test(text)) return "spor";
  if (MUzik.test(text) && !HABER.test(text)) return "muzik";
  if (HABER.test(text)) return "haberler";
  if (FILM.test(text) || DIZI.test(text)) return LIVE_FILM_DIZI_SLUG;
  if (DOGA.test(text)) return "doga";
  if (KOMEDI.test(text)) return "komedi";
  return "haberler";
}

export function normalizeLiveCategorySlug(name: string, title?: string | null, preset?: string): string {
  const text = `${name} ${title ?? ""}`.trim();
  if (isKidsLiveChannel(text)) return LIVE_COCUK_ANIMATION_SLUG;

  const fromPreset = preset ? slugifyVideoCategory(preset) : "";
  if (fromPreset) return fromPreset;
  return slugifyVideoCategory(guessLiveTvCategory(name, title)) || "haberler";
}

/** API yanıtı — DB'deki slug'ı ad/heuristic ile düzelt (çocuk kanalları sinema'dan ayır) */
export function resolveLiveSourceCategorySlug(
  name: string,
  title?: string | null,
  storedSlug?: string | null,
): string {
  const text = `${name} ${title ?? ""}`.trim();
  if (isKidsLiveChannel(text)) return LIVE_COCUK_ANIMATION_SLUG;

  const stored = storedSlug?.trim();
  if (stored) {
    const normStored = slugifyVideoCategory(stored);
    if (normStored === LIVE_COCUK_ANIMATION_SLUG || normStored === "cocuk" || normStored === "cocuk-animasyonu") {
      return LIVE_COCUK_ANIMATION_SLUG;
    }
    const merged = normalizeLiveFilmDiziSlug(stored);
    if (merged === LIVE_FILM_DIZI_SLUG && isKidsLiveChannel(text)) return LIVE_COCUK_ANIMATION_SLUG;
    if (merged) return merged;
    const norm = slugifyVideoCategory(stored);
    return norm || stored;
  }
  return guessLiveTvCategory(name, title);
}
