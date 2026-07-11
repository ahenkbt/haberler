import type { RssFeedItem } from "./rssFeedParse.js";

/** NTV'nin her gün yenilenen AFAD/Kandilli listesi SEO şablonu — gerçek deprem haberi değil. */
const NTV_EVERGREEN_DEPREM_LINK_RE =
  /ntv\.com\.tr\/(?:[^?#]*\/)?son-dakika(?:-[^/]+)?-deprem-mi-oldu(?:-az-once-deprem-nerede-oldu|-[^/]*-deprem-[^/]*-nerede-oldu)/i;

const NTV_EVERGREEN_DEPREM_LINK_ALT_RE =
  /ntv\.com\.tr\/[^?#]*deprem-mi-oldu[^?#]*(?:deprem-nerede-oldu|kandilli-ve-afad-son-depremler)/i;

function normalizeNtvDepremMatchText(value: string): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'"]/g, " ")
    .replace(/[^a-z0-9\s?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isNtvDepremListicleTitle(title: string): boolean {
  const norm = normalizeNtvDepremMatchText(title);
  if (!norm) return false;
  if (!/\bdeprem mi oldu\b/.test(norm)) return false;
  if (/\bdeprem nerede oldu\b/.test(norm)) return true;
  if (/\bafad son depremler\b/.test(norm)) return true;
  if (/\bkandilli\b/.test(norm) && /\bson deprem/.test(norm)) return true;
  if (/\bson depremler listesi\b/.test(norm)) return true;
  return false;
}

function isNtvDepremListicleLink(link: string): boolean {
  const url = String(link ?? "").trim();
  if (!url) return false;
  if (!/ntv\.com\.tr/i.test(url)) return false;
  return NTV_EVERGREEN_DEPREM_LINK_RE.test(url) || NTV_EVERGREEN_DEPREM_LINK_ALT_RE.test(url);
}

/** NTV RSS — «deprem mi oldu / nerede oldu» günlük şablon haberlerini at. */
export function isExcludedNtvEvergreenDepremRssItem(
  item: Pick<RssFeedItem, "title" | "link"> | { title?: string | null; link?: string | null },
): boolean {
  const title = String(item.title ?? "").trim();
  const link = String(item.link ?? "").trim();
  if (isNtvDepremListicleLink(link)) return true;
  return isNtvDepremListicleTitle(title);
}

/** Önbellekteki portal RSS satırları için aynı filtre. */
export function isExcludedNtvEvergreenDepremPortalItem(item: {
  title?: string | null;
  link?: string | null;
}): boolean {
  return isExcludedNtvEvergreenDepremRssItem(item);
}
