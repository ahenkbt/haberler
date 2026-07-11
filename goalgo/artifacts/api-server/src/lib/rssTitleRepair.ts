import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db, newsTable } from "@workspace/db";
import { sanitizeDisplayText } from "./sanitizeDisplayText.js";

const RSS_TITLE_JUNK_MARKERS = ["Savunma gündemi:", "Denizden:", "Sektörden:", "Gündem:"];

/** RSS / makale sayfası `<title>` sonuna eklenen yayıncı markaları. */
const RSS_PUBLISHER_TITLE_SUFFIXES = [
  "SavunmaSanayiST",
  "Savunma Sanayi ST",
  "Defense Here",
  "Diriliş Postası",
];

function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function escapeRegex(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function junkMarkerCount(title: string): number {
  const lower = title.toLowerCase();
  let count = 0;
  for (const marker of RSS_TITLE_JUNK_MARKERS) {
    if (lower.includes(marker.toLowerCase())) count++;
  }
  return count;
}

function isJunkFragment(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.length <= 3) return true;
  if (/^(s|g|se|sek|günde|savunma|gündem|gündemi|denizden|sektörden)$/iu.test(t)) return true;
  if (junkMarkerCount(t) > 0) return true;
  if (/:\s*(günd|deni|se|savun|gündem|gündemi)\b/i.test(t)) return true;
  return false;
}

export function hasRssJunkTitle(title: string): boolean {
  const t = title.trim();
  if (!t) return false;
  if (junkMarkerCount(t) > 0) return true;
  if (/SavunmaSanayiST/i.test(t)) return true;
  if ((t.match(/\s\|\s/g) ?? []).length >= 1 && t.includes(":")) return true;
  if ((t.match(/\s\|\s/g) ?? []).length >= 2) return true;
  if ((t.match(/:/g) ?? []).length >= 3) return true;
  if (/:\s*(Günd|Deni|Se|Savun|gündem|gündemi)\b/i.test(t)) return true;
  if (t.length > 100 && t.includes("|")) return true;
  return false;
}

export function stripRssPublisherSuffixFromTitle(title: string): string {
  let t = title.trim();
  if (!t) return t;

  for (let pass = 0; pass < 8; pass++) {
    const prev = t;
    for (const suffix of RSS_PUBLISHER_TITLE_SUFFIXES) {
      const reEnd = new RegExp(`\\s*[|\\-–—]\\s*${escapeRegex(suffix)}\\s*$`, "iu");
      const reStart = new RegExp(`^\\s*${escapeRegex(suffix)}\\s*[|\\-–—]\\s*`, "iu");
      t = t.replace(reEnd, "").replace(reStart, "").trim();
    }
    if (t === prev) break;
  }

  return t.slice(0, 200);
}

