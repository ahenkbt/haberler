import type { RssFeedItem } from "./rssFeedParse.js";

/** CUMHA köşe yazarları sayfası / RSS — Yekpare hibrit kaynaklardan hariç tutulur. */
const CUMHA_KOESE_PAGE_PATH = /cumha\.com\.tr\/(?:koese-yazilari|rss\/category\/koese-yazilari)(?:\/|$|\?)/i;

/** CUMHA köşe yazısı RSS öğesi: açıklama metni veya columnist görseli. */
const CUMHA_KOESE_ITEM_MARKER = /k[oö]şe\s*yaz|\/uploads\/images\/columnist\//i;

/** CUMHA RSS gövdesi / spot sonundaki standart platform açıklaması. */
const CUMHA_DISCLAIMER_RE =
  /cumha\.com\.tr\s*,?\s*CUMHA[\s\S]*?tarafs[ıi]z\s+bir\s+yay[ıi]n\s+zemini\s+sunar\.?/gi;

const CUMHA_DISCLAIMER_BLOCK_RE =
  /<(?:p|div|span|section|article|li|blockquote|h[1-6])[^>]*>[\s\S]*?cumha\.com\.tr[\s\S]*?yay[ıi]n\s+zemini\s+sunar\.?[\s\S]*?<\/(?:p|div|span|section|article|li|blockquote|h[1-6])>/gi;

function shouldStripCumhaDisclaimer(...parts: Array<string | null | undefined>): boolean {
  const blob = parts.filter(Boolean).join("\n");
  if (!blob.trim()) return false;
  return /cumha\.com\.tr/i.test(blob) || /Cumhur\s+Haber\s+Ajans[ıi]/i.test(blob);
}

/** CUMHA RSS spot / düz metinden platform disclaimer paragrafını çıkarır. */
export function stripCumhaDisclaimerText(value: string): string {
  const text = String(value ?? "")
    .replace(CUMHA_DISCLAIMER_RE, " ")
    .replace(/[\s.,]*cumha\.com\.tr[\s\S]*$/i, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return text;
}

/** CUMHA RSS HTML gövdesinden disclaimer bloğunu çıkarır. */
export function stripCumhaDisclaimerHtml(html: string): string {
  let out = String(html ?? "").trim();
  if (!out) return "";
  if (!shouldStripCumhaDisclaimer(out)) return out;
  out = out.replace(CUMHA_DISCLAIMER_BLOCK_RE, "");
  out = out.replace(CUMHA_DISCLAIMER_RE, "");
  return out.replace(/<p>\s*(?:<br\s*\/?>\s*)*<\/p>/gi, "").trim();
}

export function sanitizeCumhaRssSpot(spot: string | null | undefined, link?: string | null): string {
  const raw = String(spot ?? "").trim();
  if (!raw) return "";
  if (!shouldStripCumhaDisclaimer(link, raw)) return raw;
  return stripCumhaDisclaimerText(raw);
}

export function sanitizeCumhaRssPortalFields(item: {
  spot?: string | null;
  contentHtml?: string | null;
  link?: string | null;
}): { spot: string; contentHtml: string } {
  const link = String(item.link ?? "").trim();
  const spotRaw = String(item.spot ?? "").trim();
  const htmlRaw = String(item.contentHtml ?? "").trim();
  const spot = sanitizeCumhaRssSpot(spotRaw, link);
  const contentHtml =
    htmlRaw && shouldStripCumhaDisclaimer(link, htmlRaw, spotRaw)
      ? stripCumhaDisclaimerHtml(htmlRaw)
      : htmlRaw;
  return { spot, contentHtml };
}

export function isExcludedCumhaKoeseFeedUrl(feedUrl: string): boolean {
  const url = String(feedUrl ?? "").trim();
  if (!url) return false;
  return CUMHA_KOESE_PAGE_PATH.test(url);
}

export function isExcludedCumhaKoeseRssItem(item: Pick<RssFeedItem, "link" | "rawInner" | "desc" | "descHtml">): boolean {
  const link = String(item.link ?? "").trim();
  if (link && CUMHA_KOESE_PAGE_PATH.test(link)) return true;

  const blob = [item.rawInner, item.desc, item.descHtml].filter(Boolean).join("\n");
  if (!blob) return false;
  return CUMHA_KOESE_ITEM_MARKER.test(blob);
}

export function isExcludedCumhaKoesePortalItem(item: { link?: string | null; spot?: string | null; contentHtml?: string | null }): boolean {
  const link = String(item.link ?? "").trim();
  if (link && CUMHA_KOESE_PAGE_PATH.test(link)) return true;

  const blob = [item.spot, item.contentHtml].filter(Boolean).join("\n");
  if (!blob) return false;
  return CUMHA_KOESE_ITEM_MARKER.test(blob);
}
