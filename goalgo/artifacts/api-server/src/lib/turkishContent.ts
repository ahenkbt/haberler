/** Türkçe içerik önceliği — başlık/açıklama analizi */

export type SyncLanguageScope = "tr" | "global";

/** Senkron/kazıma isteği — varsayılan yalnızca Türkçe */
export function parseSyncLanguageScope(raw: unknown): SyncLanguageScope {
  if (raw === "global" || raw === true) return "global";
  return "tr";
}

export function videoMatchesSyncLanguage(
  scope: SyncLanguageScope,
  title: string | null | undefined,
  description?: string | null,
  channelName?: string | null,
): boolean {
  if (scope === "global") return true;
  return turkishContentScore(title, description, channelName) > 0;
}

const TR_CHARS = /[ğüşıöçĞÜŞİÖÇ]/;
const TR_WORDS =
  /\b(ve|bir|için|ile|bu|da|de|mi|mı|ne|nasıl|neden|haber|canlı|türkiye|son|dakika|gündem|bakan|cumhurbaşkan|meclis|parti|şehir|ilçe|belediye|müzik|şarkı|film|dizi|oyun|spor)\b/i;
const HEADLINE_TR_CHARS = /[çğıöşüÇĞİÖŞÜıI]/;
const HEADLINE_TR_WORDS =
  /\b(ve|bir|için|ile|olan|olarak|de|da|den|dan|gibi|daha|son|haber|sondakika|türkiye|turkiye|kktc|kıbrıs|kibris|milletvekili|belediye|partisi|bakan|cumhurbaşkan|meclis|ilçe|şehir|vali|kayyum|başkan|chp|akp|mhp|deva|saadet|iyi|hdp|dem|memleket|yeniden|refah|zafer|tıp|turk|turkish|ankara|istanbul|izmir|bursa|antalya|adana|denizli|etimesgut|mamak|tuzla|fethiye|muğla|mugla)\b/i;
const HEADLINE_EN_WORDS =
  /\b(the|and|for|with|from|news|breaking|live|report|says|world|global|update|today|latest)\b/i;
const HEADLINE_FR_CHARS = /[àâäæéèêëïîôùûüÿœ]/i;
const HEADLINE_FR_WORDS =
  /\b(le|la|les|des|une|un|et|pour|avec|dans|sur|est|sont|aux|du|de|en|que|qui|cette|ces|nouvelle|france|monde|aujourd)\b/i;
/** French function words excluding de/en/du — avoids Turkish `-de` false positives. */
const HEADLINE_FR_STRONG_WORDS =
  /\b(le|la|les|des|une|un|et|pour|avec|dans|sur|est|sont|aux|que|qui|cette|ces|nouvelle|france|monde|aujourd)\b/i;
const HEADLINE_DE_CHARS = /[äßÄ]/;
const HEADLINE_DE_WORDS =
  /\b(der|die|das|und|für|fur|mit|von|nicht|ist|sind|wird|werden|auch|nach|bei|aus|über|uber|noch|nur|schon|wenn|weil|dass|diese|dieser|dieses|alle|kein|keine|sein|ihre|unser|mehr|neue|neues|neuer|deutschland|bundesregierung|regierung|polizei|nachrichten)\b/i;
const HEADLINE_NL_WORDS =
  /\b(het|een|van|voor|met|naar|niet|zijn|wordt|worden|door|over|omdat|waarom|allemaal|nederland|politie|regering|minister|ministerie|volgens|vandaag|gisteren|morgen|nieuws|zegt|zeggen|heeft|hebben|was|waren|kunnen|moet|moeten)\b/i;
const HEADLINE_PT_CHARS = /[ãõâêô]/i;
const HEADLINE_PT_WORDS =
  /\b(não|nao|mais|como|também|tambem|governo|presidente|ministro|brasil|portugal|segundo|disse|depois|antes|entre|sobre|porque|quando|onde|todos|todas|estes|essas|nosso|nossa|seus|suas|mundo|notícias|noticias)\b/i;
