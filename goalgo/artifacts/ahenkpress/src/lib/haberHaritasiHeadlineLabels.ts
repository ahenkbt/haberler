import {
  detectLanguage,
  type DetectedHeadlineLanguage,
} from "@/lib/haberHaritasiNewsmapBottomBand";
import type { HmMapCityHeadline } from "@/lib/hmMapCityNews";

export type HeadlineLabelInput = Pick<HmMapCityHeadline, "title" | "feedLabel" | "kind">;

const DUTCH_CHAR_RE = /[ëïéèê]/i;
const DUTCH_WORD_RE =
  /\b(het|de|een|niet|met|voor|naar|bij|van|nieuws|laatste|wereld|vandaag|breaking|live)\b/i;
const GERMAN_CHAR_RE = /[äöüß]/i;
const GERMAN_WORD_RE =
  /\b(der|die|das|und|für|mit|nach|neu|nachrichten|aktuell|heute|welt)\b/i;

const FEED_LANG_HINTS: Array<{ pattern: RegExp; lang: DetectedHeadlineLanguage }> = [
  { pattern: /\bnl\b|nederland|dutch|nrc|telegraaf|ad\.nl|nos\.nl/i, lang: "nl" },
  { pattern: /\ben\b|english|bbc|reuters|cnn|guardian|nytimes|ap news/i, lang: "en" },
  { pattern: /\bfr\b|français|france|lemonde|france24/i, lang: "fr" },
  { pattern: /\bde\b|deutsch|german|spiegel|zeit\.de/i, lang: "de" },
  { pattern: /türk|turk|\btr\b|milliyet|hurriyet|cumha|ntv|aa\.com/i, lang: "tr" },
];

export function detectLanguageFromFeedLabel(feedLabel?: string | null): DetectedHeadlineLanguage | null {
  const feed = String(feedLabel ?? "").trim();
  if (!feed) return null;
  for (const hint of FEED_LANG_HINTS) {
    if (hint.pattern.test(feed)) return hint.lang;
  }
  return null;
}

export function isLikelyDutchText(text: string): boolean {
  const raw = String(text ?? "").trim();
  if (!raw) return false;
  if (/[çğıöşüÇĞİÖŞÜ]/.test(raw)) return false;
  if (DUTCH_CHAR_RE.test(raw) && DUTCH_WORD_RE.test(raw)) return true;
  return DUTCH_WORD_RE.test(raw) && !/\b(the|and|for|with|from)\b/i.test(raw);
}

export function detectHeadlineLanguage(input: HeadlineLabelInput): DetectedHeadlineLanguage {
  const fromFeed = detectLanguageFromFeedLabel(input.feedLabel);
  if (fromFeed) return fromFeed;
  const title = String(input.title ?? "").trim();
  if (isLikelyDutchText(title)) return "nl";
  if (GERMAN_CHAR_RE.test(title) && GERMAN_WORD_RE.test(title)) return "de";
  return detectLanguage(title);
}

const BREAKING_LABELS: Record<DetectedHeadlineLanguage, string> = {
  tr: "SON DAKİKA",
  en: "Latest News",
  nl: "Laatste nieuws",
  fr: "Dernières nouvelles",
  de: "Aktuelle Nachrichten",
  other: "News",
};

const VIDEO_LABELS: Record<DetectedHeadlineLanguage, string> = {
  tr: "Video",
  en: "Video",
  nl: "Video",
  fr: "Vidéo",
  de: "Video",
  other: "Video",
};

/** Haber rozeti — dil algısına göre (callout, overlay, kart). */
export function resolveHeadlineBreakingLabel(input: HeadlineLabelInput): string {
  if (input.kind === "video") return VIDEO_LABELS[detectHeadlineLanguage(input)];
  return BREAKING_LABELS[detectHeadlineLanguage(input)];
}

/** Ticker şerit başlığı — alt bant sekmesine göre. */
export function resolveTickerStripLabel(tab: "turkce" | "global" = "turkce"): string {
  return tab === "global" ? "LATEST NEWS" : "SON DAKİKA";
}

/** Alt bant panel başlığı. */
export function resolveBottomBandPanelTitle(
  cityLabel: string | null,
  tab: "turkce" | "global" = "turkce",
): string {
  const strip = resolveTickerStripLabel(tab);
  if (!cityLabel) {
    return tab === "global" ? "Latest News" : "Son Dakika Haberler";
  }
  return `${cityLabel} — ${strip}`;
}
