import type { MsbSehitRecord } from "./msb-sehitlerimiz.js";

const MEHMETCIK_BASE = "https://www.mehmetcik.org.tr";

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

function slugPart(raw: string): string {
  return raw
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseDateLocationLine(line: string): {
  martyrdomDate: string | null;
  year: number | null;
  location: string;
  notice: string;
} {
  const cleaned = normalizeWhitespace(decodeHtmlEntities(line.replace(/<br\s*\/?>/gi, " ")));
  const match = cleaned.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(.+)$/i);
  if (!match) {
    return { martyrdomDate: null, year: null, location: "", notice: cleaned };
  }
  const [, dateRaw, location] = match;
  const parts = dateRaw.split("/");
  const dd = parts[0]?.padStart(2, "0") ?? "";
  const mm = parts[1]?.padStart(2, "0") ?? "";
  const yyyy = parts[2] ?? "";
  const year = Number(yyyy);
  const martyrdomDate = dd && mm && yyyy ? `${dd}.${mm}.${yyyy}` : null;
  const notice = `${dateRaw} - ${location.trim()}`;
  return {
    martyrdomDate,
    year: Number.isFinite(year) ? year : null,
    location: location.trim(),
    notice,
  };
}

function resolveImageUrl(src: string, baseUrl = MEHMETCIK_BASE): string {
  const trimmed = src.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${baseUrl}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

/** Mehmetçik Vakfı /sehitlerimiz HTML dump'ından kartları çıkarır. */
export function parseMehmetcikSehitCardsFromHtml(
  html: string,
  baseUrl = MEHMETCIK_BASE,
): MsbSehitRecord[] {
  const cards: MsbSehitRecord[] = [];
  const cardRe = /<div class="col-md-2 col-6 text-center sehit">([\s\S]*?)<\/div>/gi;

  for (const match of html.matchAll(cardRe)) {
    const inner = match[1] ?? "";
    const imgMatch = inner.match(/<img[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?/i);
    const nameMatch = inner.match(/<strong>([^<]+)<\/strong>/i);
    const spanMatch = inner.match(/<span[^>]*>([\s\S]*?)<\/span>/i);
    if (!imgMatch || !nameMatch) continue;

    const name = decodeHtmlEntities(nameMatch[1].trim());
    const spanHtml = spanMatch?.[1] ?? "";
    const spanLines = spanHtml
      .split(/<br\s*\/?>/i)
      .map((line) => normalizeWhitespace(decodeHtmlEntities(line.replace(/<[^>]+>/g, ""))))
      .filter(Boolean);
    const rank = spanLines[0] ?? "";
    const metaLine = spanLines.slice(1).join(" ") || spanLines[0] || "";
    const meta = parseDateLocationLine(metaLine.includes("/") ? metaLine : spanLines.join(" - "));

    const imagePath = resolveImageUrl(decodeHtmlEntities(imgMatch[1]), baseUrl);
    const idKey = slugPart(`${name}-${meta.notice || metaLine}-${imgMatch[1]}`);

    cards.push({
      id: `mk:${idKey}`,
      name,
      rank,
      registry: meta.location,
      notice: meta.notice || metaLine,
      martyrdomDate: meta.martyrdomDate,
      year: meta.year,
      imagePath,
    });
  }

  return cards;
}

export function isMartyrdomAfterOctober2025(record: Pick<MsbSehitRecord, "martyrdomDate" | "year">): boolean {
  const raw = record.martyrdomDate ?? "";
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const dot = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const m = slash ?? dot;
  if (m) {
    const year = Number(m[3]);
    const month = Number(m[2]);
    if (year > 2025) return true;
    if (year < 2025) return false;
    return month > 10;
  }
  if (record.year != null) return record.year > 2025;
  return false;
}