const HEADLINE_ES_WORDS =
  /\b(el|los|las|del|una|uno|unos|unas|por|para|con|sin|más|mas|también|tambien|gobierno|presidente|ministro|españa|espana|según|segun|dice|dijo|después|despues|todos|todas|mundo|noticias|nuestro|nuestra|su|sus)\b/i;
/** Latin extended letters typical of West-European languages — excludes Turkish çğıöşü. */
const LATIN_EXTENDED_NON_TR_RE = /[àâäæéèêëïîôùûüÿœßãõáíóúñÀÂÄÆÉÈÊËÏÎÔÙÛÜŸŒÃÕÁÍÓÚÑ]/;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u0590-\u05FF]/;
/** Known non-Turkish wire services shown on `/kisa-kisa` when miscategorized. */
const FOREIGN_WORLD_BRIEF_SOURCE_RE =
  /\b(nos|dw|deutsche\s*welle|le\s*monde|oglobo|o\s*globo|globo|spiegel|france\s*24|bbc|reuters|afp|guardian|cnn|ap\s*news|associated\s*press)\b/i;

export function isLikelyTurkish(text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  if (TR_CHARS.test(t)) return true;
  if (TR_WORDS.test(t)) return true;
  return false;
}

function latinExtendedNonTurkishRatio(text: string): number {
  const letters = text.match(/\p{L}/gu);
  if (!letters?.length) return 0;
  if (HEADLINE_TR_CHARS.test(text)) return 0;
  const extended = text.match(LATIN_EXTENDED_NON_TR_RE);
  return (extended?.length ?? 0) / letters.length;
}

/** Yabancı dil başlık sezgisel — dünya bandı (`/kisa-kisa`) için sıkı filtre. */
export function isLikelyForeignHeadline(text: string | null | undefined): boolean {
  const raw = String(text ?? "").trim();
  if (!raw) return false;
  if (HEADLINE_FR_CHARS.test(raw) && HEADLINE_FR_WORDS.test(raw) && !HEADLINE_TR_CHARS.test(raw)) return true;
  if (HEADLINE_FR_STRONG_WORDS.test(raw) && !HEADLINE_TR_CHARS.test(raw)) return true;
  if (HEADLINE_DE_CHARS.test(raw)) return true;
  if (HEADLINE_DE_WORDS.test(raw) && !HEADLINE_TR_CHARS.test(raw)) return true;
  if (HEADLINE_NL_WORDS.test(raw) && !HEADLINE_TR_CHARS.test(raw)) return true;
  if (HEADLINE_PT_CHARS.test(raw) && !HEADLINE_TR_CHARS.test(raw)) return true;
  if (HEADLINE_PT_WORDS.test(raw) && !HEADLINE_TR_CHARS.test(raw)) return true;
  if (HEADLINE_ES_WORDS.test(raw) && !HEADLINE_TR_CHARS.test(raw)) return true;
  if (HEADLINE_EN_WORDS.test(raw) && !HEADLINE_TR_WORDS.test(raw)) return true;
  if (latinExtendedNonTurkishRatio(raw) >= 0.08) return true;
  return false;
}

export function isKnownForeignWorldBriefSource(sourceName: string | null | undefined): boolean {
  const raw = String(sourceName ?? "").trim();
  if (!raw) return false;
  return FOREIGN_WORLD_BRIEF_SOURCE_RE.test(raw);
}

/**
 * `/kisa-kisa` (Dünyadan Kısa Kısa) — yalnızca Türkçe başlıklar.
 * Genel kategori sınıflandırmasından daha sıkı: başlık zorunlu, bilinen yabancı kaynaklar reddedilir.
 */
