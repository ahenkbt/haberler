import { Router, type IRouter } from "express";
import { executeNewsDbWrite, getNewsDbForRead } from "@workspace/db";
import { sql } from "drizzle-orm";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";
import {
  buildProvinceEncyclopediaAliases,
  resolveTurkishProvinceWikiTitle,
  TR_PROVINCE_NAMES_81,
} from "../lib/turkishProvinces.js";
import { slugToWikiTitle, turkishWikiTitleCandidates } from "../lib/wikiSlugTitle.js";
import { toWikiAsciiSlug, wikiAsciiSlugKey } from "../lib/wikiAsciiSlug.js";
import { WORLD_COUNTRIES } from "../lib/worldCountries.js";
import { BILGI_AGACI_STATIC_TOPICS } from "../lib/bilgiAgaciSeedTopics.js";

const router: IRouter = Router();

const WIKI_BASE = "https://tr.wikipedia.org/api/rest_v1";
const WIKI_SEARCH = "https://tr.wikipedia.org/w/api.php";
const WIKI_USER_AGENT = "AnkaraSehirGazetesiBilgiAgaci/1.0 (iletisim@ankarasehirgazetesi.com)";
const HEADERS: Record<string, string> = {
  "User-Agent": WIKI_USER_AGENT,
  "Api-User-Agent": WIKI_USER_AGENT,
};

/** Upstream Vikipedi istekleri — log'daki 17s spike'ları kesmek için sert üst sınır. */
const WIKI_UPSTREAM_TIMEOUT_MS = 8_000;
/** Geçersiz slug / 404 — 5 dk negative cache; tekrarlayan upstream denemelerini önler. */
const WIKI_NEGATIVE_CACHE_TTL_MS = 5 * 60 * 1000;

function wikiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const mergedHeaders = new Headers(HEADERS);
  if (init.headers) {
    new Headers(init.headers).forEach((value, key) => {
      mergedHeaders.set(key, value);
    });
  }
  const signal = init.signal ?? AbortSignal.timeout(WIKI_UPSTREAM_TIMEOUT_MS);
  return fetch(url, {
    redirect: "follow",
    ...init,
    headers: mergedHeaders,
    signal,
  });
}

/** Wikipedia REST path segment — encodeURIComponent + boşluk → alt çizgi. */
function encodeWikiRestTitle(title: string): string {
  return encodeURIComponent(String(title ?? "").trim().replace(/ /g, "_"));
}

export type WikiLang = "tr" | "en";

const WIKI_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const WIKI_CACHE_MAX_ENTRIES = 500;
/** Bump when disambiguation heuristics change — avoids stale false-positive cache entries. */
const WIKI_PAGE_CACHE_VERSION = "v7";

type TimedCacheEntry<T> = { expiresAt: number; value: T };

function cacheGet<T>(cache: Map<string, TimedCacheEntry<T>>, key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet<T>(cache: Map<string, TimedCacheEntry<T>>, key: string, value: T): T {
  if (cache.size >= WIKI_CACHE_MAX_ENTRIES) {
    const firstKey = cache.keys().next().value as string | undefined;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + WIKI_CACHE_TTL_MS });
  return value;
}

const wikiPageHtmlCache = new Map<string, TimedCacheEntry<{ html: string; title: string; isDisambig?: boolean; images: WikiArticleImage[] }>>();
const wikiSummaryTitleCache = new Map<string, TimedCacheEntry<string | null>>();
const wikiResolvedTitleCache = new Map<string, TimedCacheEntry<string | null>>();
const wikiSummaryCardCache = new Map<string, TimedCacheEntry<WikiSummaryCard | null>>();
const wikiArticleNegativeCache = new Map<string, TimedCacheEntry<true>>();

type WikiArticleResponseData = {
  title: string;
  html: string;
  description: unknown;
  extract: string | null;
  thumbnail: unknown;
  originalimage: unknown;
  coordinates: unknown;
  wikipediaUrl: string;
  images: WikiArticleImage[];
  requestedTitle?: string;
  resolvedTitle?: string;
};

let wikiArticleCacheTableReady: Promise<void> | null = null;

function wikiArticleCacheKey(title: string): string {
  return norm(decodeWikiTitleParam(title)).slice(0, 300);
}

async function ensureWikiArticleCacheTable(): Promise<void> {
  wikiArticleCacheTableReady ??= executeNewsDbWrite(sql`
    CREATE TABLE IF NOT EXISTS wiki_articles (
      id bigserial PRIMARY KEY,
      lang text NOT NULL DEFAULT 'tr',
      query_key text NOT NULL,
      requested_title text NOT NULL,
      resolved_title text NOT NULL,
      response_json jsonb NOT NULL,
      hit_count integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      last_accessed_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT wiki_articles_lang_query_key_unique UNIQUE (lang, query_key)
    );
    CREATE INDEX IF NOT EXISTS wiki_articles_lang_resolved_title_idx ON wiki_articles (lang, resolved_title);
  `);
  await wikiArticleCacheTableReady;
}

/** Özet-only location_wiki_cache yedeği — tam Vikipedi sayfası değil; yeniden çek. */
function isDegradedWikiArticlePayload(data: WikiArticleResponseData): boolean {
  const html = String(data.html ?? "").trim();
  if (html.length < 200) return true;
  const hasRichStructure = /<h[23]\b/i.test(html) || /<table\b/i.test(html) || /<figure\b/i.test(html);
  if (hasRichStructure) return false;
  const withoutParagraphs = html.replace(/<p>[\s\S]*?<\/p>/gi, "").trim();
  return withoutParagraphs.length < 40;
}

async function readWikiArticleCache(requestedTitle: string, lang: WikiLang): Promise<WikiArticleResponseData | null> {
  const key = wikiArticleCacheKey(requestedTitle);
  if (!key) return null;
  try {
    await ensureWikiArticleCacheTable();
    const rows = await getNewsDbForRead().execute(sql`
      SELECT response_json
      FROM wiki_articles
      WHERE lang = ${lang} AND query_key = ${key}
      LIMIT 1
    `);
    const row = rows.rows[0] as { response_json?: unknown } | undefined;
    if (!row?.response_json || typeof row.response_json !== "object") return null;
    const cached = row.response_json as WikiArticleResponseData;
    if (isDegradedWikiArticlePayload(cached)) return null;
    const resolved = String(cached.resolvedTitle ?? cached.title ?? "").trim();
    if (resolved && wikiTitleTooShortForQuery(resolved, requestedTitle)) return null;
    void executeNewsDbWrite(sql`
      UPDATE wiki_articles
      SET hit_count = hit_count + 1, last_accessed_at = now()
      WHERE lang = ${lang} AND query_key = ${key}
    `).catch(() => {});
    return cached;
  } catch {
    return null;
  }
}

async function writeWikiArticleCache(
  requestedTitle: string,
  resolvedTitle: string,
  lang: WikiLang,
  data: WikiArticleResponseData,
): Promise<void> {
  const keys = new Set([wikiArticleCacheKey(requestedTitle), wikiArticleCacheKey(resolvedTitle)].filter(Boolean));
  if (keys.size === 0) return;
  const payload = JSON.stringify(data);
  try {
    await ensureWikiArticleCacheTable();
    for (const key of keys) {
      await executeNewsDbWrite(sql`
        INSERT INTO wiki_articles (lang, query_key, requested_title, resolved_title, response_json, hit_count, updated_at, last_accessed_at)
        VALUES (${lang}, ${key}, ${requestedTitle}, ${resolvedTitle}, ${payload}::jsonb, 0, now(), now())
        ON CONFLICT (lang, query_key) DO UPDATE SET
          requested_title = EXCLUDED.requested_title,
          resolved_title = EXCLUDED.resolved_title,
          response_json = EXCLUDED.response_json,
          updated_at = now()
      `);
    }
  } catch (err) {
    console.warn("[wiki-cache] madde kaydedilemedi:", err instanceof Error ? err.message : err);
  }
}

function wikiUrls(lang: WikiLang = "tr"): { rest: string; api: string } {
  const sub = lang === "en" ? "en" : "tr";
  return {
    rest: `https://${sub}.wikipedia.org/api/rest_v1`,
    api: `https://${sub}.wikipedia.org/w/api.php`,
  };
}

function wikiRestSearchUrl(lang: WikiLang = "tr"): string {
  const sub = lang === "en" ? "en" : "tr";
  return `https://${sub}.wikipedia.org/w/rest.php/v1/search/page`;
}

function parseWikiLang(q: string | undefined): WikiLang {
  return q === "en" ? "en" : "tr";
}

/* — Helpers — */

const WIKI_BODY_TAGS =
  "p|b|i|strong|em|a|br|h2|h3|h4|ul|ol|li|img|figure|figcaption|blockquote|table|tbody|thead|tr|td|th|caption";

function wikiSiteOrigin(lang: WikiLang): string {
  return lang === "en" ? "https://en.wikipedia.org" : "https://tr.wikipedia.org";
}