function removeAllJunkMarkers(title: string): string {
  let t = title.trim();
  for (let pass = 0; pass < 16; pass++) {
    const prev = t;
    for (const marker of RSS_TITLE_JUNK_MARKERS) {
      const re = new RegExp(`${escapeRegex(marker)}\\s*`, "giu");
      t = t.replace(re, " ").trim();
    }
    t = t
      .replace(/\|\s*\|/g, "|")
      .replace(/^\|\s*|\s*\|$/g, "")
      .replace(/:\s*(Günd|Deni|Se|Savun|gündem|gündemi)\.?\.?\.?\s*$/iu, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (t === prev) break;
  }
  return t;
}

function scoreTitleCandidate(text: string): number {
  const t = text.trim();
  if (!t || isJunkFragment(t)) return -1000;
  let score = t.length;
  score -= junkMarkerCount(t) * 80;
  if (/[.!?]$/.test(t)) score += 8;
  if (/\(\w+\)/.test(t)) score += 6;
  if (/\d/.test(t)) score += 4;
  if (t.split(/\s+/).length >= 4) score += 10;
  return score;
}

export function stripCorruptedRssImportTitle(title: string): string {
  let t = title.trim();
  if (!t) return t;

  const parts = t.includes("|")
    ? t.split(/\s*\|\s*/).map((part) => removeAllJunkMarkers(part.trim())).filter(Boolean)
    : [removeAllJunkMarkers(t)];

  const ranked = parts
    .map((text) => ({ text, score: scoreTitleCandidate(text) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked[0]?.text) {
    return ranked[0].text.slice(0, 200);
  }

  const fallback = removeAllJunkMarkers(parts.sort((a, b) => b.length - a.length)[0] ?? t);
  return fallback.slice(0, 200);
}

export function titleFromNewsSlug(slug: string): string | null {
  const raw = String(slug ?? "").trim();
  if (!raw) return null;
  const base = raw.replace(/-\d{13,}(?:-[^-]+)*$/, "");
  if (base.length < 8) return null;

  const words = base.split("-").filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i] ?? "";
    const next = words[i + 1] ?? "";
    if (/^\d+$/.test(next) && /^[a-z]{1,4}$/i.test(w)) {
      out.push(`${w.toUpperCase()}-${next}`);
      i++;
      continue;
    }
    if (w.length <= 5) out.push(w.toUpperCase());
    else out.push(w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }
  const title = out.join(" ").replace(/\s+/g, " ").trim();
  return title.length >= 8 ? title.slice(0, 200) : null;
}

export function extractArticleUrlFromNewsContent(content: string | null | undefined): string | null {
  const html = String(content ?? "");
  const patterns = [
    /https?:\/\/(?:www\.)?savunmasanayist\.com\/[a-z0-9\-_/]+/gi,
    /https?:\/\/(?:www\.)?defensehere\.com\/[a-z0-9\-_/]+/gi,
  ];
  for (const re of patterns) {
    const m = html.match(re)?.[0];
    if (m) return m.replace(/['",]+$/, "");
  }
  return null;
}

export function normalizeRssImportTitle(title: string): string {
  return stripRssPublisherSuffixFromTitle(stripCorruptedRssImportTitle(title)).slice(0, 200);
}

export function needsRssTitleRepair(title: string): boolean {
  const normalized = normalizeRssImportTitle(title);
  return normalized !== title.trim() || hasRssJunkTitle(title);
}

/** @deprecated use hasRssJunkTitle */
export const isCorruptedRssImportTitle = hasRssJunkTitle;

function cleanFetchedTitle(raw: string): string {
  return normalizeRssImportTitle(decodeHtmlEntities(stripTags(raw)));
}

export function extractArticleTitleFromHtml(html: string): string | null {
  const metaOg =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1];
  if (metaOg) {
    const title = cleanFetchedTitle(metaOg);
    if (title.length >= 5 && !hasRssJunkTitle(title)) return title;
  }

  const twitter =
    html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:title["']/i)?.[1];
  if (twitter) {
    const title = cleanFetchedTitle(twitter);
    if (title.length >= 5 && !hasRssJunkTitle(title)) return title;
  }

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (h1) {
    const title = cleanFetchedTitle(h1);
    if (title.length >= 5 && !hasRssJunkTitle(title)) return title;
  }

  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (titleTag) {
    const title = cleanFetchedTitle(titleTag);
    if (title.length >= 5 && !hasRssJunkTitle(title)) return title;
  }

  return null;
}

export async function fetchOriginalArticleTitle(articleUrl: string): Promise<string | null> {
  try {
    const response = await fetch(articleUrl, {
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
    });
    if (!response.ok) return null;
    const html = await response.text();
    return extractArticleTitleFromHtml(html);
  } catch {
    return null;
  }
}

export function resolveTitleFromNewsRecord(input: {
  title: string;
  slug?: string | null;
  rssSourceUrl?: string | null;
  content?: string | null;
}): string {
  const candidates: string[] = [];
  const normalized = normalizeRssImportTitle(input.title);
  if (normalized && !hasRssJunkTitle(normalized)) candidates.push(normalized);

  const fromSlug = input.slug ? titleFromNewsSlug(input.slug) : null;
  if (fromSlug && !hasRssJunkTitle(fromSlug)) candidates.push(fromSlug);

  const best = candidates.sort((a, b) => scoreTitleCandidate(b) - scoreTitleCandidate(a))[0];
  if (best && best.length >= 5) return best;
  return input.title.trim().slice(0, 200);
}

export async function resolveRepairedRssImportTitle(input: {
  title: string;
  slug?: string | null;
  rssSourceUrl?: string | null;
  content?: string | null;
}): Promise<string | null> {
  const currentTitle = input.title.trim();
  const sourceUrl = input.rssSourceUrl || extractArticleUrlFromNewsContent(input.content);

  let nextTitle: string | null = null;
  if (sourceUrl) {
    nextTitle = await fetchOriginalArticleTitle(sourceUrl);
  }
  if (!nextTitle || hasRssJunkTitle(nextTitle)) {
    nextTitle = resolveTitleFromNewsRecord(input);
  } else {
    nextTitle = normalizeRssImportTitle(nextTitle);
  }

  if (!nextTitle || nextTitle.length < 5) return null;
  if (nextTitle === currentTitle) return null;
  if (hasRssJunkTitle(nextTitle)) return null;
  return nextTitle;
}

function corruptedTitleWhere() {
  return or(
    ilike(newsTable.title, "%savunma gündemi:%"),
    ilike(newsTable.title, "%denizden:%"),
    ilike(newsTable.title, "%sektörden:%"),
    ilike(newsTable.title, "%gündem:%"),
    ilike(newsTable.title, "%SavunmaSanayiST%"),
    ilike(newsTable.title, "% | %"),
    sql`length(${newsTable.title}) > 100`,
  );
}

export async function repairCorruptedRssImportTitlesBatch(options?: {
  limit?: number;
  dryRun?: boolean;
}): Promise<{
  scanned: number;
  fixed: number;
  failed: number;
  results: Array<{ id: number; ok: boolean; from: string; to?: string; error?: string }>;
}> {
  const limit = Math.min(500, Math.max(1, options?.limit ?? 200));
  const dryRun = options?.dryRun === true;

  const rows = await db
    .select({
      id: newsTable.id,
      title: newsTable.title,
      slug: newsTable.slug,
      rssSourceUrl: newsTable.rssSourceUrl,
      content: newsTable.content,
    })
    .from(newsTable)
    .where(and(eq(newsTable.isEditorManual, false), corruptedTitleWhere()))
    .limit(limit);

  const results: Array<{ id: number; ok: boolean; from: string; to?: string; error?: string }> = [];
  let fixed = 0;
  let failed = 0;

  for (const row of rows) {
    if (!needsRssTitleRepair(row.title)) continue;
    const nextTitle = await resolveRepairedRssImportTitle(row);
    if (!nextTitle || nextTitle === row.title.trim() || nextTitle.length < 5 || hasRssJunkTitle(nextTitle)) {
      failed++;
      results.push({ id: row.id, ok: false, from: row.title, error: "düzeltilemedi" });
      continue;
    }
    if (!dryRun) {
      await db.update(newsTable).set({ title: nextTitle }).where(eq(newsTable.id, row.id));
    }
    fixed++;
    results.push({ id: row.id, ok: true, from: row.title, to: nextTitle });
  }

  return { scanned: rows.length, fixed, failed, results };
}

export async function repairAllCorruptedRssImportTitles(options?: {
  maxBatches?: number;
  batchSize?: number;
}): Promise<{ totalFixed: number; batches: number }> {
  const maxBatches = Math.min(50, Math.max(1, options?.maxBatches ?? 20));
  const batchSize = Math.min(500, Math.max(1, options?.batchSize ?? 200));
  let totalFixed = 0;
  let batches = 0;

  for (let i = 0; i < maxBatches; i++) {
    const result = await repairCorruptedRssImportTitlesBatch({ limit: batchSize });
    batches++;
    totalFixed += result.fixed;
    if (result.fixed === 0) break;
  }

  return { totalFixed, batches };
}

/** API yanıtında bozuk RSS başlıklarını anında düzgün göster. */
export function displayNewsTitle(row: {
  title: string;
  slug?: string | null;
  isEditorManual?: boolean | null;
}): string {
  if (row.isEditorManual) return sanitizeDisplayText(row.title);
  if (!needsRssTitleRepair(row.title)) return sanitizeDisplayText(row.title);
  return sanitizeDisplayText(resolveTitleFromNewsRecord(row));
}