export function isTurkishWorldBriefContent(
  title: string | null | undefined,
  spot?: string | null,
  lang?: string | null,
  sourceName?: string | null,
): boolean {
  const titleStr = String(title ?? "").trim();
  if (!titleStr) return false;
  if (isKnownForeignWorldBriefSource(sourceName)) return false;

  const langNorm = String(lang ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (langNorm && langNorm !== "tr" && !langNorm.startsWith("tr-")) return false;

  if (shouldMoveNewsToGlobalCategory(titleStr, spot, lang)) return false;
  if (isLikelyForeignHeadline(titleStr)) return false;
  if (!isLikelyTurkishHeadline(titleStr)) return false;

  const spotStr = String(spot ?? "").trim();
  if (spotStr && isLikelyForeignHeadline(spotStr) && !isLikelyTurkishHeadline(spotStr)) return false;

  return true;
}

/** Haber başlığı/spot — newsmap alt bant ile uyumlu Türkçe sezgisel kontrol. */
export function isLikelyTurkishHeadline(text: string | null | undefined): boolean {
  const raw = String(text ?? "").trim();
  if (!raw) return false;
  if (HEADLINE_FR_CHARS.test(raw) && HEADLINE_FR_WORDS.test(raw) && !HEADLINE_TR_CHARS.test(raw)) return false;
  if (HEADLINE_TR_CHARS.test(raw)) return true;
  if (HEADLINE_EN_WORDS.test(raw) && !HEADLINE_TR_WORDS.test(raw)) return false;
  return HEADLINE_TR_WORDS.test(raw);
}

/** Türkçe olmayan haber → global kategori (video hariç). */
export function shouldMoveNewsToGlobalCategory(
  title: string | null | undefined,
  spot?: string | null,
  lang?: string | null,
): boolean {
  const titleStr = String(title ?? "").trim();
  if (!titleStr) return false;

  const langNorm = String(lang ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (langNorm && langNorm !== "tr" && !langNorm.startsWith("tr-")) return true;

  if (isLikelyTurkishHeadline(titleStr)) return false;
  if (isLikelyTurkishHeadline(spot)) return false;

  const combined = `${titleStr} ${String(spot ?? "").trim()}`;
  if (NON_LATIN_SCRIPT_RE.test(combined)) return true;

  if (HEADLINE_FR_CHARS.test(titleStr) && HEADLINE_FR_WORDS.test(titleStr)) return true;
  if (HEADLINE_EN_WORDS.test(titleStr) && !HEADLINE_TR_CHARS.test(titleStr)) return true;

  const asciiLetters = titleStr.replace(/[^a-zA-Z\s]/g, "");
  if (asciiLetters.trim().length >= 6 && !HEADLINE_TR_CHARS.test(titleStr) && !HEADLINE_TR_WORDS.test(titleStr)) {
    if (/^[A-Za-z0-9\s'":;,.!?()-]+$/.test(titleStr.slice(0, 160))) return true;
  }

  return false;
}

export function turkishContentScore(
  title: string | null | undefined,
  description?: string | null,
  channelName?: string | null,
): number {
  let score = 0;
  if (isLikelyTurkish(title)) score += 3;
  if (isLikelyTurkish(description)) score += 1;
  if (isLikelyTurkish(channelName)) score += 2;
  return score;
}

function publishedAtMs(value: string | null | undefined): number {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const n = Date.parse(raw);
  return Number.isFinite(n) ? n : 0;
}

export function sortByTurkishPriority<
  T extends {
    id?: number | null;
    title?: string | null;
    description?: string | null;
    channelName?: string | null;
    sourceName?: string | null;
    publishedAt?: string | null;
  },
>(
  items: T[],
): T[] {
  return [...items].sort(
    (a, b) =>
      turkishContentScore(b.title, b.description, b.channelName ?? b.sourceName) -
        turkishContentScore(a.title, a.description, a.channelName ?? a.sourceName) ||
      publishedAtMs(b.publishedAt) - publishedAtMs(a.publishedAt) ||
      Number(b.id ?? 0) - Number(a.id ?? 0),
  );
}