function wikiArticleUrl(title: string, lang: WikiLang): string {
  return `${wikiSiteOrigin(lang)}/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

function escapeHtmlAttr(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function stripHtmlTags(s: string): string {
  return String(s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSkippedWikiNamespace(title: string): boolean {
  return /^(Dosya|File|Resim|Image|Vikipedi|Wikipedia|Şablon|Template|Kategori|Category|Portal|Taslak|Draft|Kullanıcı|User):/i.test(
    title,
  );
}

const WIKI_CARD_EXCERPT_MAX = 280;

function trimWikiCardExtract(s: string, max = WIKI_CARD_EXCERPT_MAX): string {
  const t = stripHtmlTags(s).replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function absolutizeWikiAssetUrl(src: string, lang: WikiLang): string {
  const t = String(src ?? "").trim();
  if (!t || /^data:/i.test(t)) return "";
  if (t.startsWith("//")) return `https:${t}`;
  if (t.startsWith("/")) return `${wikiSiteOrigin(lang)}${t}`;
  return t;
}

function attrValue(attrs: string, name: string): string {
  return attrs.match(new RegExp(`\\b${name}=(["'])(.*?)\\1`, "i"))?.[2] ?? "";
}

function numericAttr(attrs: string, name: string): number | null {
  const raw = attrValue(attrs, name) || attrs.match(new RegExp(`\\b${name}\\s*:\\s*(\\d+(?:\\.\\d+)?)px`, "i"))?.[1] || "";
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function decodedImageHaystack(src: string, attrs: string): string {
  const parts = [
    src,
    attrValue(attrs, "alt"),
    attrValue(attrs, "title"),
    attrValue(attrs, "class"),
    attrValue(attrs, "srcset"),
  ];
  try {
    parts.push(decodeURIComponent(src));
  } catch {
    // keep raw src only
  }
  return parts.join(" ").toLowerCase();
}

function isLikelyUselessWikiImage(src: string, attrs = "", context: "body" | "infobox" = "body"): boolean {
  const haystack = decodedImageHaystack(src, attrs);
  if (!src || /^data:/i.test(src)) return true;
  if (/poweredby|wikimedia-button|transparent|spacer|blank\.gif|pixel/i.test(haystack)) return true;

  const width = numericAttr(attrs, "width");
  const height = numericAttr(attrs, "height");
  const hasDimensions = Boolean(width && height);
  const maxDim = Math.max(width ?? 0, height ?? 0);
  const minDim = Math.min(width ?? Number.POSITIVE_INFINITY, height ?? Number.POSITIVE_INFINITY);
  const tinyGraphic = hasDimensions && maxDim <= 96 && minDim <= 96;
  if (tinyGraphic) return true;

  const artifactWords =
    /(oojs|ambox|icon|symbol|logo|commons-logo|wikidata-logo|nuvola|crystal[_\s-]*clear|question[_\s-]*book|edit[_\s-]*clear|yes[_\s-]*check|no[_\s-]*check|arrow|increase|decrease|triangle|sort[_\s-]*(up|down)|padlock|semi[_\s-]*protection|locator|location[_\s-]*map|map[_\s-]*marker|red[_\s-]*pog|red[_\s-]*dot|pushpin|pin[_\s-]*map|blank[_\s-]*map|orthographic|projection|placeholder)/i;
  if (artifactWords.test(haystack)) return true;

  if (
    context === "infobox" &&
    /(flag|bayrak|coat[_\s-]*of[_\s-]*arms|arma|emblem|seal|crest|indicator|trend|rank)/i.test(haystack)
  ) {
    return true;
  }

  return false;
}

function wikiRouteHrefForTitle(rawTitle: string, hash = ""): string {
  const title = decodeWikiTitleParam(rawTitle.split("?")[0] ?? "");
  if (!title || isSkippedWikiNamespace(title)) return "";
  const safeHash = /^#[A-Za-z0-9._~%:-]*$/.test(hash) ? hash : "";
  const slug = toWikiAsciiSlug(title);
  if (!slug) return "";
  return `/bilgiagaci/${slug}${safeHash}`;
}

function rewriteWikiHref(rawTitle: string): string {
  return wikiRouteHrefForTitle(rawTitle);
}

function rewriteWikiHrefValue(rawHref: string, lang: WikiLang): string | null {
  const href = String(rawHref ?? "").trim();
  if (!href || href.startsWith("#")) return null;
  const hashIndex = href.indexOf("#");
  const hrefWithoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";

  if (
    hrefWithoutHash.startsWith("/bilgiagaci/") ||
    hrefWithoutHash.startsWith("/ansiklopedi/")
  ) {
    const prefix = hrefWithoutHash.startsWith("/bilgiagaci/") ? "/bilgiagaci/" : "/ansiklopedi/";
    const slugPart = hrefWithoutHash.slice(prefix.length);
    const canonical = wikiRouteHrefForTitle(slugPart, hash);
    return canonical || `${hrefWithoutHash}${hash}`;
  }

  if (hrefWithoutHash.startsWith("/wiki/")) {
    return wikiRouteHrefForTitle(hrefWithoutHash.slice("/wiki/".length), hash);
  }

  if (/^\.[/\\][^/?#]/.test(hrefWithoutHash)) {
    return wikiRouteHrefForTitle(hrefWithoutHash.slice(2), hash);
  }

  const wikiPathInHref = hrefWithoutHash.match(/\/wiki\/([^?#]+)/i);
  if (wikiPathInHref && /wikipedia\.org/i.test(hrefWithoutHash)) {
    return wikiRouteHrefForTitle(wikiPathInHref[1], hash);
  }

  try {
    const url = new URL(hrefWithoutHash.startsWith("//") ? `https:${hrefWithoutHash}` : href, wikiSiteOrigin(lang));
    const sameWiki =
      url.hostname === `${lang}.wikipedia.org` ||
      (lang === "tr" && url.hostname === "tr.wikipedia.org") ||
      (lang === "en" && url.hostname === "en.wikipedia.org");
    if (!sameWiki) return null;
    if (url.pathname.startsWith("/wiki/")) {
      return wikiRouteHrefForTitle(url.pathname.slice("/wiki/".length), url.hash || hash);
    }
    if (url.pathname === "/w/index.php") {
      const title = url.searchParams.get("title");
      return title ? wikiRouteHrefForTitle(title, url.hash || hash) : "";
    }
  } catch {
    return null;
  }
  return null;
}

function rewriteWikiLinks(html: string, lang: WikiLang): string {
  return html.replace(/<a\b([^>]*?)\bhref=(["'])(.*?)\2([^>]*)>/gi, (_full, before, _quote, href, after) => {
    const rewritten = rewriteWikiHrefValue(href, lang);
    if (rewritten === null) return _full;
    if (!rewritten) return `<a${before}href="#"${after}>`;
    return `<a href="${escapeHtmlAttr(rewritten)}">`;
  });
}

function unwrapExternalLinks(html: string): string {
  return html.replace(/<a\b[^>]*href=(["'])https?:\/\/[^"']+\1[^>]*>([\s\S]*?)<\/a>/gi, "$2");
}

function normalizeAnchorTags(html: string): string {
  return html.replace(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>/gi, (_full, _quote, href) => {
    return `<a href="${escapeHtmlAttr(href)}">`;
  });
}

type WikiArticleImage = { src: string; caption?: string };

function extractWikiImages(html: string, lang: WikiLang): WikiArticleImage[] {
  const out: WikiArticleImage[] = [];
  const seen = new Set<string>();
  const thumbRe = /<div[^>]*class="[^"]*\bthumb\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let block: RegExpExecArray | null;
  while ((block = thumbRe.exec(html))) {
    const inner = block[1];
    const imgM = inner.match(/<img\b([^>]*(?:\bsrc|\bdata-src)="([^"]+)"[^>]*)>/i);
    if (!imgM) continue;
    const attrs = imgM[1] ?? "";
    const src = absolutizeWikiAssetUrl(imgM[2], lang);
    if (!src || seen.has(src) || isLikelyUselessWikiImage(src, attrs)) continue;
    seen.add(src);
    const capM = inner.match(/class="[^"]*thumbcaption[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    out.push({ src, caption: capM ? stripHtmlTags(capM[1]) : undefined });
  }
  const imgRe = /<img\b[^>]*(?:\bsrc|\bdata-src)="([^"]+)"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html))) {
    const src = absolutizeWikiAssetUrl(m[1], lang);
    if (!src || seen.has(src) || isLikelyUselessWikiImage(src, m[0])) continue;
    seen.add(src);
    out.push({ src });
  }
  return out.slice(0, 16);
}

function normalizeWikiImgTags(html: string, lang: WikiLang, context: "body" | "infobox" = "body"): string {
  return html.replace(/<img\b([^>]*)>/gi, (_full, attrs: string) => {
    const srcRaw =
      attrs.match(/\bsrc="([^"]+)"/i)?.[1] ||
      attrs.match(/\bdata-src="([^"]+)"/i)?.[1] ||
      "";
    const src = absolutizeWikiAssetUrl(srcRaw, lang);
    if (!src.startsWith("http")) return "";
    if (isLikelyUselessWikiImage(src, attrs, context)) return "";
    const alt = escapeHtmlAttr(stripHtmlTags(attrs.match(/\balt="([^"]*)"/i)?.[1] || ""));
    const width = numericAttr(attrs, "width");
    const height = numericAttr(attrs, "height");
    const sizeAttrs = [
      width ? ` width="${Math.round(width)}"` : "",
      height ? ` height="${Math.round(height)}"` : "",
    ].join("");
    return `<img src="${escapeHtmlAttr(src)}" alt="${alt}"${sizeAttrs} loading="lazy" decoding="async" />`;
  });
}

function cleanInfoboxOrTable(tableHtml: string, lang: WikiLang): string {
  let t = normalizeWikiImgTags(tableHtml, lang, "infobox");
  // Inline widths from Wikipedia force a narrow text column when infobox floats.
  t = t.replace(/\sstyle="[^"]*"/gi, "");
  t = t.replace(/\swidth="[^"]*"/gi, "");
  t = t.replace(/\sheight="[^"]*"/gi, "");
  t = rewriteWikiLinks(t, lang);
  t = unwrapExternalLinks(t);
  t = normalizeAnchorTags(t);
  return t;
}

/** Wikipedia HTML → ansiklopedi gövdesi (infobox, görseller, listeler korunur). */
function cleanWikiHtml(html: string, lang: WikiLang = "tr"): string {
  html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, "");
  html = html.replace(/<span[^>]*class="[^"]*mw-editsection[^"]*"[^>]*>[\s\S]*?<\/span>/gi, "");

  html = html.replace(
    /<div[^>]*class="[^"]*\b(navbox|reflist|refbegin|hatnote|dablink|metadata|ambox|tmbox|sistersitebox|printfooter|toc)\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    "",
  );
  html = html.replace(/<table[^>]*class="[^"]*\bnavbox\b[^"]*"[^>]*>[\s\S]*?<\/table>/gi, "");

  html = html.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (table) => {
    if (/\binfobox\b/i.test(table) || /\bwikitable\b/i.test(table)) {
      return cleanInfoboxOrTable(table, lang);
    }
    return "";
  });

  html = html.replace(/<div[^>]*class="[^"]*\bthumb\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi, (block) => {
    const imgM = block.match(/<img\b([^>]*(?:\bsrc|\bdata-src)="([^"]+)"[^>]*)>/i);
    if (!imgM) return "";
    const attrs = imgM[1] ?? "";
    const src = absolutizeWikiAssetUrl(imgM[2], lang);
    if (!src.startsWith("http")) return "";
    if (isLikelyUselessWikiImage(src, attrs)) return "";
    const capM = block.match(/class="[^"]*thumbcaption[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const caption = capM ? escapeHtmlAttr(stripHtmlTags(capM[1])) : "";
    const width = numericAttr(attrs, "width");
    const height = numericAttr(attrs, "height");
    const sizeAttrs = `${width ? ` width="${Math.round(width)}"` : ""}${height ? ` height="${Math.round(height)}"` : ""}`;
    return `<figure class="wiki-figure"><img src="${escapeHtmlAttr(src)}" alt=""${sizeAttrs} loading="lazy" decoding="async" />${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
  });

  html = normalizeWikiImgTags(html, lang);

  html = html.replace(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi, (_m, inner) => {
    const imgM = inner.match(/<img\b[^>]*\bsrc="([^"]+)"/i);
    if (!imgM) return "";
    const capM = inner.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
    const caption = capM ? escapeHtmlAttr(stripHtmlTags(capM[1])) : "";
    return `<figure class="wiki-figure">${imgM[0]}${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
  });

  html = html.replace(/<a\b[^>]*href="\/wiki\/(Dosya|File|Image|Resim):[^"]*"[^>]*>[\s\S]*?<\/a>/gi, "");
  html = rewriteWikiLinks(html, lang);
  html = unwrapExternalLinks(html);
  html = normalizeAnchorTags(html);

  html = html.replace(new RegExp(`<(?!\\/?(${WIKI_BODY_TAGS})\\b)[^>]+>`, "gi"), "");
  html = html.replace(/<\/?(?:div|span)\b[^>]*>/gi, "");

  html = html.replace(/<p>\s*<\/p>/gi, "");
  html = html.replace(/\n{3,}/g, "\n\n");
  return html.trim();
}

// Generic Turkish place-type words (normalized — no Turkish special chars) — too
// common to count as meaningful overlap when checking related-article relevance.
const GENERIC_PLACE_WORDS = new Set([
  // anıt family → "anit"
  "anit", "aniti", "anitmezar",
  // türbe → "turbe"
  "turbe", "turbesi",
  // cami
  "cami", "camii", "camisi",
  // kilise → "kilise"
  "kilise", "kilisesi",
  // müze → "muze"
  "muze", "muzesi",
  // saray
  "saray", "sarayi",
  // kale
  "kale", "kalesi",
  // köprü → "kopru"
  "kopru", "kopruu",
  // han
  "han", "hani",
  // mescit
  "mescit", "mescidi",
  // külliye → "kulliye"
  "kulliye", "kulliyes",
  // tekke
  "tekke", "tekkesi",
  // çarşı → "carsi"
  "carsi", "carsisi",
  // kervansaray
  "kervansaray",
  // hamam
  "hamam", "hamami",
  // çeşme → "cesme"
  "cesme", "cesmesi",
  // yalı → "yali"
  "yali",
  // köşk → "kosk"
  "kosk", "kosku",
  // kasır → "kasir"
  "kasir", "kasri",
  // harabe
  "harabe", "harabesi",
  // höyük → "hoyuk"
  "hoyuk", "hoyugu",
  // generic location words
  "alan", "alani", "park", "parki", "bahce", "bahcesi", "mahalle",
  "tarihi", "kalinti", "kalintilari", "sehir", "sehri", "ilce",
  // English types (may come from OSM tags)
  "monument", "memorial", "ruins", "museum", "palace", "castle",
]);

const norm = (s: string) =>
  s.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function wikiTitleTooShortForQuery(resultTitle: string, query: string): boolean {
  const queryKey = norm(query).replace(/\s+/g, "");
  const titleKey = norm(resultTitle).replace(/\s+/g, "");
  if (queryKey.length <= 1) return false;
  if (titleKey.length <= 1) return true;
  if (queryKey === titleKey) return false;

  const queryWords = norm(query).split(/\s+/).filter((w) => w.length > 2);
  const titleWords = norm(resultTitle).split(/\s+/).filter((w) => w.length > 2);
  if (queryWords.length <= 1) return false;

  let matched = 0;
  for (const qw of queryWords) {
    const hit = titleWords.some((tw) => tw === qw || tw.startsWith(qw) || qw.startsWith(tw));
    if (hit) matched++;
  }
  const matchRatio = matched / queryWords.length;

  if (titleWords.length === 1 && queryWords.length >= 2 && matchRatio < 0.85) return true;
  if (matchRatio < 0.45) return true;
  if (
    !titleKey.startsWith(queryKey) &&
    !queryKey.startsWith(titleKey) &&
    titleWords.length + 1 < queryWords.length &&
    matchRatio < 0.65
  ) {
    return true;
  }
  return false;
}

/** Relevance score: what fraction of spot name words appear in result title (0–1).
 *  Rules:
 *  - Pure numbers (e.g. "250") are excluded — they appear in unrelated articles
 *  - Short words (< 5 chars) require exact match — prevents "yıl" matching "yıldönümünü"
 *  - Longer words allow prefix matching (handles Turkish suffixes)
 *  - When location is provided, result titles that contain the city get a 0.3 bonus
 */
function relevanceScore(spotName: string, resultTitle: string, location?: string): number {
  const spotWords = norm(spotName).split(/\s+/)
    .filter(w => w.length > 2 && !/^\d+$/.test(w)); // skip pure numbers and tiny words
  const titleWords = norm(resultTitle).split(/\s+/);
  if (spotWords.length === 0) return 0;
  let matched = 0;
  for (const sw of spotWords) {
    const hit = sw.length >= 5
      ? titleWords.some(tw => tw === sw || tw.startsWith(sw) || sw.startsWith(tw))
      : titleWords.some(tw => tw === sw);
    if (hit) matched++;
  }
  let score = matched / spotWords.length;
  // Bonus: result title contains the city name → reward city-specific hits
  if (location && score > 0) {
    const normLoc = norm(location);
    if (norm(resultTitle).includes(normLoc)) score = Math.min(1, score + 0.3);
  }
  return score;
}

/** Alt makale / POI türleri — aramada geçmiyorsa cezalandırılır (anıt, müze, üniversite…). */
const SUBSIDIARY_TOPIC_WORDS = new Set([
  ...GENERIC_PLACE_WORDS,
  "heykel", "heykeli", "heykelgrubu",
  "stadyum", "stadyumu", "salon", "salonu",
  "ulasim", "ulasimi", "transportation", "metro", "metrosu", "metropoliten",
  "havalimani", "limani", "istasyon", "istasyonu",
  "universite", "universitesi", "lisesi", "ilkokulu",
  "caddesi", "bulvari", "sokagi", "mahallesi",
  "koyu", "beldesi", "ilcesi",
  "aniti", "anitlari",
  "muzesi", "evi", "konagi", "sarayi",
  "airport", "university", "museum", "stadium", "memorial",
]);

/** Sık ansiklopedi aramaları → tercih edilen ana Vikipedi başlığı (normalize anahtar). */
const ENCYCLOPEDIA_QUERY_ALIASES: Record<string, string> = {
  ataturk: "Mustafa Kemal Atatürk",
  "mustafa kemal": "Mustafa Kemal Atatürk",
  "mustafa kemal ataturk": "Mustafa Kemal Atatürk",
  "turk tarihi": "Türk tarihi kronolojisi",
  "turk tarihi kronolojisi": "Türk tarihi kronolojisi",
  "futbol tarihi": "Futbol tarihi",
  "futbolun tarihi": "Futbol tarihi",
  "yapay zeka": "Yapay zekâ",
  "yapay zeka nedir": "Yapay zekâ",
  "yapay zeka teknolojisi": "Yapay zekâ",
  "yapay zeka teknolojileri": "Yapay zekâ",
  "yapay zeka tarihi": "Yapay zekânın tarihi",
  findik: "Fındık",
  turkiye: "Türkiye",
  istanbul: "İstanbul",
  izmir: "İzmir",
  ankara: "Ankara",
  internet: "İnternet",
  "blok zinciri": "Blokzinciri",
  bursa: "Bursa",
  antalya: "Antalya",
  canakkale: "Çanakkale",
  "canakkale savasi": "Çanakkale Savaşı",
  "kore savasi": "Kore Savaşı",
  "kore savasi baslangici": "Kore Savaşı",
  "kore savasi baslangic": "Kore Savaşı",
  "kumyangjang ni": "Kumyangjang-ni Muharebesi",
  "kumyangjang ni kore": "Kumyangjang-ni Muharebesi",
  "kumyangjang ni muharebesi": "Kumyangjang-ni Muharebesi",
  kktc: "Kuzey Kıbrıs Türk Cumhuriyeti",
  "kuzey kibris turk cumhuriyeti": "Kuzey Kıbrıs Türk Cumhuriyeti",
  "kuzey kibris": "Kuzey Kıbrıs Türk Cumhuriyeti",
  "rauf denktas": "Rauf Denktaş",
  "raif denktas": "Rauf Denktaş",
  "osmanli imparatorlugu": "Osmanlı İmparatorluğu",
  "cumhuriyet bayrami": "29 Ekim Cumhuriyet Bayramı",
  "29 ekim cumhuriyet bayrami": "29 Ekim Cumhuriyet Bayramı",
  "zafer bayrami": "30 Ağustos Zafer Bayramı",
  "ulusal egemenlik ve cocuk bayrami": "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı",
  "cocuk bayrami": "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı",
  "23 nisan ulusal egemenlik ve cocuk bayrami": "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı",
  "emniyet genel mudurlugu": "Emniyet Genel Müdürlüğü",
};

/** URL slug (underscore) → kesin Vikipedi başlığı. */
const ENCYCLOPEDIA_SLUG_ALIASES: Record<string, string> = {
  turk_tarihi_kronolojisi: "Türk tarihi kronolojisi",
  turk_tarihi: "Türk tarihi kronolojisi",
  futbol_tarihi: "Futbol tarihi",
  futbolun_tarihi: "Futbol tarihi",
  yapay_zeka: "Yapay zekâ",
  yapay_zeka_nedir: "Yapay zekâ",
  yapay_zeka_teknolojisi: "Yapay zekâ",
  yapay_zeka_teknolojileri: "Yapay zekâ",
  findik: "Fındık",
  turkiye: "Türkiye",
  istanbul: "İstanbul",
  izmir: "İzmir",
  ankara: "Ankara",
  internet: "İnternet",
  blok_zinciri: "Blokzinciri",
  bursa: "Bursa",
  antalya: "Antalya",
  canakkale: "Çanakkale",
  ataturk: "Mustafa Kemal Atatürk",
  mustafa_kemal_ataturk: "Mustafa Kemal Atatürk",
  kumyangjang_ni_muharebesi: "Kumyangjang-ni Muharebesi",
  kumyangjang_ni: "Kumyangjang-ni Muharebesi",
  kumyangjangni_muharebesi: "Kumyangjang-ni Muharebesi",
  kktc: "Kuzey Kıbrıs Türk Cumhuriyeti",
  kuzey_kibris_turk_cumhuriyeti: "Kuzey Kıbrıs Türk Cumhuriyeti",
  kuzey_kibris_turk_cumhuriyeti_cumhurbaskani: "Kuzey Kıbrıs Türk Cumhuriyeti",
  kuzey_kibris_turk_cumhuriyeti_cumhurbaskanligi: "Kuzey Kıbrıs Türk Cumhuriyeti",
  kuzey_kibris_turk_cumhuriyeti_bayragi: "Kuzey Kıbrıs Türk Cumhuriyeti",
  kuzey_kibris_turk_cumhuriyeti_anayasasi: "Kuzey Kıbrıs Türk Cumhuriyeti",
  rauf_denktas: "Rauf Denktaş",
  raif_denktas: "Rauf Denktaş",
  osmanli_imparatorlugu: "Osmanlı İmparatorluğu",
  osmanli_imparatorlugu_armasi: "Osmanlı İmparatorluğu",
  osmanli_imparatorlugu_bayragi: "Osmanlı İmparatorluğu",
  cumhuriyet_bayrami: "29 Ekim Cumhuriyet Bayramı",
  "29_ekim_cumhuriyet_bayrami": "29 Ekim Cumhuriyet Bayramı",
  zafer_bayrami: "30 Ağustos Zafer Bayramı",
  "30_agustos_zafer_bayrami": "30 Ağustos Zafer Bayramı",
  ulusal_egemenlik_ve_cocuk_bayrami: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı",
  cocuk_bayrami: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı",
  "23_nisan_ulusal_egemenlik_ve_cocuk_bayrami": "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı",
  emniyet_genel_mudurlugu: "Emniyet Genel Müdürlüğü",
};

const _provinceAliases = buildProvinceEncyclopediaAliases();
for (const [k, v] of Object.entries(_provinceAliases.queryAliases)) {
  if (!ENCYCLOPEDIA_QUERY_ALIASES[k]) ENCYCLOPEDIA_QUERY_ALIASES[k] = v;
}
for (const [k, v] of Object.entries(_provinceAliases.slugAliases)) {
  if (!ENCYCLOPEDIA_SLUG_ALIASES[k]) ENCYCLOPEDIA_SLUG_ALIASES[k] = v;
}

/** İl adı aramasında yanlışlıkla seçilen olay / hareket maddeleri. */
const ENCYCLOPEDIA_CITY_DRIFT_WORDS = new Set([
  "katliam",
  "katliami",
  "hareket",
  "hareketi",
  "hareketı",
  "hareketleri",
  "olay",
  "olayi",
  "olaylari",
  "olayları",
  "muharebesi",
  "savasi",
  "savaşı",
  "savasci",
  "depremi",
  "yangini",
  "yangını",
  "patlamasi",
  "patlaması",
  "bombardmani",
  "isgali",
  "işgali",
  "kongresi",
  "antlasmasi",
  "anlaşması",
  "bildirisi",
  "operasyonu",
  "eylemi",
  "saldırısı",
  "ulasim",
  "ulasimi",
  "havalimani",
  "limani",
  "metrosu",
  "metropoliten",
  "transportation",
]);

/** Ülke / kişi ana maddesinden sapma: cumhurbaşkanı, bayrak, operatör vb. alt başlıklar. */
const ENCYCLOPEDIA_TOPIC_DRIFT_WORDS = new Set([
  "cumhurbaskani",
  "cumhurbaskanligi",
  "secimi",
  "secimleri",
  "basbakani",
  "baskanbakani",
  "bayragi",
  "anayasasi",
  "telsim",
  "postasi",
  "meclisi",
  "vatandasligi",
  "diplomatik",
  "buyukelciligi",
  "fotografcilik",
  "listesi",
  "armasi",
  "armas",
  "emblemi",
]);

function queryMentionsTopicDriftWord(query: string): boolean {
  const nq = norm(query);
  return [...ENCYCLOPEDIA_TOPIC_DRIFT_WORDS].some((w) => nq.includes(w));
}

function titleDriftsFromAnchorTopic(resultTitle: string, anchorTitle: string, query: string): boolean {
  const np = norm(anchorTitle);
  const nt = norm(resultTitle);
  if (!np || !nt) return false;
  if (nt === np) return false;
  if (queryMentionsTopicDriftWord(query)) return false;
  if (!nt.startsWith(np)) {
    if (np.includes("denktas") && nt.includes("denktas") && np.includes("rauf") && nt.includes("raif") && !norm(query).includes("raif")) {
      return true;
    }
    return false;
  }
  const rest = nt.slice(np.length).trim();
  if (!rest) return false;
  const extraWords = rest.split(/\s+/).filter((w) => w.length > 1);
  return extraWords.some((w) => ENCYCLOPEDIA_TOPIC_DRIFT_WORDS.has(w));
}

function resolveAnchorTopicForQuery(query: string): string | null {
  const nq = norm(query);
  if (!nq) return null;
  if (ENCYCLOPEDIA_QUERY_ALIASES[nq]) return ENCYCLOPEDIA_QUERY_ALIASES[nq];
  if (nq === "kktc" || (nq.includes("kuzey") && nq.includes("kibris") && nq.includes("turk") && nq.includes("cumhuriyeti"))) {
    if (!queryMentionsTopicDriftWord(query)) return "Kuzey Kıbrıs Türk Cumhuriyeti";
  }
  if (nq.includes("denktas") && (nq.includes("rauf") || nq.includes("raif"))) return "Rauf Denktaş";
  return preferredWikiTitleForQuery(query);
}

function titleDriftsFromProvinceArticle(resultTitle: string, provinceTitle: string): boolean {
  const np = norm(provinceTitle);
  const nt = norm(resultTitle);
  if (!np || !nt) return false;
  if (nt === np) return false;
  if (!nt.startsWith(np)) return true;
  const rest = nt.slice(np.length).trim();
  if (!rest) return false;
  const extraWords = rest.split(/\s+/).filter((w) => w.length > 1);
  return extraWords.some((w) => ENCYCLOPEDIA_CITY_DRIFT_WORDS.has(w));
}

function decodeWikiTitleParam(raw: string): string {
  return slugToWikiTitle(raw);
}

function wikiTitleCandidates(queryTitle: string): string[] {
  const decoded = decodeWikiTitleParam(queryTitle);
  const slugKey = wikiAsciiSlugKey(queryTitle);
  const ordered: string[] = [];
  const seen = new Set<string>();
  const add = (title: string) => {
    const t = String(title ?? "").trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    ordered.push(t);
  };

  const provinceTitle = resolveTurkishProvinceWikiTitle(decoded);
  if (provinceTitle) add(provinceTitle);
  const slugAlias = ENCYCLOPEDIA_SLUG_ALIASES[slugKey];
  if (slugAlias) add(slugAlias);
  const queryAlias = ENCYCLOPEDIA_QUERY_ALIASES[norm(decoded)];
  if (queryAlias) add(queryAlias);
  const preferred = preferredWikiTitleForQuery(decoded);
  if (preferred) add(preferred);
  for (const candidate of turkishWikiTitleCandidates(queryTitle)) add(candidate);
  add(decoded);
  if (decoded.includes(" ")) add(decoded.replace(/ /g, "_"));
  return ordered;
}

type WikiQueryPageResult = {
  pageid?: number;
  title: string;
  extract: string;
  thumbnail?: string;
  fullurl?: string;
};

function parseWikiQueryPages(
  pages: Record<
    string,
    {
      pageid?: number;
      title?: string;
      missing?: "";
      extract?: string;
      fullurl?: string;
      thumbnail?: { source?: string };
    }
  > | undefined,
): WikiQueryPageResult[] {
  const out: WikiQueryPageResult[] = [];
  for (const page of Object.values(pages ?? {})) {
    if (!page || page.missing !== undefined) continue;
    const title = String(page.title ?? "").trim();
    if (!title) continue;
    out.push({
      pageid: Number((page as { pageid?: unknown }).pageid) || undefined,
      title,
      extract: String(page.extract ?? "").trim(),
      thumbnail: page.thumbnail?.source,
      fullurl: page.fullurl,
    });
  }
  return out;
}

/** Ansiklopedi eklentisi: action=query + redirects=1 ile doğrudan başlık/madde çözümleme. */
async function fetchWikiQueryPage(
  pageTitle: string,
  lang: WikiLang,
  options: { exintro?: boolean; requireExtract?: boolean } = {},
): Promise<WikiQueryPageResult | null> {
  const requireExtract = options.requireExtract !== false;
  const hits = await fetchWikiQueryPages([pageTitle], lang, options);
  const page = hits[0];
  if (!page) return null;
  if (requireExtract && !page.extract) return null;
  return page;
}

/** Sıralı aday başlıkları tek API turunda dener (eklenti akışı). */
async function fetchWikiQueryPages(
  pageTitles: string[],
  lang: WikiLang,
  options: { exintro?: boolean } = {},
): Promise<WikiQueryPageResult[]> {
  const unique = [...new Set(pageTitles.map((t) => String(t ?? "").trim()).filter(Boolean))];
  if (!unique.length) return [];

  const api = wikiUrls(lang).api;
  const params = new URLSearchParams({
    action: "query",
    titles: unique.join("|"),
    prop: "extracts|pageimages|info",
    exintro: options.exintro ? "1" : "0",
    explaintext: "0",
    piprop: "thumbnail",
    pithumbsize: "400",
    inprop: "url",
    redirects: "1",
    format: "json",
    utf8: "1",
  });
  try {
    const r = await wikiFetch(`${api}?${params}`);
    const d = await r.json() as {
      query?: {
        pages?: Record<
          string,
          {
            title?: string;
            missing?: "";
            extract?: string;
            fullurl?: string;
            thumbnail?: { source?: string };
          }
        >;
      };
    };
    const parsed = parseWikiQueryPages(d.query?.pages);
    const byNorm = new Map(parsed.map((p) => [norm(p.title), p]));
    const ordered: WikiQueryPageResult[] = [];
    const seen = new Set<string>();
    for (const cand of unique) {
      const hit = byNorm.get(norm(cand)) ?? parsed.find((p) => norm(p.title) === norm(cand));
      if (!hit || seen.has(hit.title)) continue;
      seen.add(hit.title);
      ordered.push(hit);
    }
    for (const hit of parsed) {
      if (seen.has(hit.title)) continue;
      seen.add(hit.title);
      ordered.push(hit);
    }
    return ordered;
  } catch {
    return [];
  }
}

async function fetchWikiQueryFirstMatch(
  candidates: string[],
  lang: WikiLang,
  options: { exintro?: boolean; requireExtract?: boolean } = {},
): Promise<WikiQueryPageResult | null> {
  const requireExtract = options.requireExtract !== false;
  const unique = [...new Set(candidates.map((t) => String(t ?? "").trim()).filter(Boolean))];
  for (let i = 0; i < unique.length; i += 8) {
    const batch = unique.slice(i, i + 8);
    for (const page of await fetchWikiQueryPages(batch, lang, options)) {
      if (!requireExtract || page.extract) return page;
    }
  }
  return null;
}

function pageFromWikiExtract(
  qp: { title: string; extract: string; thumbnail?: string },
  lang: WikiLang,
): { html: string; title: string; isDisambig?: boolean; images: WikiArticleImage[] } {
  const images: WikiArticleImage[] = [];
  if (qp.thumbnail) {
    const src = absolutizeWikiAssetUrl(qp.thumbnail, lang);
    if (src.startsWith("http")) images.push({ src });
  }
  return {
    html: rewriteWikiLinks(qp.extract, lang),
    title: qp.title,
    isDisambig: false,
    images,
  };
}

async function fetchWikiArticleByExactCandidates(
  queryTitle: string,
  lang: WikiLang,
): Promise<{ html: string; title: string; isDisambig?: boolean; images: WikiArticleImage[] } | null> {
  const decoded = decodeWikiTitleParam(queryTitle);
  const aliasTitle = await resolveKnownWikiAliasTitle(queryTitle, lang);
  if (aliasTitle) {
    const aliasPage =
      (await fetchPageHtml(aliasTitle, lang)) ??
      (await fetchPageHtmlViaRest(aliasTitle, lang)) ??
      (await fetchArticleFromWikiSummary(aliasTitle, lang));
    if (aliasPage && !wikiTitleTooShortForQuery(aliasPage.title, decoded)) return aliasPage;
  }
  const provinceTitle = resolveTurkishProvinceWikiTitle(decoded);
  const anchor = resolveAnchorTopicForQuery(decoded);
  const candidates = wikiTitleCandidates(queryTitle);
  const seen = new Set<string>();

  const tryCandidate = async (
    cand: string,
    qp?: WikiQueryPageResult | null,
  ): Promise<{ html: string; title: string; isDisambig?: boolean; images: WikiArticleImage[] } | null> => {
    const resolvedTitle = qp?.title ?? cand;
    if (wikiTitleTooShortForQuery(resolvedTitle, decoded)) return null;
    const page = await fetchPageHtml(resolvedTitle, lang);
    if (page) {
      if (wikiTitleTooShortForQuery(page.title, decoded)) return null;
      if (page.isDisambig) {
        if (provinceTitle && norm(page.title) === norm(provinceTitle)) {
          return { ...page, isDisambig: false };
        }
        const restPage = await fetchPageHtmlViaRest(resolvedTitle, lang);
        if (restPage && restPage.html.length > 80) return restPage;
        if (qp && qp.extract.length > 80) return pageFromWikiExtract(qp, lang);
        return null;
      }
      if (anchor && titleDriftsFromAnchorTopic(page.title, anchor, decoded)) return null;
      if (page.html.length > 80) return page;
    }
    if (qp && qp.extract.length > 40) {
      if (wikiTitleTooShortForQuery(qp.title, decoded)) return null;
      if (anchor && titleDriftsFromAnchorTopic(qp.title, anchor, decoded)) return null;
      return pageFromWikiExtract(qp, lang);
    }
    return null;
  };

  const batchHit = await fetchWikiQueryFirstMatch(candidates, lang, { requireExtract: false });
  if (batchHit) {
    const hit = await tryCandidate(batchHit.title, batchHit);
    if (hit) return hit;
  }

  for (const cand of candidates) {
    if (seen.has(cand)) continue;
    seen.add(cand);
    const qp = await fetchWikiQueryPage(cand, lang);
    const hit = await tryCandidate(cand, qp);
    if (hit) return hit;
  }

  if (provinceTitle) {
    const qp = await fetchWikiQueryPage(provinceTitle, lang);
    if (qp) {
      const page = await fetchPageHtml(qp.title, lang);
      if (page && page.html.length > 80) {
        return page.isDisambig ? { ...page, isDisambig: false } : page;
      }
      return pageFromWikiExtract(qp, lang);
    }
  }

  const directSummary = await fetchWikiSummaryTitle(decoded, lang);
  if (directSummary) {
    if (wikiTitleTooShortForQuery(directSummary, decoded)) return null;
    const page = await fetchPageHtml(directSummary, lang);
    if (page && !page.isDisambig && page.html.length > 80) return page;
    const qp = await fetchWikiQueryPage(directSummary, lang);
    if (qp) return pageFromWikiExtract(qp, lang);
  }
  const queryFallback = await fetchWikiQueryFirstMatch(candidates, lang, {
    exintro: false,
    requireExtract: false,
  });
  if (queryFallback?.title) {
    if (wikiTitleTooShortForQuery(queryFallback.title, decoded)) return null;
    if (anchor && titleDriftsFromAnchorTopic(queryFallback.title, anchor, decoded)) return null;
    if (queryFallback.extract || queryFallback.thumbnail) {
      return pageFromWikiExtract(
        {
          ...queryFallback,
          extract:
            queryFallback.extract ||
            `<p>${queryFallback.title}</p>`,
        },
        lang,
      );
    }
  }
  return null;
}

/** Arama metninden ana konu başlığı çıkarımı (millî gün / savaş kartları). */
function preferredWikiTitleForQuery(query: string): string | null {
  const nq = norm(query);
  if (!nq) return null;
  const province = resolveTurkishProvinceWikiTitle(query);
  if (province) return province;
  if (ENCYCLOPEDIA_QUERY_ALIASES[nq]) return ENCYCLOPEDIA_QUERY_ALIASES[nq];
  if (nq.includes("kore") && nq.includes("savas") && !nq.includes("anit") && !nq.includes("muze")) {
    return "Kore Savaşı";
  }
  if (nq.includes("kumyangjang")) return "Kumyangjang-ni Muharebesi";
  if (nq.includes("canakkale") && (nq.includes("zafer") || nq.includes("sehit") || nq.includes("18 mart"))) {
    return "18 Mart Çanakkale Zaferi ve Şehitleri Anma Günü";
  }
  if (nq.includes("canakkale")) return "Çanakkale";
  if (nq.includes("istanbul")) return "İstanbul";
  if (nq.includes("izmir")) return "İzmir";
  if (nq.includes("ankara")) return "Ankara";
  if (nq === "turkiye" || nq === "turkey") return "Türkiye";
  if (nq.includes("turk") && nq.includes("tarih") && nq.includes("kronoloji")) return "Türk tarihi kronolojisi";
  if (nq.includes("turk") && nq.includes("tarih")) return "Türk tarihi kronolojisi";
  if (nq.includes("futbol") && nq.includes("tarih")) return "Futbol tarihi";
  if (nq === "kktc" || (nq.includes("kuzey") && nq.includes("kibris") && nq.includes("turk") && nq.includes("cumhuriyeti") && !queryMentionsTopicDriftWord(query))) {
    return "Kuzey Kıbrıs Türk Cumhuriyeti";
  }
  if (nq.includes("denktas") && (nq.includes("rauf") || nq.includes("raif"))) return "Rauf Denktaş";
  if (nq.includes("osmanli") && nq.includes("imparatorlugu") && !nq.includes("armasi") && !nq.includes("bayrag")) {
    return "Osmanlı İmparatorluğu";
  }
  if (nq.includes("cumhuriyet") && nq.includes("bayram") && !nq.includes("kktc")) {
    return "29 Ekim Cumhuriyet Bayramı";
  }
  if (nq.includes("zafer") && nq.includes("bayram")) return "30 Ağustos Zafer Bayramı";
  if (
    (nq.includes("ulusal") && nq.includes("egemenlik") && nq.includes("cocuk") && nq.includes("bayram")) ||
    nq === "cocuk bayrami" ||
    nq.includes("23 nisan")
  ) {
    return "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı";
  }
  if (nq.includes("emniyet") && nq.includes("genel") && nq.includes("mudurluk")) {
    return "Emniyet Genel Müdürlüğü";
  }
  return null;
}

/** Slug/sorgu sözlük eşlemesi — REST summary ile doğrula, kısmi eşleşmeyi reddet. */
async function resolveKnownWikiAliasTitle(queryTitle: string, lang: WikiLang): Promise<string | null> {
  const decoded = decodeWikiTitleParam(queryTitle);
  if (!decoded) return null;
  const slugKey = wikiAsciiSlugKey(queryTitle);
  const aliasCandidates = [
    ENCYCLOPEDIA_SLUG_ALIASES[slugKey],
    ENCYCLOPEDIA_QUERY_ALIASES[norm(decoded)],
    preferredWikiTitleForQuery(decoded),
  ].filter((t): t is string => Boolean(t?.trim()));
  const seen = new Set<string>();
  for (const alias of aliasCandidates) {
    const key = norm(alias);
    if (seen.has(key)) continue;
    seen.add(key);
    if (wikiTitleTooShortForQuery(alias, decoded)) continue;
    const summaryTitle = await fetchWikiSummaryTitle(alias, lang);
    if (!summaryTitle || wikiTitleTooShortForQuery(summaryTitle, decoded)) continue;
    return summaryTitle;
  }
  return null;
}

function titleLooksLikeSubsidiaryArticle(title: string, query: string): boolean {
  const titleWords = norm(title).split(/\s+/);
  const queryWords = new Set(norm(query).split(/\s+/).filter((w) => w.length > 2));
  return titleWords.some((w) => SUBSIDIARY_TOPIC_WORDS.has(w) && !queryWords.has(w));
}

function parentheticalQualifiers(title: string): string[] {
  const out: string[] = [];
  const re = /\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(title))) {
    const inner = m[1].trim();
    if (inner.length > 1) out.push(inner);
  }
  return out;
}

/**
 * Ansiklopedi araması: konu odaklı sıralama (şehir/anıt yan makalelerini geri iter).
 * POI/kesfet akışı `relevanceScore` kullanmaya devam eder.
 */
function encyclopediaTopicScore(query: string, resultTitle: string): number {
  const nq = norm(query);
  const nt = norm(resultTitle);
  if (!nq || !nt) return 0;

  const provinceTitle = resolveTurkishProvinceWikiTitle(query);
  if (provinceTitle) {
    const np = norm(provinceTitle);
    if (nt === np) return 3;
    if (titleDriftsFromProvinceArticle(resultTitle, provinceTitle)) return -2;
    if (nt.startsWith(np) && nt.length - np.length < 12) return 1.2;
  }

  const aliasTarget = ENCYCLOPEDIA_QUERY_ALIASES[nq];
  if (aliasTarget && norm(aliasTarget) === nt) return 2;

  const anchorTopic = resolveAnchorTopicForQuery(query);
  if (anchorTopic) {
    const na = norm(anchorTopic);
    if (nt === na) return 2.5;
    if (titleDriftsFromAnchorTopic(resultTitle, anchorTopic, query)) return -2;
    if (nt.startsWith(na) && nt.length - na.length < 24) return 1.1;
  }

  let score = relevanceScore(query, resultTitle);

  if (nq === nt) score += 0.55;
  else if (nt.startsWith(nq) && nt.length - nq.length < 28) score += 0.2;

  const queryWords = new Set(nq.split(/\s+/).filter((w) => w.length > 2));
  const titleWords = nt.split(/\s+/);
  const extraWords = titleWords.filter((w) => w.length > 2 && !queryWords.has(w));
  score -= Math.min(0.45, extraWords.length * 0.07);

  for (const w of titleWords) {
    if (!SUBSIDIARY_TOPIC_WORDS.has(w)) continue;
    if (queryWords.has(w)) continue;
    score -= 0.42;
    break;
  }

  for (const qual of parentheticalQualifiers(resultTitle)) {
    const nQual = norm(qual);
    if (nQual.length < 2) continue;
    if (nq.includes(nQual) || queryWords.has(nQual)) continue;
    score -= 0.38;
  }

  if (titleWords.length <= queryWords.size + 1 && score > 0.2) score += 0.12;

  if (nq.includes("kore") && nq.includes("savas") && nt === "kore savasi") score += 0.45;
  if (titleLooksLikeSubsidiaryArticle(resultTitle, query)) score -= 0.55;

  const mustHave = ["tarihi", "kronoloji", "savasi", "canakkale", "kurtulus"].filter((w) => nq.includes(w));
  for (const w of mustHave) {
    if (!nt.includes(w)) score -= 0.5;
  }
  if (nq.includes("tarih") && nt.includes("pop")) score -= 0.7;
  if (nq.includes("kronoloji") && !nt.includes("kronoloji") && !nt.includes("tarih")) score -= 0.35;

  return score;
}

function rankWikiTitlesForEncyclopedia(query: string, titles: string[]): string[] {
  const alias = preferredWikiTitleForQuery(query) ?? ENCYCLOPEDIA_QUERY_ALIASES[norm(query)] ?? null;
  const merged = alias && !titles.includes(alias) ? [alias, ...titles] : [...titles];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of merged) {
    if (!t || seen.has(t)) continue;
    seen.add(t);
    unique.push(t);
  }
  return unique
    .map((title) => ({ title, score: encyclopediaTopicScore(query, title) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.title);
}

/**
 * Returns true only if spotName and resultTitle share at least one NON-generic keyword.
 * Prevents suggesting "Leningrad Anıtı" for "250. Yıl Anıtı" just because both have "anıtı".
 */
function hasMeaningfulOverlap(spotName: string, resultTitle: string): boolean {
  const spotWords = norm(spotName).split(/\s+/)
    .filter(w => w.length > 2 && !GENERIC_PLACE_WORDS.has(w));
  if (spotWords.length === 0) return false; // only generic words → no meaningful match possible
  const titleWords = norm(resultTitle).split(/\s+/);
  return spotWords.some(sw => titleWords.some(tw => tw.includes(sw) || sw.includes(tw)));
}

/** Footer section headings to strip (references, external links, notes). */
const STRIP_SECTIONS = [
  "kaynakça", "kaynaklar", "referanslar", "dış bağlantılar", "notlar",
  "dipnotlar", "ayrıca bakınız", "ilgili konular", "bibliyografya",
  "dış linkler", "wikimedia", "kaynakça ve notlar", "not listesi",
];

const JUNK_SECTION_HEADINGS = new Set(
  STRIP_SECTIONS.map((s) => norm(s).replace(/\s+/g, " ").trim()),
);

function normalizeWikiSectionHeading(heading: string): string {
  return norm(heading.replace(/<[^>]+>/g, "").trim()).replace(/\s+/g, " ").trim();
}

/** True only for top-level (h2) Wikipedia footer headings — exact match, not substring. */
function isJunkWikiSection(level: string, heading: string): boolean {
  if (level !== "2") return false;
  return JUNK_SECTION_HEADINGS.has(normalizeWikiSectionHeading(heading));
}

/**
 * True only for actual Vikipedi anlam-ayrımı maddeleri.
 * Şehir maddelerindeki `mw-disambig` hatnote linkleri yanlış pozitif üretmemeli.
 */
function isWikiDisambiguationPage(categories: string[], rawHtml: string): boolean {
  const cats = categories.map((c) => c.toLowerCase());
  if (
    cats.some(
      (c) =>
        c.includes("disambiguation") ||
        c.includes("anlam_ayrımı_sayfalar") ||
        c.endsWith("_disambig"),
    )
  ) {
    return true;
  }
  const head = rawHtml.slice(0, 5000);
  if (/id="disambigbox"|class="[^"]*\bdmbox-disambig\b/i.test(head)) {
    return true;
  }
  const intro = head
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /\b(kastedilmiş olabilir|şu anlamlara da gelebilir|may refer to)\b/i.test(intro);
}

/** Strip junk sections (references, external links, notes) from cleaned HTML */
function stripJunkSections(html: string): string {
  // Split at h2/h3 headings (may have attributes like id="Kaynakça")
  const parts = html.split(/(?=<h[23](?:\s[^>]*)?>)/i);
  const kept: string[] = [];
  for (const part of parts) {
    const headingMatch = part.match(/<h([23])(?:\s[^>]*)?>([^<]*(?:<(?!\/h[23])[^<]*)*?)<\/h\1>/i);
    if (headingMatch) {
      const [, level, heading] = headingMatch;
      if (isJunkWikiSection(level, heading)) break;
    }
    kept.push(part);
  }
  return kept.join("").trim();
}

/** REST /page/html/ — parse API başarısız olduğunda tam madde HTML yedeği. */
async function fetchPageHtmlViaRest(
  pageTitle: string,
  lang: WikiLang = "tr",
): Promise<{ html: string; title: string; isDisambig?: boolean; images: WikiArticleImage[] } | null> {
  const { rest } = wikiUrls(lang);
  const summaryTitle = await fetchWikiSummaryTitle(pageTitle, lang);
  const titlesToTry = [...new Set([
    pageTitle,
    ...(summaryTitle ? [summaryTitle] : []),
    ...wikiTitleCandidates(pageTitle).slice(0, 6),
  ].filter((t): t is string => Boolean(t?.trim())))];
  for (const tryTitle of titlesToTry) {
    try {
      const r = await wikiFetch(`${rest}/page/html/${encodeWikiRestTitle(tryTitle)}`, {
        headers: { Accept: "text/html; charset=utf-8" },
      });
      if (!r.ok) continue;
      const rawHtml = await r.text();
      if (!rawHtml || rawHtml.length < 200) continue;
      const titleMatch = rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
      const resolvedTitle = titleMatch?.[1]?.trim() || tryTitle;
      const images = extractWikiImages(rawHtml, lang);
      const html = stripJunkSections(cleanWikiHtml(rawHtml, lang));
      if (html.length < 200) continue;
      return { html, title: resolvedTitle, isDisambig: false, images };
    } catch {
      /* next candidate */
    }
  }
  return null;
}

/** REST summary extract_html — son çare; canlıda parse/html kapalıysa en azından içerik döner. */
async function fetchArticleFromWikiSummary(
  pageTitle: string,
  lang: WikiLang = "tr",
): Promise<{ html: string; title: string; isDisambig?: boolean; images: WikiArticleImage[] } | null> {
  const { rest } = wikiUrls(lang);
  try {
    const r = await wikiFetch(`${rest}/page/summary/${encodeWikiRestTitle(pageTitle)}`);
    if (!r.ok) return null;
    const sd = await r.json() as {
      title?: string;
      type?: string;
      extract?: string;
      extract_html?: string;
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
    };
    if (sd.type === "disambiguation") return null;
    const title = String(sd.title ?? pageTitle).trim();
    const rawHtml =
      String(sd.extract_html ?? "").trim() ||
      (sd.extract ? `<p>${escapeHtmlAttr(sd.extract)}</p>` : "");
    if (rawHtml.length < 80) return null;
    const images: WikiArticleImage[] = [];
    const thumb = sd.originalimage?.source || sd.thumbnail?.source;
    if (thumb) {
      const src = absolutizeWikiAssetUrl(thumb, lang);
      if (src.startsWith("http")) images.push({ src });
    }
    const html = rewriteWikiLinks(cleanWikiHtml(rawHtml, lang), lang);
    if (html.length < 80) return null;
    return { html, title, isDisambig: false, images };
  } catch {
    return null;
  }
}

/** Fetch the full article HTML for a given page title */
async function fetchPageHtml(
  pageTitle: string,
  lang: WikiLang = "tr",
): Promise<{ html: string; title: string; isDisambig?: boolean; images: WikiArticleImage[] } | null> {
  const cacheKey = `${WIKI_PAGE_CACHE_VERSION}:${lang}:${norm(pageTitle)}`;
  const cached = cacheGet(wikiPageHtmlCache, cacheKey);
  if (cached) return cached;
  const api = wikiUrls(lang).api;
  const params = new URLSearchParams({
    action: "parse", page: pageTitle, prop: "text|categories",
    disableeditsection: "1", disabletoc: "1",
    format: "json", redirects: "1",
  });
  try {
    const r = await wikiFetch(`${api}?${params}`);
    const d = await r.json() as { parse?: { title?: string; text?: { "*"?: string }; categories?: { "*": string }[] }; error?: unknown };
    if (d.error || !d.parse?.text?.["*"]) {
      const restPage = await fetchPageHtmlViaRest(pageTitle, lang);
      if (restPage) return cacheSet(wikiPageHtmlCache, cacheKey, restPage);
      return null;
    }
    const rawHtml = d.parse.text["*"];
    const cats = (d.parse.categories ?? []).map((c) => c["*"]);
    let isDisambig = isWikiDisambiguationPage(cats, rawHtml);
    const resolvedTitle = d.parse.title || pageTitle;
    if (isDisambig) {
      const { rest } = wikiUrls(lang);
      try {
        const sr = await wikiFetch(`${rest}/page/summary/${encodeWikiRestTitle(resolvedTitle)}`);
        if (sr.ok) {
          const sd = await sr.json() as { type?: string };
          if (sd.type !== "disambiguation") isDisambig = false;
        }
      } catch {
        // keep heuristic result
      }
    }
    const images = extractWikiImages(rawHtml, lang);
    const html = stripJunkSections(cleanWikiHtml(rawHtml, lang));
    return cacheSet(wikiPageHtmlCache, cacheKey, { html, title: resolvedTitle, isDisambig, images });
  } catch {
    const restPage = await fetchPageHtmlViaRest(pageTitle, lang);
    if (restPage) return cacheSet(wikiPageHtmlCache, cacheKey, restPage);
    return null;
  }
}

/** Hafif başlık doğrulama — büyük maddelerde tam HTML çekmeden önce tercih edilir. */
async function fetchWikiSummaryTitle(pageTitle: string, lang: WikiLang = "tr"): Promise<string | null> {
  const cacheKey = `${lang}:${norm(pageTitle)}`;
  const cached = cacheGet(wikiSummaryTitleCache, cacheKey);
  if (cached !== null) return cached;
  const { rest } = wikiUrls(lang);
  try {
    const r = await wikiFetch(`${rest}/page/summary/${encodeWikiRestTitle(pageTitle)}`);
    if (!r.ok) return cacheSet(wikiSummaryTitleCache, cacheKey, null);
    const d = await r.json() as { title?: string; type?: string };
    if (d.type === "disambiguation") return cacheSet(wikiSummaryTitleCache, cacheKey, null);
    return cacheSet(wikiSummaryTitleCache, cacheKey, d.title?.trim() || pageTitle);
  } catch {
    return cacheSet(wikiSummaryTitleCache, cacheKey, null);
  }
}

/**
 * Ansiklopedi ve millî gün linkleri için: önce tam başlık, olmazsa Vikipedi araması.
 * (Örn. «Kumyangjang-ni (Kore)» → «Kumyangjang-ni Muharebesi»)
 */
function wikiSearchQueryVariants(queryTitle: string): string[] {
  const q = queryTitle.trim();
  const out = new Set<string>([q]);
  for (const candidate of turkishWikiTitleCandidates(q, 12)) {
    if (candidate.length > 2) out.add(candidate);
  }
  const noParens = q.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  if (noParens.length > 2) out.add(noParens);
  const beforeApostrophe = q.split(/['’]/)[0]?.trim();
  if (beforeApostrophe && beforeApostrophe.length > 4 && beforeApostrophe !== q) out.add(beforeApostrophe);
  return Array.from(out);
}

async function resolveWikiArticleTitle(queryTitle: string, lang: WikiLang = "tr"): Promise<string | null> {
  const q = decodeWikiTitleParam(queryTitle);
  if (!q) return null;
  const cacheKey = `${lang}:${norm(q)}`;
  const cached = cacheGet(wikiResolvedTitleCache, cacheKey);
  if (cached !== null) return cached;
  const remember = (title: string | null) => cacheSet(wikiResolvedTitleCache, cacheKey, title);

  const aliasTitle = await resolveKnownWikiAliasTitle(q, lang);
  if (aliasTitle) return remember(aliasTitle);

  const redirectHit = await fetchWikiQueryPage(q, lang, { requireExtract: false });
  if (redirectHit?.title && norm(redirectHit.title) !== norm(q) && !wikiTitleTooShortForQuery(redirectHit.title, q)) {
    const redirectedPage = await fetchPageHtml(redirectHit.title, lang);
    if (redirectedPage && !redirectedPage.isDisambig && redirectedPage.html.length > 200) {
      return remember(redirectedPage.title);
    }
    return remember(redirectHit.title);
  }

  const preferred = preferredWikiTitleForQuery(q);
  const provinceTitle = resolveTurkishProvinceWikiTitle(q);

  if (provinceTitle) {
    const provincePage = await fetchPageHtml(provinceTitle, lang);
    if (provincePage && !provincePage.isDisambig) return remember(provincePage.title);
    const summaryTitle = await fetchWikiSummaryTitle(provinceTitle, lang);
    if (summaryTitle && !titleDriftsFromProvinceArticle(summaryTitle, provinceTitle)) {
      return remember(summaryTitle);
    }
  }

  const anchorTopic = resolveAnchorTopicForQuery(q);
  const titleCandidates = wikiTitleCandidates(q);

  const batchTitle = await fetchWikiQueryFirstMatch(titleCandidates, lang, {
    exintro: true,
    requireExtract: false,
  });
  if (batchTitle?.title && !wikiTitleTooShortForQuery(batchTitle.title, q)) {
    if (!provinceTitle || !titleDriftsFromProvinceArticle(batchTitle.title, provinceTitle)) {
      if (!anchorTopic || !titleDriftsFromAnchorTopic(batchTitle.title, anchorTopic, q)) {
        return remember(batchTitle.title);
      }
    }
  }

  for (const cand of titleCandidates) {
    const qp = await fetchWikiQueryPage(cand, lang, { exintro: true, requireExtract: false });
    if (!qp?.title) continue;
    if (wikiTitleTooShortForQuery(qp.title, q)) continue;
    if (provinceTitle && titleDriftsFromProvinceArticle(qp.title, provinceTitle)) continue;
    if (anchorTopic && titleDriftsFromAnchorTopic(qp.title, anchorTopic, q)) continue;
    return remember(qp.title);
  }

  const exact = await fetchWikiArticleByExactCandidates(q, lang);
  if (exact && !wikiTitleTooShortForQuery(exact.title, q) && (!anchorTopic || !titleDriftsFromAnchorTopic(exact.title, anchorTopic, q))) {
    return remember(exact.title);
  }

  if (preferred) {
    const preferredPage = await fetchPageHtml(preferred, lang);
    if (preferredPage && !preferredPage.isDisambig) return remember(preferredPage.title);
    const summaryTitle = await fetchWikiSummaryTitle(preferred, lang);
    if (summaryTitle) return remember(summaryTitle);
  }

  const direct = await fetchPageHtml(q, lang);
  if (direct && !direct.isDisambig && !wikiTitleTooShortForQuery(direct.title, q)) return remember(direct.title);

  const allResults: string[] = [];
  for (const variant of wikiSearchQueryVariants(q)) {
    const hits = await searchWiki(variant, 12, lang);
    for (const h of hits) {
      if (!allResults.includes(h)) allResults.push(h);
    }
    if (allResults.length > 0) break;
  }
  const results = allResults;
  if (!results.length) return remember(null);

  const exactTitle = results.find((r) => norm(r) === norm(q));
  if (exactTitle) {
    const page = await fetchPageHtml(exactTitle, lang);
    if (page && !page.isDisambig && !wikiTitleTooShortForQuery(page.title, q)) return remember(page.title);
  }

  if (provinceTitle) {
    const provinceExact = results.find((r) => norm(r) === norm(provinceTitle));
    if (provinceExact) {
      const page = await fetchPageHtml(provinceExact, lang);
      if (page && !page.isDisambig && !titleDriftsFromProvinceArticle(page.title, provinceTitle)) {
        return remember(page.title);
      }
    }
  }

  const ranked = rankWikiTitlesForEncyclopedia(q, results);
  const scored = ranked.map((title) => ({
    title,
    score: encyclopediaTopicScore(q, title),
  }));
  const topScore = scored[0]?.score ?? 0;
  const minAccept = Math.max(0.28, topScore - 0.22);

  const seen = new Set<string>();
  for (const { title, score } of scored) {
    if (score < minAccept) break;
    if (seen.has(title)) continue;
    seen.add(title);
    if (provinceTitle && titleDriftsFromProvinceArticle(title, provinceTitle)) continue;
    if (anchorTopic && titleDriftsFromAnchorTopic(title, anchorTopic, q)) continue;
    if (wikiTitleTooShortForQuery(title, q)) continue;
    if (titleLooksLikeSubsidiaryArticle(title, q) && score < topScore - 0.08) continue;
    const page = await fetchPageHtml(title, lang);
    if (page && !page.isDisambig && !wikiTitleTooShortForQuery(page.title, q) && page.html.length > 80) return remember(page.title);
  }

  if (preferred) {
    const summaryTitle = await fetchWikiSummaryTitle(preferred, lang);
    if (summaryTitle) return remember(summaryTitle);
    const page = await fetchPageHtml(preferred, lang);
    if (page && !page.isDisambig) return remember(page.title);
  }

  for (const { title } of scored) {
    if (seen.has(title)) continue;
    seen.add(title);
    if (wikiTitleTooShortForQuery(title, q)) continue;
    const page = await fetchPageHtml(title, lang);
    if (page && !page.isDisambig && !wikiTitleTooShortForQuery(page.title, q)) return remember(page.title);
  }
  return remember(null);
}

/** Search and return top N result titles */
type WikiSearchHit = { title: string; snippet: string; pageid: number };

async function searchWikiRestHits(query: string, limit = 5, lang: WikiLang = "tr"): Promise<WikiSearchHit[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  try {
    const r = await wikiFetch(`${wikiRestSearchUrl(lang)}?${params}`);
    if (!r.ok) return [];
    const d = await r.json() as {
      pages?: Array<{
        id?: number;
        key?: string;
        title?: string;
        excerpt?: string;
        description?: string;
      }>;
    };
    return (d.pages ?? [])
      .map((page) => ({
        title: String(page.title || page.key || "").replace(/_/g, " ").trim(),
        snippet: String(page.excerpt || page.description || "").trim(),
        pageid: Number(page.id) || 0,
      }))
      .filter((hit) => Boolean(hit.title));
  } catch {
    return [];
  }
}

async function searchWikiHits(query: string, limit = 5, lang: WikiLang = "tr"): Promise<WikiSearchHit[]> {
  const restHits = await searchWikiRestHits(query, limit, lang);
  if (restHits.length > 0) return restHits;

  const api = wikiUrls(lang).api;
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: String(limit),
    srnamespace: "0",
    format: "json",
    origin: "*",
  });
  try {
    const r = await wikiFetch(`${api}?${params}`);
    const d = await r.json() as { query?: { search?: WikiSearchHit[] } };
    return d.query?.search ?? [];
  } catch {
    return [];
  }
}

async function directWikiSearchFallback(query: string, limit = 5, lang: WikiLang = "tr"): Promise<WikiSearchHit[]> {
  const titles = rankWikiTitlesForEncyclopedia(query, wikiTitleCandidates(query)).slice(0, Math.max(1, limit * 2));
  const pages = await fetchWikiQueryPages(titles, lang, { exintro: true });
  const out: WikiSearchHit[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    if (!page.title || seen.has(page.title)) continue;
    if (wikiTitleTooShortForQuery(page.title, query)) continue;
    seen.add(page.title);
    out.push({
      title: page.title,
      snippet: page.extract || "",
      pageid: page.pageid ?? 0,
    });
    if (out.length >= limit) break;
  }
  return out;
}

async function searchWiki(query: string, limit = 5, lang: WikiLang = "tr"): Promise<string[]> {
  return (await searchWikiHits(query, limit, lang)).map(s => s.title);
}

function escapeWikiCacheHtmlText(text: string): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildWikiArticleHtmlFromCacheSummary(summary: string, imageUrl?: string | null): string {
  const body = String(summary ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeWikiCacheHtmlText(p)}</p>`)
    .join("");
  const lead = imageUrl
    ? `<figure class="wiki-lead-image"><img src="${escapeWikiCacheHtmlText(imageUrl)}" alt="" loading="lazy" /></figure>`
    : "";
  return `${lead}${body}`;
}

/** location_wiki_cache satırının sorgu etiketiyle anlamlı eşleşmesi (tek kelime yanlış eşleşmeyi engeller). */
function locationCacheTitleMatchesQuery(cachedTitle: string, queryLabel: string): boolean {
  const titleKey = norm(queryLabel);
  const cachedKey = norm(cachedTitle);
  if (!titleKey || !cachedKey) return false;
  if (cachedKey === titleKey) return true;

  const queryWords = titleKey.split(/\s+/).filter((w) => w.length > 2);
  const cachedWords = cachedKey.split(/\s+/).filter((w) => w.length > 2);

  if (queryWords.length <= 1) {
    return cachedKey.includes(titleKey) || titleKey.includes(cachedKey);
  }

  let matched = 0;
  for (const qw of queryWords) {
    if (cachedWords.some((cw) => cw === qw || cw.startsWith(qw) || qw.startsWith(cw))) matched++;
  }
  return matched >= Math.ceil(queryWords.length * 0.65);
}

/** Vikipedi canlı erişimi yoksa (Render vb.) DB önbelleğinden makale gövdesi üret. */
async function readLocationWikiCacheForArticleTitle(
  requestedTitle: string,
  lang: WikiLang,
): Promise<LocationWikiCacheRow | null> {
  const label = decodeWikiTitleParam(requestedTitle).trim();
  if (!label) return null;
  const slugCandidates = new Set<string>();
  const primarySlug = normalizeLocationSlug(label);
  if (primarySlug) slugCandidates.add(primarySlug);
  const asciiSlug = wikiAsciiSlugKey(label);
  if (asciiSlug) slugCandidates.add(asciiSlug);
  const province = resolveTurkishProvinceWikiTitle(label);
  if (province) {
    const provinceSlug = normalizeLocationSlug(province);
    if (provinceSlug) slugCandidates.add(provinceSlug);
  }
  const types: LocationWikiPlaceType[] = province
    ? ["il", "topic", "sehir", "ulke"]
    : ["topic", "sehir", "il", "ulke"];

  for (const slug of slugCandidates) {
    if (!slug) continue;
    for (const type of types) {
      const hit = await readLocationWikiCache(slug, type, lang);
      if (hit?.summary) return hit;
    }
  }

  try {
    await ensureLocationWikiCacheTable();
    const titleKey = norm(label);
    if (!titleKey) return null;
    const rows = await getNewsDbForRead().execute(sql`
      SELECT title, extract, image_url, source_url, lat, lng, resolved_lang, refreshed_at
      FROM location_wiki_cache
      WHERE lang = ${lang}
        AND extract IS NOT NULL
        AND length(trim(extract)) > 40
      ORDER BY refreshed_at DESC NULLS LAST
      LIMIT 120
    `);
    for (const raw of rows.rows) {
      const row = raw as {
        title?: string;
        extract?: string;
        image_url?: string | null;
        source_url?: string | null;
        lat?: number | null;
        lng?: number | null;
        resolved_lang?: string | null;
        refreshed_at?: string | Date | null;
      };
      const title = String(row.title ?? "").trim();
      const summary = String(row.extract ?? "").trim();
      if (!title || !summary) continue;
      if (!locationCacheTitleMatchesQuery(title, label)) continue;
      const refreshedAtMs = row.refreshed_at ? new Date(row.refreshed_at).getTime() : 0;
      return {
        title,
        summary,
        image: row.image_url ? String(row.image_url) : undefined,
        url: row.source_url ? String(row.source_url) : undefined,
        lat: row.lat != null ? Number(row.lat) : undefined,
        lng: row.lng != null ? Number(row.lng) : undefined,
        resolvedLang: row.resolved_lang === "en" ? "en" : row.resolved_lang === "tr" ? "tr" : undefined,
        refreshedAtMs: Number.isFinite(refreshedAtMs) ? refreshedAtMs : 0,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function locationCacheRowToArticleData(
  row: LocationWikiCacheRow,
  requestedTitle: string,
  lang: WikiLang,
): WikiArticleResponseData {
  return {
    title: row.title,
    html: buildWikiArticleHtmlFromCacheSummary(row.summary, row.image),
    description: row.summary.slice(0, 320),
    extract: row.summary,
    thumbnail: row.image ? { source: row.image } : null,
    originalimage: row.image ? { source: row.image } : null,
    coordinates: row.lat != null && row.lng != null ? { lat: row.lat, lon: row.lng } : null,
    wikipediaUrl: row.url ?? wikiArticleUrl(row.title, lang),
    images: row.image ? [{ src: row.image, caption: row.title }] : [],
    requestedTitle,
    resolvedTitle: row.title,
  };
}

async function tryServeWikiArticleFromLocationCache(
  requestedTitle: string,
  lang: WikiLang,
  res: { json: (body: unknown) => void },
): Promise<boolean> {
  const cacheRow = await readLocationWikiCacheForArticleTitle(requestedTitle, lang);
  if (!cacheRow) return false;
  if (wikiTitleTooShortForQuery(cacheRow.title, requestedTitle)) return false;
  const data = locationCacheRowToArticleData(cacheRow, requestedTitle, lang);
  res.json({ success: true, data, cached: true, source: "location_wiki_cache" });
  return true;
}

function wikiArticleNegativeKey(title: string, lang: WikiLang): string {
  return `${lang}:${wikiArticleCacheKey(title)}`;
}

function readWikiArticleNegativeCache(title: string, lang: WikiLang): boolean {
  const key = wikiArticleNegativeKey(title, lang);
  return cacheGet(wikiArticleNegativeCache, key) === true;
}

function writeWikiArticleNegativeCache(title: string, lang: WikiLang): void {
  const key = wikiArticleNegativeKey(title, lang);
  if (!key || key === `${lang}:`) return;
  if (wikiArticleNegativeCache.size >= WIKI_CACHE_MAX_ENTRIES) {
    const firstKey = wikiArticleNegativeCache.keys().next().value as string | undefined;
    if (firstKey) wikiArticleNegativeCache.delete(firstKey);
  }
  wikiArticleNegativeCache.set(key, { value: true, expiresAt: Date.now() + WIKI_NEGATIVE_CACHE_TTL_MS });
}

/** Kötü slug — upstream'e gitmeden hızlı 404 (boşluk, ?, boş). */
function isRejectedWikiArticleSlug(raw: string): boolean {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return true;
  if (trimmed.includes("?") || /%3[fF]/.test(trimmed)) return true;
  if (/\s/.test(trimmed)) return true;
  return false;
}

function respondWikiArticleNotFound(
  res: import("express").Response,
  requestedTitle: string,
  lang: WikiLang,
  body: Record<string, unknown>,
): void {
  writeWikiArticleNegativeCache(requestedTitle, lang);
  console.debug("[wiki] article 404:", requestedTitle, body.error);
  res.status(404).json({ success: false, ...body });
}

/*
  ── Direct full article fetch (for /bilgiagaci pages) ──
  No relevance scoring — fetches the article by exact title.
  GET /api/wiki/article/:title
  Returns { success, data: { html, title, description?, thumbnail? } }
*/
router.get("/wiki/article/:title", async (req, res): Promise<void> => {
  try {
    const rawTitle = Array.isArray(req.params.title) ? req.params.title[0] : req.params.title;
    const lang = parseWikiLang(req.query.lang as string | undefined);
    const requestedTitle = decodeWikiTitleParam(rawTitle ?? "");

    if (isRejectedWikiArticleSlug(rawTitle ?? "")) {
      respondWikiArticleNotFound(res, requestedTitle || rawTitle || "", lang, {
        error: "invalid_slug",
        requestedTitle: requestedTitle || rawTitle || "",
      });
      return;
    }

    if (readWikiArticleNegativeCache(requestedTitle, lang)) {
      res.status(404).json({
        success: false,
        error: "exact_article_not_found",
        requestedTitle,
        cached: true,
      });
      return;
    }

    const deadlineAt = Date.now() + WIKI_UPSTREAM_TIMEOUT_MS;
    const pastDeadline = () => Date.now() >= deadlineAt;

    const { rest } = wikiUrls(lang);
    const allowSearchFallback =
      req.query.searchFallback === "1" ||
      req.query.searchFallback === "true" ||
      req.query.exact === "0" ||
      req.query.exact === "false";

    const cachedArticle = await readWikiArticleCache(requestedTitle, lang);
    if (cachedArticle) {
      res.json({ success: true, data: cachedArticle, cached: true });
      return;
    }

    if (pastDeadline()) {
      respondWikiArticleNotFound(res, requestedTitle, lang, {
        error: "upstream_timeout",
        requestedTitle,
      });
      return;
    }

    let page = await fetchWikiArticleByExactCandidates(requestedTitle, lang);
    let resolvedTitle = page?.title ?? requestedTitle;

    if (!page) {
      const provinceTitle = resolveTurkishProvinceWikiTitle(requestedTitle);
      if (provinceTitle) {
        const provincePage = await fetchPageHtml(provinceTitle, lang);
        if (provincePage && !provincePage.isDisambig) {
          page = provincePage;
          resolvedTitle = provincePage.title;
        }
      }
      if (!page) {
        const preferred = preferredWikiTitleForQuery(requestedTitle);
        if (preferred) {
          const preferredPage = await fetchPageHtml(preferred, lang);
          if (preferredPage && !preferredPage.isDisambig) {
            page = preferredPage;
            resolvedTitle = preferredPage.title;
          }
        }
      }
      if (!page) {
        const provinceTitle = resolveTurkishProvinceWikiTitle(requestedTitle);
        const resolved = await resolveWikiArticleTitle(requestedTitle, lang);
        if (resolved && (!provinceTitle || !titleDriftsFromProvinceArticle(resolved, provinceTitle))) {
          resolvedTitle = resolved;
          page = await fetchPageHtml(resolvedTitle, lang);
        } else if (provinceTitle) {
          resolvedTitle = provinceTitle;
          page = await fetchPageHtml(provinceTitle, lang);
        } else {
          const fallbackTitle = resolved ?? requestedTitle;
          if (fallbackTitle) {
            resolvedTitle = fallbackTitle;
            page = await fetchPageHtml(fallbackTitle, lang);
          }
        }
      }
    }

    const [summaryResult] = await Promise.allSettled([
      wikiFetch(`${rest}/page/summary/${encodeWikiRestTitle(resolvedTitle)}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),
    ]);
    const summary = summaryResult.status === "fulfilled" ? summaryResult.value as Record<string, unknown> | null : null;

    if (!page) {
      if (pastDeadline()) {
        respondWikiArticleNotFound(res, requestedTitle, lang, {
          error: "upstream_timeout",
          requestedTitle,
        });
        return;
      }
      for (const cand of wikiTitleCandidates(requestedTitle).slice(0, 16)) {
        const restPage = await fetchPageHtmlViaRest(cand, lang);
        if (
          restPage &&
          restPage.html.length > 200 &&
          !wikiTitleTooShortForQuery(restPage.title, requestedTitle)
        ) {
          page = restPage;
          resolvedTitle = restPage.title;
          break;
        }
      }
    }

    if (!page) {
      for (const cand of wikiTitleCandidates(requestedTitle).slice(0, 8)) {
        const summaryPage = await fetchArticleFromWikiSummary(cand, lang);
        if (
          summaryPage &&
          summaryPage.html.length > 80 &&
          !wikiTitleTooShortForQuery(summaryPage.title, requestedTitle)
        ) {
          page = summaryPage;
          resolvedTitle = summaryPage.title;
          break;
        }
      }
    }

    if (!page && allowSearchFallback) {
      const resolved = await resolveWikiArticleTitle(requestedTitle, lang);
      if (resolved) {
        resolvedTitle = resolved;
        page =
          (await fetchPageHtml(resolved, lang)) ??
          (await fetchPageHtmlViaRest(resolved, lang)) ??
          (await fetchArticleFromWikiSummary(resolved, lang));
      }
    }

    if (!page) {
      if (await tryServeWikiArticleFromLocationCache(requestedTitle, lang, res)) return;
      const suggestions = rankWikiTitlesForEncyclopedia(
        requestedTitle,
        (await searchWikiHits(requestedTitle, 8, lang)).map((hit) => hit.title),
      ).slice(0, 5);
      const provinceTitle = resolveTurkishProvinceWikiTitle(requestedTitle);
      if (provinceTitle && !suggestions.some((t) => norm(t) === norm(provinceTitle))) {
        suggestions.unshift(provinceTitle);
      }
      if (suggestions.length === 1) {
        const only = suggestions[0]!;
        const resolvedPage =
          (await fetchPageHtml(only, lang)) ??
          (await fetchPageHtmlViaRest(only, lang)) ??
          (await fetchArticleFromWikiSummary(only, lang));
        if (resolvedPage && !resolvedPage.isDisambig && !wikiTitleTooShortForQuery(resolvedPage.title, requestedTitle)) {
          page = resolvedPage;
          resolvedTitle = resolvedPage.title;
        }
      }
      if (!page) {
        respondWikiArticleNotFound(res, requestedTitle, lang, {
          error: "exact_article_not_found",
          requestedTitle,
          suggestions,
        });
        return;
      }
    }

    if (page && wikiTitleTooShortForQuery(page.title, requestedTitle)) {
      const retryTitles = [
        preferredWikiTitleForQuery(requestedTitle),
        ENCYCLOPEDIA_QUERY_ALIASES[norm(requestedTitle)],
        ENCYCLOPEDIA_SLUG_ALIASES[wikiAsciiSlugKey(requestedTitle)],
      ].filter((t): t is string => Boolean(t?.trim()));
      let recovered: { html: string; title: string; isDisambig?: boolean; images: WikiArticleImage[] } | null = null;
      for (const retryTitle of retryTitles) {
        const candidate =
          (await fetchPageHtml(retryTitle, lang)) ??
          (await fetchPageHtmlViaRest(retryTitle, lang)) ??
          (await fetchArticleFromWikiSummary(retryTitle, lang));
        if (candidate && !candidate.isDisambig && !wikiTitleTooShortForQuery(candidate.title, requestedTitle)) {
          recovered = candidate;
          break;
        }
      }
      if (recovered) {
        page = recovered;
        resolvedTitle = recovered.title;
      } else {
        respondWikiArticleNotFound(res, requestedTitle, lang, {
          error: "exact_article_not_found",
          requestedTitle,
          suggestions: retryTitles,
        });
        return;
      }
    }

    if (page.isDisambig) {
      const provinceTitle = resolveTurkishProvinceWikiTitle(requestedTitle);
      if (provinceTitle) {
        const provincePage = await fetchPageHtml(provinceTitle, lang);
        if (provincePage && !provincePage.isDisambig) {
          page = provincePage;
          resolvedTitle = provincePage.title;
        }
      }
    }

    if (page.isDisambig) {
      const ranked = rankWikiTitlesForEncyclopedia(
        requestedTitle,
        (await searchWikiHits(requestedTitle, 8, lang)).map((hit) => hit.title),
      );
      const provinceTitle = resolveTurkishProvinceWikiTitle(requestedTitle);
      const exactNorm = provinceTitle ? norm(provinceTitle) : norm(requestedTitle);
      const singleMatch = ranked.filter((t) => norm(t) === exactNorm);
      if (singleMatch.length === 1) {
        const resolvedPage = await fetchPageHtml(singleMatch[0], lang);
        if (resolvedPage && !resolvedPage.isDisambig) {
          page = resolvedPage;
          resolvedTitle = resolvedPage.title;
        }
      } else if (provinceTitle) {
        const provincePage = await fetchPageHtml(provinceTitle, lang);
        if (provincePage && !provincePage.isDisambig) {
          page = provincePage;
          resolvedTitle = provincePage.title;
        }
      }
    }

    if (page.isDisambig) {
      const summaryTitle = await fetchWikiSummaryTitle(resolvedTitle, lang);
      if (summaryTitle) {
        const summaryPage = await fetchPageHtml(summaryTitle, lang);
        if (summaryPage && !summaryPage.isDisambig) {
          page = summaryPage;
          resolvedTitle = summaryPage.title;
        }
      }
    }

    if (page.isDisambig) {
      let suggestions = rankWikiTitlesForEncyclopedia(
        requestedTitle,
        (await searchWikiHits(requestedTitle, 8, lang)).map((hit) => hit.title),
      ).slice(0, 5);
      const provinceTitle = resolveTurkishProvinceWikiTitle(requestedTitle);
      if (provinceTitle && !suggestions.some((t) => norm(t) === norm(provinceTitle))) {
        suggestions.unshift(provinceTitle);
      }
      if (suggestions.length === 0) {
        suggestions = (await searchWikiHits(requestedTitle, 8, lang)).map((hit) => hit.title).slice(0, 5);
      }
      if (suggestions.length === 1) {
        const only = suggestions[0]!;
        const resolvedPage =
          (await fetchPageHtml(only, lang)) ??
          (await fetchPageHtmlViaRest(only, lang)) ??
          (await fetchArticleFromWikiSummary(only, lang));
        if (resolvedPage && !resolvedPage.isDisambig) {
          page = resolvedPage;
          resolvedTitle = resolvedPage.title;
        }
      }
    }

    if (page.isDisambig) {
      for (const cand of wikiTitleCandidates(requestedTitle).slice(0, 16)) {
        const restPage = await fetchPageHtmlViaRest(cand, lang);
        if (restPage && restPage.html.length > 200) {
          page = restPage;
          resolvedTitle = restPage.title;
          break;
        }
      }
    }

    if (page.isDisambig) {
      for (const cand of wikiTitleCandidates(requestedTitle).slice(0, 8)) {
        const summaryPage = await fetchArticleFromWikiSummary(cand, lang);
        if (summaryPage && summaryPage.html.length > 80) {
          page = summaryPage;
          resolvedTitle = summaryPage.title;
          break;
        }
      }
    }

    if (page.isDisambig) {
      let suggestions = rankWikiTitlesForEncyclopedia(
        requestedTitle,
        (await searchWikiHits(requestedTitle, 8, lang)).map((hit) => hit.title),
      ).slice(0, 5);
      const provinceTitle = resolveTurkishProvinceWikiTitle(requestedTitle);
      if (provinceTitle && !suggestions.some((t) => norm(t) === norm(provinceTitle))) {
        suggestions.unshift(provinceTitle);
      }
      if (suggestions.length === 0) {
        const searchHits = await searchWikiHits(requestedTitle, 8, lang);
        for (const hit of searchHits) {
          if (!suggestions.includes(hit.title)) suggestions.push(hit.title);
        }
        suggestions = suggestions.slice(0, 5);
      }
      if (await tryServeWikiArticleFromLocationCache(requestedTitle, lang, res)) return;
      respondWikiArticleNotFound(res, requestedTitle, lang, {
        error: "disambiguation",
        requestedTitle,
        suggestions,
      });
      return;
    }

    const thumbSrc =
      (summary?.originalimage as { source?: string } | undefined)?.source ||
      (summary?.thumbnail as { source?: string } | undefined)?.source ||
      null;
    const bodyImages = page.images ?? [];
    const galleryImages = bodyImages.filter((img) => !thumbSrc || img.src !== thumbSrc);

    const summaryExtract =
      typeof (summary as { extract?: string } | null)?.extract === "string"
        ? String((summary as { extract: string }).extract).trim()
        : null;

    const data: WikiArticleResponseData = {
      title: page.title,
      html: page.html,
      description: summary?.description ?? null,
      extract: summaryExtract,
      thumbnail: summary?.thumbnail ?? null,
      originalimage: summary?.originalimage ?? null,
      coordinates: summary?.coordinates ?? null,
      wikipediaUrl: wikiArticleUrl(page.title, lang),
      images: galleryImages,
      requestedTitle: requestedTitle !== page.title ? requestedTitle : undefined,
      resolvedTitle: requestedTitle !== page.title ? page.title : undefined,
    };
    await writeWikiArticleCache(requestedTitle, page.title, lang, data);
    res.json({ success: true, data, cached: false });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

/* — Wikipedia article summary (thumbnail + extract) — */
router.get("/wiki/summary/:title", async (req, res): Promise<void> => {
  try {
    const title = decodeURIComponent(req.params.title);
    const lang = parseWikiLang(req.query.lang as string | undefined);
    const { rest } = wikiUrls(lang);
    const r = await wikiFetch(`${rest}/page/summary/${encodeWikiRestTitle(title)}`);
    if (!r.ok) { res.status(r.status).json({ success: false, error: "Not found" }); return; }
    const data = await r.json() as Record<string, unknown>;
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

type WikiSummaryCard = {
  requestedTitle: string;
  title: string;
  description: unknown;
  extract: string;
  thumbnail: unknown;
  originalimage: unknown;
  wikipediaUrl: string;
};

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    out.push(...await Promise.all(chunk.map(fn)));
  }
  return out;
}

async function fetchWikiSummaryCard(
  requestedTitle: string,
  lang: WikiLang,
): Promise<WikiSummaryCard | null> {
  const cacheKey = `${lang}:${norm(requestedTitle)}`;
  const cached = cacheGet(wikiSummaryCardCache, cacheKey);
  if (cached) return cached;
  const exactPage = await fetchWikiArticleByExactCandidates(requestedTitle, lang);
  const resolvedTitle = exactPage?.title ?? (await fetchWikiSummaryTitle(requestedTitle, lang)) ?? requestedTitle;
  const { rest } = wikiUrls(lang);
  const r = await wikiFetch(`${rest}/page/summary/${encodeWikiRestTitle(resolvedTitle)}`);
  if (!r.ok) return cacheSet(wikiSummaryCardCache, cacheKey, null);
  const data = await r.json() as {
    title?: string;
    type?: string;
    description?: unknown;
    extract?: unknown;
    thumbnail?: unknown;
    originalimage?: unknown;
  };
  if (data.type === "disambiguation") return cacheSet(wikiSummaryCardCache, cacheKey, null);
  const title = String(data.title || resolvedTitle).trim();
  if (!title) return cacheSet(wikiSummaryCardCache, cacheKey, null);
  return cacheSet(wikiSummaryCardCache, cacheKey, {
    requestedTitle,
    title,
    description: data.description ?? null,
    extract: trimWikiCardExtract(String(data.extract ?? ""), 180),
    thumbnail: data.thumbnail ?? null,
    originalimage: data.originalimage ?? null,
    wikipediaUrl: wikiArticleUrl(title, lang),
  });
}

/* — Wikipedia summaries batch (category topic cards) — */
router.post("/wiki/summaries", async (req, res): Promise<void> => {
  try {
    const lang = parseWikiLang(String(req.query.lang ?? req.body?.lang ?? ""));
    const rawTitles: unknown[] = Array.isArray(req.body?.titles) ? req.body.titles : [];
    const titles: string[] = Array.from(
      new Set(
        rawTitles
          .map((title: unknown) => String(title ?? "").trim())
          .filter(Boolean),
      ),
    ).slice(0, 24);

    if (titles.length === 0) {
      res.json({ success: true, data: {} });
      return;
    }

    const cards = await mapWithConcurrency(titles, 4, async (title) => {
      try {
        return await fetchWikiSummaryCard(title, lang);
      } catch {
        return null;
      }
    });
    const byTitle = Object.fromEntries(
      titles.map((title, index) => [title, cards[index] ?? null]),
    );
    res.json({ success: true, data: byTitle });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

/* — Warm article cache for visible category/homepage links — */
router.post("/wiki/precache", async (req, res): Promise<void> => {
  try {
    const lang = parseWikiLang(String(req.query.lang ?? req.body?.lang ?? ""));
    const rawTitles: unknown[] = Array.isArray(req.body?.titles) ? req.body.titles : [];
    const titles: string[] = Array.from(
      new Set(
        rawTitles
          .map((title: unknown) => String(title ?? "").trim())
          .filter(Boolean),
      ),
    ).slice(0, 32);

    if (titles.length === 0) {
      res.json({ success: true, warmed: 0, titles: [] });
      return;
    }

    const warmed = await mapWithConcurrency(titles, 3, async (title) => {
      try {
        const resolvedTitle = (await resolveWikiArticleTitle(title, lang)) ?? title;
        const page = await fetchPageHtml(resolvedTitle, lang);
        return page && !page.isDisambig ? page.title : null;
      } catch {
        return null;
      }
    });

    const resolvedTitles = warmed.filter((title): title is string => Boolean(title));
    res.json({ success: true, warmed: resolvedTitles.length, titles: resolvedTitles });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

/* — Wikipedia search (ansiklopedi: konu odaklı sıralama) — */
router.get("/wiki/search", async (req, res): Promise<void> => {
  const { q, limit = "5", lang } = req.query as Record<string, string>;
  if (!q) { res.json({ success: true, data: [] }); return; }
  try {
    const wl = parseWikiLang(lang);
    const lim = Math.min(20, Math.max(1, parseInt(String(limit), 10) || 5));
    const fetchLimit = Math.min(20, Math.max(lim, lim * 2));
    let hits = await searchWikiHits(q, fetchLimit, wl);
    if (hits.length === 0) {
      hits = await directWikiSearchFallback(q, fetchLimit, wl);
    } else {
      const fallbackHits = await directWikiSearchFallback(q, Math.min(5, fetchLimit), wl);
      const seen = new Set(hits.map((hit) => norm(hit.title)));
      for (const hit of fallbackHits) {
        if (seen.has(norm(hit.title))) continue;
        seen.add(norm(hit.title));
        hits.push(hit);
      }
    }
    const rankedTitles = rankWikiTitlesForEncyclopedia(q, hits.map((h) => h.title));
    const byTitle = new Map(hits.map((h) => [h.title, h]));
    const ranked = rankedTitles
      .map((title) => byTitle.get(title))
      .filter((h): h is NonNullable<typeof h> => Boolean(h))
      .slice(0, lim);
    res.json({ success: true, data: ranked });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

/** Ansiklopedi araması için en uygun Vikipedi başlığı (hafif uç). */
router.get("/wiki/resolve-title", async (req, res): Promise<void> => {
  const { q, lang } = req.query as Record<string, string>;
  if (!q?.trim()) {
    res.status(400).json({ success: false, error: "q gerekli" });
    return;
  }
  try {
    const wl = parseWikiLang(lang);
    const title = await resolveWikiArticleTitle(q.trim(), wl);
    if (!title) {
      res.status(404).json({ success: false, error: "Makale bulunamadı" });
      return;
    }
    res.json({ success: true, data: { title } });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

/*
  ── Wikipedia full article with relevance detection ──

  Query params:
    spotName  – original spot display name (for relevance check)
    spotType  – OSM type label, e.g. "monument", "museum" (for relevance check)
    location  – city/region name to narrow the search

  Response:
    { success, data: {
        html,          // cleaned HTML with inline /bilgiagaci/ links
        title,         // Wikipedia article title actually returned
        confidence,    // "exact" | "related" | "none"
        relatedTitle,  // if confidence === "related", the related article title
        relatedHtml    // if confidence === "related", its HTML (for the "show anyway" action)
    }}
*/
router.get("/wiki/full/:title", async (req, res): Promise<void> => {
  try {
    const title = decodeURIComponent(req.params.title);
    const { spotName, spotType, location } = req.query as Record<string, string | undefined>;
    const displayName = spotName || title;

    // ── Strategy: location-first so "15 Temmuz Meydanı" in Ankara doesn't match Gaziantep's ──
    // 1. Location + display name  (most specific — e.g. "Ankara 15 Temmuz Demokrasi Meydanı")
    // 2. Exact display name alone
    // 3. Display name + location  (reversed)
    // 4. Display name + type label
    const queries: string[] = [];
    if (location) queries.push(`${location} ${displayName}`);
    queries.push(displayName);
    if (location) queries.push(`${displayName} ${location}`);
    if (spotType) queries.push(`${displayName} ${spotType}`);

    // Try each query; pick the result whose title is most relevant to spotName
    let bestTitle: string | null = null;
    let bestScore = -1;

    for (const q of queries) {
      const results = await searchWiki(q, 5);
      for (const r of results) {
        const score = relevanceScore(displayName, r, location);
        if (score > bestScore) { bestScore = score; bestTitle = r; }
        if (score >= 0.6) break;
      }
      if (bestScore >= 0.6) break;
    }

    // Threshold: < 0.3 means the best result is likely about a different topic
    const EXACT_THRESHOLD = 0.5;

    if (!bestTitle) {
      res.status(404).json({ success: false, error: "Makale bulunamadı" });
      return;
    }

    if (bestScore >= EXACT_THRESHOLD) {
      // High-confidence match — but skip disambiguation pages when we have location context
      let page = await fetchPageHtml(bestTitle);
      if (!page) { res.status(404).json({ success: false, error: "Makale içeriği alınamadı" }); return; }

      // If the matched page is a disambiguation and we have a location, try more specific searches
      if (page.isDisambig && location) {
        const fallbackQueries = [
          `${location} ${displayName}`,
          `${displayName} ${location}`,
          `${location} ${displayName} ${spotType || ""}`.trim(),
        ];
        let found: typeof page | null = null;
        const triedTitles = new Set<string>([bestTitle]);
        for (const fq of fallbackQueries) {
          const cands = await searchWiki(fq, 6);
          for (const cand of cands) {
            if (triedTitles.has(cand)) continue;
            triedTitles.add(cand);
            const p = await fetchPageHtml(cand);
            if (p && !p.isDisambig) { found = p; break; }
          }
          if (found) break;
        }
        if (found) page = found;
      }

      res.json({ success: true, data: { html: page.html, title: page.title, confidence: page.isDisambig ? "none" : "exact" } });
    } else {
      // Low-confidence — only suggest a related article if a meaningful (non-generic) keyword overlaps
      const meaningful = hasMeaningfulOverlap(displayName, bestTitle);
      const relatedPage = meaningful ? await fetchPageHtml(bestTitle) : null;
      // Skip disambiguation suggestions
      const safeRelated = relatedPage && !relatedPage.isDisambig ? relatedPage : null;
      res.json({
        success: true,
        data: {
          html: null,
          title: displayName,
          confidence: "none",
          relatedTitle: meaningful && safeRelated ? (safeRelated.title || bestTitle) : undefined,
          relatedHtml: meaningful && safeRelated ? (safeRelated.html || null) : null,
        },
      });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

/*
  ── City cultural / tourist topics ──

  GET /api/wiki/city-topics?city=Ankara&topic=gezilecek|el_sanatlari|mutfak|folklor|all

  Searches Wikipedia for one or more city-specific cultural/tourist topics.
  Returns { success, data: { topic, title, summary, html }[] }
*/
const CITY_TOPIC_QUERIES: Record<string, { label: string; queries: string[] }> = {
  gezilecek: {
    label: "Gezilecek Yerler",
    queries: [
      "{{city}} gezilecek yerler",
      "{{city}} tarihi yerler ve müzeler",
      "{{city}} müzeleri",
      "{{city}} tarihi yapılar",
      "{{city}} turizm",
      "{{city}} parklar ve bahçeler",
    ],
  },
  el_sanatlari: {
    label: "El Sanatları",
    queries: [
      "{{city}} el sanatları",
      "{{city}} geleneksel el sanatları",
      "{{city}} zanaat",
    ],
  },
  mutfak: {
    label: "Mutfak",
    queries: [
      "{{city}} mutfağı",
      "{{city}} yemekleri",
      "{{city}} yöresel yemekler",
    ],
  },
  folklor: {
    label: "Türküler ve Halk Oyunları",
    queries: [
      "{{city}} türküleri",
      "{{city}} türküsü",
      "{{city}} halk oyunları",
      "{{city}} halayı",
      "{{city}} folklor",
    ],
  },
};

async function fetchCityTopic(
  city: string,
  topicKey: string
): Promise<{ topic: string; label: string; title: string | null; summary: string | null; html: string | null }> {
  const def = CITY_TOPIC_QUERIES[topicKey];
  if (!def) return { topic: topicKey, label: topicKey, title: null, summary: null, html: null };

  const normCity = norm(city);
  let bestTitle: string | null = null;
  let bestScore = 0; // must beat 0 to be accepted

  for (const qTpl of def.queries) {
    const q = qTpl.replace("{{city}}", city);
    const results = await searchWiki(q, 8);
    for (const r of results) {
      // Result title MUST contain the city name — prevents returning articles from the wrong city
      if (!norm(r).includes(normCity)) continue;
      const score = relevanceScore(qTpl.replace("{{city}}", "").trim(), r, city);
      if (score > bestScore) { bestScore = score; bestTitle = r; }
      if (bestScore >= 0.4) break;
    }
    if (bestTitle) break;
  }

  if (!bestTitle) return { topic: topicKey, label: def.label, title: null, summary: null, html: null };

  const page = await fetchPageHtml(bestTitle);
  if (!page) return { topic: topicKey, label: def.label, title: bestTitle, summary: null, html: null };

  // Extract first paragraph as summary
  const firstPMatch = page.html.match(/<p>(.+?)<\/p>/s);
  const summaryRaw = firstPMatch ? firstPMatch[1].replace(/<[^>]+>/g, "").trim() : null;
  const summary = summaryRaw ? summaryRaw.slice(0, 300) + (summaryRaw.length > 300 ? "…" : "") : null;

  return { topic: topicKey, label: def.label, title: page.title, summary, html: page.html };
}

router.get("/wiki/city-topics", async (req, res): Promise<void> => {
  const { city, topic } = req.query as Record<string, string | undefined>;
  if (!city) { res.status(400).json({ success: false, error: "city gerekli" }); return; }

  try {
    const requestedTopics = topic === "all" || !topic
      ? Object.keys(CITY_TOPIC_QUERIES)
      : [topic];

    const results = await Promise.all(requestedTopics.map(t => fetchCityTopic(city, t)));
    res.json({ success: true, data: results });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

/*
  GET /api/wiki/city-sections?city=Trabzon
  Fetches the main Wikipedia article for the city and extracts key sections
  (Etimoloji, Tarihçe, Coğrafya, Ulaşım, Spor, Yönetim, Kardeş şehirler, etc.)
  Returns { success, title, data: { key, label, icon, heading, html, summary }[] }
*/
const CITY_SECTION_DEFS = [
  { key: "etimoloji",       label: "Etimoloji",         icon: "📜", variants: ["etimoloji", "adın kökeni", "adının kökeni", "ad"] },
  { key: "tarihce",         label: "Tarihçe",            icon: "🏛️", variants: ["tarihçe", "tarih", "tarihsel süreç", "tarihsel gelişim"] },
  { key: "cografya",        label: "Coğrafya",           icon: "🗺️", variants: ["coğrafya", "coğrafi konum", "coğrafi yapı"] },
  { key: "ulasim",          label: "Ulaşım",             icon: "🚗", variants: ["ulaşım", "ulaşım ve iletişim", "ulaşım ve haberleşme", "ulaşım altyapısı"] },
  { key: "spor",            label: "Spor",               icon: "⚽", variants: ["spor", "spor kulüpleri", "spor ve rekreasyon"] },
  { key: "yonetim",         label: "Yönetim",            icon: "🏢", variants: ["yönetim", "yönetim ve siyaset", "idari yapı", "idari bölünüş", "belediye yönetimi", "siyasi yapı"] },
  { key: "kardes_sehirler", label: "Kardeş Şehirler",   icon: "🤝", variants: ["kardeş şehirler", "kardeş kentler", "ikiz şehirler", "kardeş il", "şehir kardeşlikleri"] },
  { key: "ekonomi",         label: "Ekonomi",            icon: "💼", variants: ["ekonomi", "ekonomik yapı", "sanayi ve ekonomi"] },
  { key: "egitim",          label: "Eğitim",             icon: "🎓", variants: ["eğitim", "eğitim kurumları", "yükseköğretim"] },
  { key: "kultur",          label: "Kültür",             icon: "🎨", variants: ["kültür", "kültür ve sanat", "kültürel yapı"] },
  { key: "nufus",           label: "Nüfus",              icon: "👥", variants: ["nüfus", "demografik yapı", "demografik"] },
];

router.get("/wiki/city-sections", async (req, res): Promise<void> => {
  const { city } = req.query as Record<string, string | undefined>;
  if (!city) { res.status(400).json({ success: false, error: "city gerekli" }); return; }
  try {
    const normCity = norm(city);
    const results = await searchWiki(city, 8);
    const bestTitle = results.find(r => norm(r) === normCity)
      || results.find(r => norm(r).startsWith(normCity) && norm(r).length < normCity.length + 10)
      || results[0];
    if (!bestTitle) { res.json({ success: true, data: [], title: null }); return; }

    const page = await fetchPageHtml(bestTitle);
    if (!page) { res.json({ success: true, data: [], title: null }); return; }

    const sections: { key: string; label: string; icon: string; heading: string; html: string; summary: string }[] = [];
    const parts = page.html.split(/(?=<h[23](?:[^>]*)?>)/i);

    for (const part of parts) {
      const hMatch = part.match(/<h([23])(?:[^>]*)?>([^]*?)<\/h[23]>/i);
      if (!hMatch) continue;
      const headingText = hMatch[2].replace(/<[^>]+>/g, "").trim();
      const normHeading = norm(headingText);
      const def = CITY_SECTION_DEFS.find(d => d.variants.some(v => normHeading === norm(v) || normHeading.startsWith(norm(v))));
      if (!def) continue;
      if (sections.some(s => s.key === def.key)) continue;
      const content = part.replace(/<h[23](?:[^>]*)?>.*?<\/h[23]>/i, "").trim();
      if (!content) continue;
      const summaryRaw = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const summary = summaryRaw.slice(0, 400) + (summaryRaw.length > 400 ? "…" : "");
      sections.push({ key: def.key, label: def.label, icon: def.icon, heading: headingText, html: content, summary });
    }

    res.json({ success: true, data: sections, title: page.title });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

/* — Wikipedia related articles — */
router.get("/wiki/related/:title", async (req, res): Promise<void> => {
  try {
    const title = decodeURIComponent(req.params.title);
    const r = await wikiFetch(`${WIKI_BASE}/page/related/${encodeWikiRestTitle(title)}`);
    if (!r.ok) { res.json({ success: true, data: [] }); return; }
    const data = await r.json() as { pages?: unknown[] };
    res.json({ success: true, data: data?.pages ?? [] });
  } catch {
    res.json({ success: true, data: [] });
  }
});

/* — Ansiklopedi sayfa görünümü & Wikipedia ayarları (JSONB) — */

const DEFAULT_WIKI_ENCYCLOPEDIA_UI = {
  heroTitle: "Bilgi Ağacı",
  heroSubtitle: "",
  heroGradientFrom: "#039D55",
  heroGradientTo: "#028347",
  heroTextColor: "#ffffff",
  mainHeading: "İstediğiniz konuyu arayın",
  mainSubheading: "Şehirler, tarih, kültür, bilim ve gündem dahil konu sınırı olmadan arama yapın",
  searchPlaceholder: "Araştırmak istediğiniz konuyu yazın...",
  searchButtonLabel: "Ara",
  topicsSectionLabel: "Önerilen konular",
  footerNote: "",
  wikiLang: "tr" as WikiLang,
  wikiSearchLimit: 20,
  pathSlugHint: "ansiklopedi",
};

export type WikiEncyclopediaUi = typeof DEFAULT_WIKI_ENCYCLOPEDIA_UI;

async function ensureWikiSettingsTable(): Promise<void> {
  await executeNewsDbWrite(sql`
    CREATE TABLE IF NOT EXISTS wiki_settings (
      id integer PRIMARY KEY DEFAULT 1,
      wiki_featured jsonb NOT NULL DEFAULT '[]'::jsonb,
      wiki_encyclopedia_ui jsonb,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO wiki_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
  `);
}

function sanitizeEncyclopediaUi(raw: unknown): WikiEncyclopediaUi {
  const src = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const str = (key: keyof WikiEncyclopediaUi, max: number): string => {
    const v = src[key];
    const fb = DEFAULT_WIKI_ENCYCLOPEDIA_UI[key];
    if (typeof v !== "string" || !v.trim()) return typeof fb === "string" ? fb : String(fb);
    const cleaned = v.trim().slice(0, max);
    if (cleaned === "Yekpare Bilgi Ağacı") return "Bilgi Ağacı";
    if (cleaned === "Yekpare Bilgi Ağacı'nda ara…") return "Bilgi Ağacı'nda ara…";
    return cleaned;
  };
  const hex = (key: "heroGradientFrom" | "heroGradientTo" | "heroTextColor"): string => {
    const v = src[key];
    const fb = DEFAULT_WIKI_ENCYCLOPEDIA_UI[key];
    if (typeof v !== "string" || !/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(v.trim())) return fb;
    return v.trim();
  };
  const limRaw = src.wikiSearchLimit;
  const lim = typeof limRaw === "number" ? limRaw : parseInt(String(limRaw ?? ""), 10);
  const wikiSearchLimit = Number.isFinite(lim) ? Math.min(20, Math.max(1, lim)) : DEFAULT_WIKI_ENCYCLOPEDIA_UI.wikiSearchLimit;
  const wl = src.wikiLang === "en" ? "en" : "tr";

  return {
    heroTitle: str("heroTitle", 240),
    heroSubtitle: str("heroSubtitle", 400),
    heroGradientFrom: hex("heroGradientFrom"),
    heroGradientTo: hex("heroGradientTo"),
    heroTextColor: hex("heroTextColor"),
    mainHeading: str("mainHeading", 240),
    mainSubheading: str("mainSubheading", 400),
    searchPlaceholder: str("searchPlaceholder", 200),
    searchButtonLabel: str("searchButtonLabel", 40),
    topicsSectionLabel: str("topicsSectionLabel", 120),
    footerNote: str("footerNote", 2000),
    wikiLang: wl,
    wikiSearchLimit,
    pathSlugHint: str("pathSlugHint", 120),
  };
}

function pickEncyclopediaBodyPatch(body: unknown): Partial<WikiEncyclopediaUi> {
  if (typeof body !== "object" || body === null) return {};
  const b = body as Record<string, unknown>;
  const keys = Object.keys(DEFAULT_WIKI_ENCYCLOPEDIA_UI) as (keyof WikiEncyclopediaUi)[];
  const out: Partial<WikiEncyclopediaUi> = {};
  for (const k of keys) {
    if (b[k] !== undefined) (out as Record<string, unknown>)[k as string] = b[k];
  }
  return out;
}

router.get("/wiki/encyclopedia-ui", async (_req, res): Promise<void> => {
  try {
    await ensureWikiSettingsTable();
    const rows = await getNewsDbForRead().execute(
      sql`SELECT wiki_encyclopedia_ui FROM wiki_settings WHERE id = 1`,
    );
    const row = (rows.rows[0] as { wiki_encyclopedia_ui?: unknown } | undefined)?.wiki_encyclopedia_ui;
    const merged = {
      ...DEFAULT_WIKI_ENCYCLOPEDIA_UI,
      ...(typeof row === "object" && row !== null ? (row as Record<string, unknown>) : {}),
    };
    res.json({ success: true, data: sanitizeEncyclopediaUi(merged) });
  } catch {
    res.json({ success: true, data: sanitizeEncyclopediaUi({}) });
  }
});

router.put("/wiki/encyclopedia-ui", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  try {
    await ensureWikiSettingsTable();
    const rows = await getNewsDbForRead().execute(
      sql`SELECT wiki_encyclopedia_ui FROM wiki_settings WHERE id = 1`,
    );
    const current = (rows.rows[0] as { wiki_encyclopedia_ui?: unknown } | undefined)?.wiki_encyclopedia_ui;
    const merged = {
      ...DEFAULT_WIKI_ENCYCLOPEDIA_UI,
      ...(typeof current === "object" && current !== null ? (current as Record<string, unknown>) : {}),
      ...pickEncyclopediaBodyPatch(req.body),
    };
    const data = sanitizeEncyclopediaUi(merged);
    await executeNewsDbWrite(
      sql`UPDATE wiki_settings SET wiki_encyclopedia_ui = ${JSON.stringify(data)}::jsonb, updated_at = now() WHERE id = 1`,
    );
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

/* — Ansiklopedi öne çıkan konular (admin CRUD) — */

router.get("/wiki/featured", async (_req, res): Promise<void> => {
  try {
    await ensureWikiSettingsTable();
    const rows = await getNewsDbForRead().execute(
      sql`SELECT wiki_featured FROM wiki_settings WHERE id = 1`
    );
    const featured = (rows.rows[0] as { wiki_featured?: unknown } | undefined)?.wiki_featured ?? [];
    res.json({ success: true, data: Array.isArray(featured) ? featured : [] });
  } catch {
    res.json({ success: true, data: [] });
  }
});

router.put("/wiki/featured", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  try {
    const { topics } = req.body;
    if (!Array.isArray(topics)) { res.status(400).json({ error: "topics must be array" }); return; }
    const topicsJson = JSON.stringify(topics);
    await ensureWikiSettingsTable();
    await executeNewsDbWrite(
      sql`UPDATE wiki_settings SET wiki_featured = ${topicsJson}::jsonb, updated_at = now() WHERE id = 1`
    );
    res.json({ success: true, data: topics });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

/* — Turkish Wikipedia main page daily feed (cached by day) — */

export type WikiHomepageItem = {
  text: string;
  wikiTitle?: string;
};

export type WikiHomepageFeed = {
  date: string;
  fetchedAt: string;
  featuredArticle?: {
    title: string;
    extract: string;
    thumbnail?: string | null;
  };
  onThisDay?: {
    label: string;
    items: WikiHomepageItem[];
  };
  didYouKnow?: {
    items: WikiHomepageItem[];
  };
  featuredPicture?: {
    title: string;
    caption: string;
    imageUrl: string;
    wikiTitle?: string;
  };
  goodArticle?: {
    title: string;
    extract: string;
    thumbnail?: string | null;
  };
};

const MP_SECTION_IDS = ["mp-tfa", "mp-tfp", "mp-itn", "mp-bm", "mp-dyk", "mp-lang", "mp-sister", "mp-bottom"] as const;

function buildFallbackWikiHomepage(dateKey: string): WikiHomepageFeed {
  const hash = (s: string) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  const pick = <T,>(items: T[], salt = ""): T => items[hash(`${dateKey}${salt}`) % items.length]!;
  const pickMany = <T,>(items: T[], count: number, salt = ""): T[] => {
    const start = hash(`${dateKey}${salt}`) % items.length;
    return Array.from({ length: Math.min(count, items.length) }, (_, i) => items[(start + i) % items.length]!);
  };
  const featuredPool = [
    { title: "Türkiye", extract: "Resmî adıyla Türkiye Cumhuriyeti, Anadolu ve Doğu Trakya'yı kapsayan ülkedir." },
    { title: "Ankara", extract: "Türkiye Cumhuriyeti'nin başkenti ve ikinci en kalabalık şehridir." },
    { title: "İstanbul", extract: "Türkiye'nin en kalabalık şehri ve kültürel merkezlerinden biridir." },
    { title: "Osmanlı İmparatorluğu", extract: "1299-1922 yılları arasında hüküm sürmüş imparatorluktur." },
    { title: "Mustafa Kemal Atatürk", extract: "Türkiye Cumhuriyeti'nin kurucusudur." },
  ];
  const goodPool = [
    { title: "İzmir", extract: "Ege'nin en büyük metropolüdür." },
    { title: "Antalya", extract: "Akdeniz'in önemli turizm merkezlerinden biridir." },
    { title: "Bursa", extract: "Osmanlı'nın ilk başkentidir." },
    { title: "Trabzon", extract: "Karadeniz'in tarihî kentlerindendir." },
  ];
  const onThisDayPool: WikiHomepageItem[] = [
    { text: "19 Mayıs — Atatürk'ü Anma, Gençlik ve Spor Bayramı", wikiTitle: "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı" },
    { text: "23 Nisan — Ulusal Egemenlik ve Çocuk Bayramı", wikiTitle: "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı" },
    { text: "29 Ekim — Cumhuriyet Bayramı", wikiTitle: "29 Ekim Cumhuriyet Bayramı" },
    { text: "30 Ağustos — Zafer Bayramı", wikiTitle: "30 Ağustos Zafer Bayramı" },
    { text: "10 Kasım — Atatürk'ü Anma Günü", wikiTitle: "10 Kasım" },
  ];
  const dykPool: WikiHomepageItem[] = [
    { text: "Mustafa Kemal Atatürk, Türkiye Cumhuriyeti'nin kurucusudur.", wikiTitle: "Mustafa Kemal Atatürk" },
    { text: "Osmanlı İmparatorluğu 1299-1922 yılları arasında hüküm sürmüştür.", wikiTitle: "Osmanlı İmparatorluğu" },
    { text: "Ankara, Türkiye Cumhuriyeti'nin başkentidir.", wikiTitle: "Ankara" },
  ];
  const picturePool = [
    {
      title: "Ayasofya",
      caption: "İstanbul'un simge yapılarından biri",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Hagia_Sophia_Mars_2013.jpg/330px-Hagia_Sophia_Mars_2013.jpg",
      wikiTitle: "Ayasofya",
    },
    {
      title: "Anıtkabir",
      caption: "Ankara'da Mustafa Kemal Atatürk'ün anıt mezarı",
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/An%C4%B1tkabir_%28cropped%29.jpg/330px-An%C4%B1tkabir_%28cropped%29.jpg",
      wikiTitle: "Anıtkabir",
    },
  ];
  return {
    date: dateKey,
    fetchedAt: new Date().toISOString(),
    featuredArticle: { ...pick(featuredPool), thumbnail: null },
    goodArticle: { ...pick(goodPool, ":good"), thumbnail: null },
    onThisDay: {
      label: "Tarihte bugün",
      items: pickMany(onThisDayPool, 2, ":otd"),
    },
    didYouKnow: {
      items: pickMany(dykPool, 2, ":dyk"),
    },
    featuredPicture: pick(picturePool, ":pic"),
  };
}

let wikiHomepageCache: { dateKey: string; data: WikiHomepageFeed } | null = null;

function wikiHomepageDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

function decodeWikiHrefTitle(raw: string): string {
  try {
    return decodeURIComponent(String(raw ?? "").replace(/_/g, " ")).trim();
  } catch {
    return String(raw ?? "").replace(/_/g, " ").trim();
  }
}

function isSkippedWikiTitle(title: string): boolean {
  return isSkippedWikiNamespace(title);
}

function hasWikiHomepageBlocks(feed: WikiHomepageFeed): boolean {
  return Boolean(
    feed.featuredArticle?.title ||
      feed.goodArticle?.title ||
      (feed.onThisDay?.items?.length ?? 0) > 0 ||
      (feed.didYouKnow?.items?.length ?? 0) > 0 ||
      feed.featuredPicture?.imageUrl,
  );
}

function extractMpSection(html: string, sectionId: string): string {
  const idRe = new RegExp(`\\bid=(["'])${sectionId}\\1`, "i");
  const start = html.search(idRe);
  if (start < 0) return "";
  const openEnd = html.indexOf(">", start);
  if (openEnd < 0) return "";
  const slice = html.slice(openEnd + 1);
  let end = slice.length;
  for (const id of MP_SECTION_IDS) {
    if (id === sectionId) continue;
    const nextRe = new RegExp(`\\bid=(["'])${id}\\1`, "i");
    const idx = slice.search(nextRe);
    if (idx >= 0 && idx < end) end = idx;
  }
  const footerIdx = slice.search(/class=(["'])[^"']*-(footer|noprint)\1/i);
  if (footerIdx >= 0 && footerIdx < end) end = footerIdx;
  return slice.slice(0, end).trim();
}

function wikiLinksFromSection(sectionHtml: string): { title: string; href: string }[] {
  const out: { title: string; href: string }[] = [];
  const seen = new Set<string>();
  const re = /<a\b[^>]*href="\/wiki\/([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sectionHtml))) {
    const title = decodeWikiHrefTitle(m[1]);
    if (!title || isSkippedWikiTitle(title) || seen.has(title)) continue;
    seen.add(title);
    out.push({ title, href: m[1] });
  }
  return out;
}

function primaryWikiTitle(sectionHtml: string): string | null {
  const devami = sectionHtml.match(/<a\b[^>]*href="\/wiki\/([^"#]+)"[^>]*>\s*(?:<b>\s*)?Devam/i);
  if (devami) {
    const t = decodeWikiHrefTitle(devami[1]);
    if (t && !isSkippedWikiTitle(t)) return t;
  }
  const bold = sectionHtml.match(/<b>\s*<a\b[^>]*href="\/wiki\/([^"#]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/b>/i);
  if (bold) {
    const t = decodeWikiHrefTitle(bold[1]);
    if (t && !isSkippedWikiTitle(t)) return t;
  }
  for (const link of wikiLinksFromSection(sectionHtml)) return link.title;
  return null;
}

function firstWikiLink(sectionHtml: string): { title: string; href: string } | null {
  const title = primaryWikiTitle(sectionHtml);
  return title ? { title, href: title.replace(/ /g, "_") } : null;
}

function wikiLinkFromDevami(sectionHtml: string): string | null {
  return primaryWikiTitle(sectionHtml);
}

function firstImageSrc(sectionHtml: string): string | null {
  const m = sectionHtml.match(/<img\b[^>]*(?:\bsrc|\bdata-src)="([^"]+)"/i);
  if (!m) return null;
  const src = absolutizeWikiAssetUrl(m[1], "tr");
  return src.startsWith("http") ? src : null;
}

function extractListItems(sectionHtml: string, max = 4): WikiHomepageItem[] {
  const out: WikiHomepageItem[] = [];
  const re = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sectionHtml)) && out.length < max) {
    const inner = m[1];
    const boldLink = inner.match(/<b>\s*<a\b[^>]*href="\/wiki\/([^"#]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/b>/i);
    const anyLink = inner.match(/<a\b[^>]*href="\/wiki\/([^"#]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const link = boldLink || anyLink;
    let wikiTitle: string | undefined;
    if (link) {
      const t = decodeURIComponent(link[1].replace(/_/g, " "));
      if (!/^(Dosya|File|Resim|Vikipedi|Şablon|Template|Kategori|Category):/i.test(t)) {
        wikiTitle = t;
      }
    }
    const text = stripHtmlTags(inner).replace(/\s+/g, " ").trim();
    if (text.length > 12) out.push({ text: trimWikiCardExtract(text, 220), wikiTitle });
  }
  return out;
}

function extractOnThisDayLabel(sectionHtml: string): string {
  const m = sectionHtml.match(/<p>\s*<b>\s*<a\b[^>]*>([\s\S]*?)<\/a>\s*<\/b>\s*:/i);
  if (m) return `${stripHtmlTags(m[1]).trim()} — Tarihte bugün`;
  return "Tarihte bugün";
}

function extractFeaturedBlock(sectionHtml: string): { title: string; extract: string; thumbnail?: string | null } | null {
  if (!sectionHtml.trim()) return null;
  const title = primaryWikiTitle(sectionHtml);
  if (!title) return null;
  let extract = stripHtmlTags(
    sectionHtml
      .replace(/<figure[\s\S]*?<\/figure>/gi, " ")
      .replace(/<div class=(["'])[^"']*footer[\s\S]*$/i, " ")
      .replace(/<a\b[^>]*>\s*(?:<b>\s*)?Devam[\s\S]*?<\/a>/gi, " "),
  ).replace(/\s+/g, " ").trim();
  extract = trimWikiCardExtract(extract);
  if (!extract) return null;
  return { title, extract, thumbnail: firstImageSrc(sectionHtml) };
}

function extractFeaturedPicture(sectionHtml: string): WikiHomepageFeed["featuredPicture"] {
  if (!sectionHtml.trim()) return undefined;
  const picUrl = firstImageSrc(sectionHtml);
  if (!picUrl) return undefined;
  const picCaption = stripHtmlTags(
    sectionHtml.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] || "",
  ).trim();
  const picTitle =
    primaryWikiTitle(sectionHtml.replace(/<figure[\s\S]*?<\/figure>/gi, " ")) ||
    wikiLinksFromSection(sectionHtml).find((l) => l.title.length > 3)?.title ||
    picCaption ||
    "Günün görseli";
  return {
    title: picTitle,
    caption: picCaption || picTitle,
    imageUrl: picUrl,
    wikiTitle: picTitle !== "Günün görseli" ? picTitle : undefined,
  };
}

function parseTurkishWikiHomepageHtml(html: string): WikiHomepageFeed {
  const tfa = extractMpSection(html, "mp-tfa");
  const tfp = extractMpSection(html, "mp-tfp");
  const itn = extractMpSection(html, "mp-itn");
  const bm = extractMpSection(html, "mp-bm");
  const dyk = extractMpSection(html, "mp-dyk");

  const featuredArticle = extractFeaturedBlock(tfa) ?? undefined;
  const goodArticle = extractFeaturedBlock(tfp) ?? undefined;

  const onThisDayItems = extractListItems(itn, 5);
  const onThisDay = onThisDayItems.length
    ? { label: extractOnThisDayLabel(itn), items: onThisDayItems }
    : undefined;

  const didYouKnowItems = extractListItems(bm, 4);
  const didYouKnow = didYouKnowItems.length ? { items: didYouKnowItems } : undefined;

  return {
    date: wikiHomepageDateKey(),
    fetchedAt: new Date().toISOString(),
    featuredArticle,
    goodArticle,
    onThisDay,
    didYouKnow,
    featuredPicture: extractFeaturedPicture(dyk),
  };
}

async function fetchTurkishWikiHomepageHtml(): Promise<string> {
  const api = wikiUrls("tr").api;
  const params = new URLSearchParams({
    action: "parse",
    page: "Anasayfa",
    prop: "text",
    format: "json",
    redirects: "1",
    origin: "*",
  });
  const r = await wikiFetch(`${api}?${params}`);
  if (!r.ok) throw new Error(`Anasayfa HTTP ${r.status}`);
  const d = await r.json() as { parse?: { text?: { "*"?: string } }; error?: { info?: string } };
  if (d.error || !d.parse?.text?.["*"]) {
    throw new Error(String(d.error?.info || "Anasayfa parse failed"));
  }
  return d.parse.text["*"];
}

async function enrichFeaturedBlocks(feed: WikiHomepageFeed): Promise<WikiHomepageFeed> {
  const { rest } = wikiUrls("tr");
  const enrichOne = async (
    block: { title: string; extract: string; thumbnail?: string | null } | undefined,
  ) => {
    if (!block?.title) return block;
    if (block.thumbnail) {
      return { ...block, extract: trimWikiCardExtract(block.extract) };
    }
    try {
      const r = await wikiFetch(`${rest}/page/summary/${encodeWikiRestTitle(block.title)}`);
      if (!r.ok) return block;
      const d = await r.json() as { extract?: string; thumbnail?: { source?: string }; originalimage?: { source?: string } };
      const extract = trimWikiCardExtract(block.extract || String(d.extract ?? "").trim());
      return {
        ...block,
        extract,
        thumbnail: d.thumbnail?.source || block.thumbnail || d.originalimage?.source || null,
      };
    } catch {
      return block;
    }
  };
  return {
    ...feed,
    featuredArticle: (await enrichOne(feed.featuredArticle)) ?? feed.featuredArticle,
    goodArticle: (await enrichOne(feed.goodArticle)) ?? feed.goodArticle,
  };
}

async function canonicalizeHomepageFeedLinks(feed: WikiHomepageFeed): Promise<WikiHomepageFeed> {
  const canonicalTitle = async (title: string | undefined): Promise<string | undefined> => {
    const raw = title?.trim();
    if (!raw) return undefined;
    return (await resolveWikiArticleTitle(raw, "tr")) ?? raw;
  };
  const canonicalItems = async (items: WikiHomepageItem[] | undefined): Promise<WikiHomepageItem[] | undefined> => {
    if (!items?.length) return items;
    return mapWithConcurrency(items, 3, async (item) => ({
      ...item,
      wikiTitle: await canonicalTitle(item.wikiTitle),
    }));
  };

  const [featuredTitle, goodTitle, pictureTitle, onThisDayItems, didYouKnowItems] = await Promise.all([
    canonicalTitle(feed.featuredArticle?.title),
    canonicalTitle(feed.goodArticle?.title),
    canonicalTitle(feed.featuredPicture?.wikiTitle ?? feed.featuredPicture?.title),
    canonicalItems(feed.onThisDay?.items),
    canonicalItems(feed.didYouKnow?.items),
  ]);

  return {
    ...feed,
    featuredArticle: feed.featuredArticle && featuredTitle
      ? { ...feed.featuredArticle, title: featuredTitle }
      : feed.featuredArticle,
    goodArticle: feed.goodArticle && goodTitle
      ? { ...feed.goodArticle, title: goodTitle }
      : feed.goodArticle,
    featuredPicture: feed.featuredPicture && pictureTitle
      ? { ...feed.featuredPicture, wikiTitle: pictureTitle }
      : feed.featuredPicture,
    onThisDay: feed.onThisDay && onThisDayItems
      ? { ...feed.onThisDay, items: onThisDayItems }
      : feed.onThisDay,
    didYouKnow: feed.didYouKnow && didYouKnowItems
      ? { ...feed.didYouKnow, items: didYouKnowItems }
      : feed.didYouKnow,
  };
}

async function fetchTurkishWikiHomepageFeed(): Promise<WikiHomepageFeed> {
  const html = await fetchTurkishWikiHomepageHtml();
  const parsed = parseTurkishWikiHomepageHtml(html);
  if (!hasWikiHomepageBlocks(parsed)) {
    throw new Error("Anasayfa sections empty");
  }
  return canonicalizeHomepageFeedLinks(await enrichFeaturedBlocks(parsed));
}

router.get("/wiki/homepage", async (_req, res): Promise<void> => {
  const dateKey = wikiHomepageDateKey();
  if (wikiHomepageCache?.dateKey === dateKey && hasWikiHomepageBlocks(wikiHomepageCache.data)) {
    res.json({ success: true, data: wikiHomepageCache.data });
    return;
  }
  try {
    const data = await fetchTurkishWikiHomepageFeed();
    wikiHomepageCache = { dateKey, data };
    res.json({ success: true, data });
  } catch {
    const fallback = buildFallbackWikiHomepage(dateKey);
    wikiHomepageCache = { dateKey, data: fallback };
    res.json({ success: true, data: fallback, cached: false, fallback: true });
  }
});

/** Ansiklopedi paylaşım / OG önizlemesi için başlık + özet + görsel. */
export async function getEncyclopediaArticleShareMeta(
  queryTitle: string,
  lang: WikiLang = "tr",
): Promise<{ title: string; summary: string; imageUrl: string | null } | null> {
  const q = queryTitle.trim();
  if (!q) return null;

  const resolved = (await resolveWikiArticleTitle(q, lang)) ?? q;
  const { rest } = wikiUrls(lang);
  try {
    const r = await wikiFetch(`${rest}/page/summary/${encodeWikiRestTitle(resolved)}`);
    if (!r.ok) return null;
    const d = await r.json() as {
      title?: string;
      extract?: string;
      description?: string;
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
    };
    const extract = String(d.extract ?? "").trim();
    const description = String(d.description ?? "").trim();
    const summary = (extract || description).replace(/\s+/g, " ").trim();
    const imageUrl = d.originalimage?.source || d.thumbnail?.source || null;
    return {
      title: String(d.title ?? resolved).trim(),
      summary: summary || String(d.title ?? resolved).trim(),
      imageUrl,
    };
  } catch {
    return null;
  }
}

/* ══════════════════════════════════════════════════════════════════════════
 * Konum bazlı Bilgi Ağacı / Vikipedi özet önbelleği (cache-through)
 *   - GET  /bilgi/location?slug=...&type=il|ulke|sehir|topic&lang=tr
 *   - POST /bilgi/location/seed  (yönetici — 81 il + ülkeler + statik linkler)
 * DB varsa anında servis edilir; yoksa Vikipedi'den çekilip kaydedilir.
 * ══════════════════════════════════════════════════════════════════════════ */

export type LocationWikiPlaceType = "il" | "ulke" | "sehir" | "topic";

/** N günden eski kayıt "stale" sayılır — arka planda tazelenir, ama yine de servis edilir. */
const LOCATION_WIKI_STALE_MS = 1000 * 60 * 60 * 24 * 30;

export type LocationWikiSummary = {
  slug: string;
  type: LocationWikiPlaceType;
  lang: WikiLang;
  title: string;
  summary: string;
  image?: string;
  url?: string;
  lat?: number;
  lng?: number;
  resolvedLang?: WikiLang;
};

let locationWikiCacheTableReady: Promise<void> | null = null;

async function ensureLocationWikiCacheTable(): Promise<void> {
  locationWikiCacheTableReady ??= executeNewsDbWrite(sql`
    CREATE TABLE IF NOT EXISTS location_wiki_cache (
      id serial PRIMARY KEY,
      slug text NOT NULL,
      place_type text NOT NULL DEFAULT 'il',
      lang text NOT NULL DEFAULT 'tr',
      title text NOT NULL,
      extract text NOT NULL DEFAULT '',
      image_url text,
      source_url text,
      lat double precision,
      lng double precision,
      resolved_lang text,
      hit_count integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      refreshed_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS location_wiki_cache_key_unique
      ON location_wiki_cache (lang, place_type, slug);
    CREATE INDEX IF NOT EXISTS location_wiki_cache_refreshed_idx
      ON location_wiki_cache (refreshed_at);
  `);
  await locationWikiCacheTableReady;
}

/** Yer anahtarı slug'ı — ASCII, küçük harf, tireli. */
function normalizeLocationSlug(raw: string): string {
  const primary = String(raw ?? "").split(",")[0]?.trim() || String(raw ?? "").trim();
  return norm(primary)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

function parseLocationPlaceType(raw: unknown): LocationWikiPlaceType {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "ulke" || v === "ülke" || v === "country") return "ulke";
  if (v === "sehir" || v === "şehir" || v === "city") return "sehir";
  if (v === "topic" || v === "konu") return "topic";
  return "il";
}

type LocationWikiCacheRow = {
  title: string;
  summary: string;
  image?: string;
  url?: string;
  lat?: number;
  lng?: number;
  resolvedLang?: WikiLang;
  refreshedAtMs: number;
};

async function readLocationWikiCache(
  slug: string,
  type: LocationWikiPlaceType,
  lang: WikiLang,
): Promise<LocationWikiCacheRow | null> {
  if (!slug) return null;
  try {
    await ensureLocationWikiCacheTable();
    const rows = await getNewsDbForRead().execute(sql`
      SELECT title, extract, image_url, source_url, lat, lng, resolved_lang, refreshed_at
      FROM location_wiki_cache
      WHERE lang = ${lang} AND place_type = ${type} AND slug = ${slug}
      LIMIT 1
    `);
    const row = rows.rows[0] as
      | {
          title?: string;
          extract?: string;
          image_url?: string | null;
          source_url?: string | null;
          lat?: number | null;
          lng?: number | null;
          resolved_lang?: string | null;
          refreshed_at?: string | Date | null;
        }
      | undefined;
    if (!row?.title) return null;
    const summary = String(row.extract ?? "").trim();
    if (!summary) return null;
    const refreshedAtMs = row.refreshed_at ? new Date(row.refreshed_at).getTime() : 0;
    return {
      title: String(row.title),
      summary,
      image: row.image_url ? String(row.image_url) : undefined,
      url: row.source_url ? String(row.source_url) : undefined,
      lat: row.lat != null ? Number(row.lat) : undefined,
      lng: row.lng != null ? Number(row.lng) : undefined,
      resolvedLang: row.resolved_lang === "en" ? "en" : row.resolved_lang === "tr" ? "tr" : undefined,
      refreshedAtMs: Number.isFinite(refreshedAtMs) ? refreshedAtMs : 0,
    };
  } catch {
    return null;
  }
}

async function writeLocationWikiCache(entry: LocationWikiSummary): Promise<void> {
  if (!entry.slug || !entry.title) return;
  try {
    await ensureLocationWikiCacheTable();
    await executeNewsDbWrite(sql`
      INSERT INTO location_wiki_cache
        (slug, place_type, lang, title, extract, image_url, source_url, lat, lng, resolved_lang, hit_count, updated_at, refreshed_at)
      VALUES (
        ${entry.slug}, ${entry.type}, ${entry.lang}, ${entry.title}, ${entry.summary},
        ${entry.image ?? null}, ${entry.url ?? null}, ${entry.lat ?? null}, ${entry.lng ?? null},
        ${entry.resolvedLang ?? entry.lang}, 0, now(), now()
      )
      ON CONFLICT (lang, place_type, slug) DO UPDATE SET
        title = EXCLUDED.title,
        extract = EXCLUDED.extract,
        image_url = EXCLUDED.image_url,
        source_url = EXCLUDED.source_url,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        resolved_lang = EXCLUDED.resolved_lang,
        updated_at = now(),
        refreshed_at = now()
    `);
  } catch (err) {
    console.warn("[location-wiki] kayıt yazılamadı:", err instanceof Error ? err.message : err);
  }
}

function bumpLocationWikiHit(slug: string, type: LocationWikiPlaceType, lang: WikiLang): void {
  void executeNewsDbWrite(sql`
    UPDATE location_wiki_cache
    SET hit_count = hit_count + 1
    WHERE lang = ${lang} AND place_type = ${type} AND slug = ${slug}
  `).catch(() => {});
}

/** Verilen etikete göre tek dilde Vikipedi özeti çeker (başlık çözümlemeli). */
async function fetchLocationSummaryForLang(
  label: string,
  type: LocationWikiPlaceType,
  lang: WikiLang,
): Promise<Omit<LocationWikiSummary, "slug" | "type" | "lang"> | null> {
  const provinceTitle = type === "il" && lang === "tr" ? resolveTurkishProvinceWikiTitle(label) : null;
  const resolvedTitle = provinceTitle ?? (await resolveWikiArticleTitle(label, lang)) ?? label;
  const { rest } = wikiUrls(lang);
  try {
    const r = await wikiFetch(`${rest}/page/summary/${encodeWikiRestTitle(resolvedTitle)}`);
    if (!r.ok) return null;
    const d = (await r.json()) as {
      title?: string;
      type?: string;
      extract?: string;
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
      coordinates?: { lat?: number; lon?: number };
    };
    if (d.type === "disambiguation") return null;
    const summary = String(d.extract ?? "").replace(/\s+/g, " ").trim();
    if (!summary) return null;
    const title = String(d.title ?? resolvedTitle).trim() || resolvedTitle;
    return {
      title,
      summary,
      image: d.thumbnail?.source || d.originalimage?.source || undefined,
      url: wikiArticleUrl(title, lang),
      lat: typeof d.coordinates?.lat === "number" ? d.coordinates.lat : undefined,
      lng: typeof d.coordinates?.lon === "number" ? d.coordinates.lon : undefined,
      resolvedLang: lang,
    };
  } catch {
    return null;
  }
}

/** Vikipedi'den çek (TR → EN yedek), DB'ye yaz, döndür. */
async function resolveAndCacheLocationWiki(
  label: string,
  slug: string,
  type: LocationWikiPlaceType,
  requestedLang: WikiLang,
): Promise<LocationWikiSummary | null> {
  const langOrder: WikiLang[] = requestedLang === "en" ? ["en", "tr"] : ["tr", "en"];
  for (const lang of langOrder) {
    const hit = await fetchLocationSummaryForLang(label, type, lang);
    if (hit) {
      const entry: LocationWikiSummary = { slug, type, lang: requestedLang, ...hit };
      await writeLocationWikiCache(entry);
      return entry;
    }
  }
  return null;
}

function toLocationResponse(slug: string, type: LocationWikiPlaceType, lang: WikiLang, row: LocationWikiCacheRow) {
  return {
    slug,
    type,
    lang,
    title: row.title,
    summary: row.summary,
    image: row.image,
    url: row.url,
    lat: row.lat,
    lng: row.lng,
  };
}

router.get("/bilgi/location", async (req, res): Promise<void> => {
  try {
    const rawSlug = String(req.query.slug ?? req.query.q ?? req.query.name ?? "").trim();
    if (!rawSlug) {
      res.status(400).json({ success: false, error: "slug parametresi gerekli" });
      return;
    }
    const type = parseLocationPlaceType(req.query.type);
    const lang = parseWikiLang(req.query.lang as string | undefined);
    const label = String(req.query.label ?? req.query.name ?? rawSlug).trim() || rawSlug;
    const slug = normalizeLocationSlug(rawSlug);
    if (!slug) {
      res.status(400).json({ success: false, error: "geçersiz slug" });
      return;
    }

    const cached = await readLocationWikiCache(slug, type, lang);
    if (cached) {
      bumpLocationWikiHit(slug, type, lang);
      const stale = Date.now() - cached.refreshedAtMs > LOCATION_WIKI_STALE_MS;
      if (stale) {
        // Bayat kayıt yine anında servis edilir; tazeleme arka planda yapılır.
        void resolveAndCacheLocationWiki(label, slug, type, lang).catch(() => {});
      }
      res.json({ success: true, cached: true, stale, data: toLocationResponse(slug, type, lang, cached) });
      return;
    }

    const fresh = await resolveAndCacheLocationWiki(label, slug, type, lang);
    if (!fresh) {
      res.status(404).json({ success: false, error: "Bu konum için özet bulunamadı" });
      return;
    }
    res.json({
      success: true,
      cached: false,
      stale: false,
      data: {
        slug,
        type,
        lang,
        title: fresh.title,
        summary: fresh.summary,
        image: fresh.image,
        url: fresh.url,
        lat: fresh.lat,
        lng: fresh.lng,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

export type LocationWikiSeedResult = {
  scanned: number;
  filled: number;
  skipped: number;
  failed: number;
};

type LocationSeedTarget = { label: string; slug: string; type: LocationWikiPlaceType };

function buildLocationSeedTargets(): LocationSeedTarget[] {
  const targets: LocationSeedTarget[] = [];
  const seen = new Set<string>();
  const add = (label: string, type: LocationWikiPlaceType) => {
    const slug = normalizeLocationSlug(label);
    if (!slug) return;
    const key = `${type}:${slug}`;
    if (seen.has(key)) return;
    seen.add(key);
    targets.push({ label, slug, type });
  };
  for (const name of TR_PROVINCE_NAMES_81) add(name, "il");
  for (const country of WORLD_COUNTRIES) add(country.wikiTitle ?? country.name, "ulke");
  for (const topic of BILGI_AGACI_STATIC_TOPICS) add(topic, "topic");
  return targets;
}

/**
 * 81 il + dünya ülkeleri + /bilgiagaci statik linklerini konum önbelleğine tohumlar.
 * İdempotent: `onlyMissing` (varsayılan) mevcut kayıtları atlar.
 */
export async function seedLocationWikiCache(options?: {
  onlyMissing?: boolean;
  lang?: WikiLang;
  concurrency?: number;
  log?: (message: string) => void;
}): Promise<LocationWikiSeedResult> {
  const onlyMissing = options?.onlyMissing ?? true;
  const lang: WikiLang = options?.lang === "en" ? "en" : "tr";
  const concurrency = Math.max(1, Math.min(6, options?.concurrency ?? 3));
  const log = options?.log ?? (() => {});

  await ensureLocationWikiCacheTable();
  const targets = buildLocationSeedTargets();
  const result: LocationWikiSeedResult = { scanned: targets.length, filled: 0, skipped: 0, failed: 0 };

  await mapWithConcurrency(targets, concurrency, async (target) => {
    try {
      if (onlyMissing) {
        const existing = await readLocationWikiCache(target.slug, target.type, lang);
        if (existing) {
          result.skipped += 1;
          return;
        }
      }
      const fresh = await resolveAndCacheLocationWiki(target.label, target.slug, target.type, lang);
      if (fresh) result.filled += 1;
      else result.failed += 1;
    } catch {
      result.failed += 1;
    }
  });

  log(
    `[location-wiki] tohumlama: taranan=${result.scanned} eklenen=${result.filled} atlanan=${result.skipped} başarısız=${result.failed}`,
  );
  return result;
}

router.post("/bilgi/location/seed", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const force = String(req.query.force ?? req.body?.force ?? "") === "1";
  const wait = String(req.query.wait ?? req.body?.wait ?? "") === "1";
  const lang: WikiLang = parseWikiLang(String(req.query.lang ?? req.body?.lang ?? ""));
  const runOptions = { onlyMissing: !force, lang, log: (m: string) => console.log(m) };

  if (wait) {
    try {
      const result = await seedLocationWikiCache(runOptions);
      res.json({ success: true, mode: "sync", result });
    } catch (e) {
      res.status(500).json({ success: false, error: String(e) });
    }
    return;
  }

  // Arka planda çalıştır — istek hemen döner (idempotent upsert).
  void seedLocationWikiCache(runOptions).catch((err) => {
    console.warn("[location-wiki] arka plan tohumlama hatası:", err instanceof Error ? err.message : err);
  });
  res.json({ success: true, mode: "background", message: "Konum önbelleği tohumlaması başlatıldı." });
});

export default router;
