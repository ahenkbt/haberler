/**
 * Wayback Machine (`vatankahramanlari.org.tr`) haberleri → HM `news` (site slug `vkd`).
 *
 * Dedupe: `rssSourceUrl = vkd-wayback:<canonical>` + başlık + slug.
 * Görseller Wayback `im_/` adresiyle indirilip `/api/media/uploads/…` olarak yeniden barındırılır.
 */
/** VKD kurumsal vitrin kategorileri — `hm-corporate-news-policy` ile aynı. */
export const VKD_WAYBACK_CATEGORY_SLUGS = ["dernegimiz", "faaliyetlerimiz", "sehit-gazi"] as const;

function slugify(input: string, max = 160): string {
  return input
    .toLowerCase()
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[çÇ]/g, "c")
    .replace(/[öÖ]/g, "o")
    .replace(/[üÜ]/g, "u")
    .replace(/[ğĞ]/g, "g")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max) || "haber";
}

export const VKD_WAYBACK_SOURCE_PREFIX = "vkd-wayback:";
export const VKD_WAYBACK_TAG = "vkd-wayback";
export const VKD_WAYBACK_DEFAULT_SITE_SLUG = "vkd";
export const VKD_WAYBACK_DEFAULT_SITE_ID = 7;
export const VKD_WAYBACK_PREFERRED_SNAPSHOT = "20250806055214";
export const VKD_LEGACY_HOSTS = ["vatankahramanlari.org.tr", "www.vatankahramanlari.org.tr"] as const;

/** Coordinator inventory — 47 slugs to publish to HM siteId 7. */
export const VKD_WAYBACK_INVENTORY_SLUGS = [
  "abb-kultur-ve-tabiat-varliklari-daire-baskanina-ziyaret",
  "ak-parti-genel-merkezine-hayirli-olsun-ziyareti",
  "ampute-milli-takimimiz-kirsehir-de-kampa-girdi",
  "askeri-ucagimiz-dustu-20-askerimiz-sehit-oldu",
  "azerbaycanli-gazilerden-vatan-kahramanlari-dernegi-ne-anlamli-ziyaret",
  "aziz-milletimizin-basi-sagolsun",
  "baskent-e-deger-odulleri",
  "dyp-genel-baskani-cenk-kupeli-ye-ziyaret",
  "erbilin-turk-kimligi-ve-tarihi-gercekler",
  "gazeteciler-cemiyetini-ziyaret-ettik",
  "gazi-ismail-temiz-den-jandarma-albay-atilla-kilinckaya-ya-ziyaret",
  "gazi-ismail-temiz-den-tedas-genel-mudur-yardimcisi-dr-mehmet-erdogan-a-ziyaret",
  "gazi-ismail-temiz-in-kizi-dunyaevine-girdi",
  "genel-baskan-mustafa-ozdemir-ile-roportaj",
  "i-balkan-savasi-ve-bulgar-ordusunda-ermeni-boelugu",
  "ismimize-benzer-dernek-uyarisi",
  "kahramanlarin-izinde-vatanin-hizmetindeyiz",
  "kibris-gazisi-sadik-coskun-hayatini-kaybetti",
  "kultur-ve-turizm-bakan-yardimcisi-gokhan-yazgi-ya-ziyaret",
  "kultur-ve-turizm-bakanimizla-bir-araya-geldik",
  "kulturun-tasiyicisi-olmaya-devam-ediyoruz",
  "mhp-genel-baskan-yardimicisi-prof-dr-ahmet-selim-yurdakul-a-ziyaret",
  "milletimizin-basi-sag-olsun",
  "mugla-milletvekili-selcuk-ozdag-i-ziyaret",
  "mustafa-ozdemir-siyasi-partilerle-bayramlasti",
  "omuz-omuza-bir-omur-elveda-silah-arkadasim",
  "onursal-uyeler",
  "oz-metal-is-sendikasi-ndan-vatan-kahramanlari-dernegi-ne-anlamli-ziyaret",
  "rusyanin-dagistan-boelgesinde-art-arda-silahli-saldirilar-15i-polis-toplam-19-kisi-hayatini-kaybetti",
  "sehit-aileleri-federasyonu-na-ziyaret",
  "trt-yoneticileri-ve-sanatcilarla-anlamli-bulusma",
  "turizm-dunyasinin-uluslararasi-temsilcileri-ankara-ordu-evi-nde-agirlandi",
  "turk-kadini-nin-gururu-astsubay-busra-bilge-demir",
  "turk-kara-ordusu-ne-zaman-kuruldu",
  "turkiye-ampute-milli-futbol-takimimiz-amp-futbol-cup-2025-te-sampiyon-oldu",
  "vakif-haftasi-etkinlikleri",
  "vatan-kahramanlari-dernegi",
  "vatan-kahramanlari-dernegi-arama-kurtarma-teskilati",
  "vatan-kahramanlari-dernegi-baskani-mustafa-ozdemir-den-15-temmuz-mesaji",
  "vatan-kahramanlari-dernegi-herkese-acik-her-zaman-hazir",
  "vatan-kahramanlari-dernegi-nden-adana-cikarmasi",
  "vatan-kahramanlari-dernegi-nden-federasyon-karari",
  "vatan-kahramanlari-dernegi-ne-ziyaretler-suruyor",
  "vatan-kahramanlari-dernegi-sehit-yakinlari-ve-gaziler-baskanligi",
  "vatan-kahramanlari-dernegi-vatan-kahramanlari-savunma-hizmetleri-ltd-sti",
  "yeni-yiliniz-kutlu-olsun",
  "yesil-vatan-turkiye-agaclandirma-merkezi",
] as const;

const VKD_INVENTORY_SLUG_SET = new Set<string>(VKD_WAYBACK_INVENTORY_SLUGS);

export type VkdWaybackCategorySlug = (typeof VKD_WAYBACK_CATEGORY_SLUGS)[number];

export type VkdWaybackArticle = {
  title: string;
  slug: string;
  canonicalUrl: string;
  sourceUrl: string;
  timestamp: string;
  date: string | null;
  dateLabel: string | null;
  categorySlug: VkdWaybackCategorySlug;
  spot: string | null;
  content: string;
  featuredImageUrl: string | null;
  bodyImageUrls: string[];
};

export type VkdWaybackPayload = {
  version: 1;
  type: "vkd-wayback-haber";
  sourceHost: string;
  snapshot: string;
  crawledAt: string;
  items: VkdWaybackArticle[];
};

export type VkdWaybackImportPreviewItem = {
  title: string;
  slug: string;
  categorySlug: string;
  date?: string | null;
  hasFeaturedImage: boolean;
  imageCountInBody: number;
  canonicalUrl: string;
  skipReason?: string;
};

export type VkdWaybackImportResult = {
  itemsTotal: number;
  itemsProcessed: number;
  newsAdded: number;
  newsSkipped: number;
  skippedDuplicates: number;
  imagesDownloaded: number;
  imagesFailed: number;
  warnings: string[];
  preview?: VkdWaybackImportPreviewItem[];
};

const MONTHS: Record<string, number> = {
  ocak: 1,
  subat: 2,
  mart: 3,
  nisan: 4,
  mayis: 5,
  haziran: 6,
  temmuz: 7,
  agustos: 8,
  eylul: 9,
  ekim: 10,
  kasim: 11,
  aralik: 12,
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  ouml: "ö",
  Ouml: "Ö",
  uuml: "ü",
  Uuml: "Ü",
  ccedil: "ç",
  Ccedil: "Ç",
  gbreve: "ğ",
  Gbreve: "Ğ",
  scedil: "ş",
  Scedil: "Ş",
  iuml: "ï",
  Iuml: "Ï",
};

const SKIP_IMAGE_RE =
  /\/(?:logo|diller|favicon|assets|css|js|vendor|font-icons|pwa)\b|\/uploads\/logo\//i;
const CONTENT_IMAGE_RE =
  /\/uploads\/haberler\/|\/haber\/uploads\/images\/|\/uploads\/images\/|\/wp-content\/uploads\/|\/tema\/belediye\/uploads\/(?!logo|diller|favicon)/i;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function decodeHtmlEntities(raw: string): string {
  return String(raw ?? "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, ent: string) => {
      const key = String(ent);
      if (key[0] === "#") {
        const n = key[1] === "x" || key[1] === "X" ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : all;
      }
      return NAMED_ENTITIES[key] ?? NAMED_ENTITIES[key.toLowerCase()] ?? all;
    })
    .replace(/\u00a0/g, " ");
}

export function normalizeNewsTitle(title: string): string {
  return decodeHtmlEntities(String(title ?? ""))
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function waybackSourceKey(canonicalUrl: string): string {
  return `${VKD_WAYBACK_SOURCE_PREFIX}${normalizeVkdCanonicalUrl(canonicalUrl) ?? canonicalUrl.trim()}`;
}

export function isVkdWaybackSourceRef(raw: string | null | undefined): boolean {
  return String(raw ?? "").trim().startsWith(VKD_WAYBACK_SOURCE_PREFIX);
}

export function normalizeVkdCanonicalUrl(raw: string): string | null {
  const cleaned = decodeHtmlEntities(String(raw ?? "").trim());
  if (!cleaned) return null;
  const stripped = cleaned
    .replace(/^https?:\/\/web\.archive\.org\/web\/\d{8,14}(?:id_|im_|js_|cs_)?\//i, "")
    .replace(/^\/web\/\d{8,14}(?:id_|im_|js_|cs_)?\//i, "");
  let href = stripped;
  if (href.startsWith("//")) href = `https:${href}`;
  try {
    const u = new URL(href, "https://vatankahramanlari.org.tr/");
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "vatankahramanlari.org.tr") return null;
    u.protocol = "https:";
    u.hostname = "vatankahramanlari.org.tr";
    u.hash = "";
    u.search = "";
    let path = u.pathname.replace(/\/+/g, "/");
    if (!path.startsWith("/")) path = `/${path}`;
    return `https://vatankahramanlari.org.tr${path}`;
  } catch {
    return null;
  }
}

export function haberSlugFromPath(pathname: string): string | null {
  const m = String(pathname ?? "")
    .toLowerCase()
    .match(/^\/haber\/([^/]+?)(?:\.html)?$/i);
  if (!m?.[1]) return null;
  const slug = decodeURIComponent(m[1]).replace(/\.html$/i, "").toLowerCase();
  return slug && slug !== "haber" ? slug : null;
}

export function isVkdHaberArticleUrl(raw: string): boolean {
  const canonical = normalizeVkdCanonicalUrl(raw);
  if (!canonical) return false;
  const path = new URL(canonical).pathname.toLowerCase();
  if (path === "/haber" || path === "/haber/" || path === "/haberler.html") return false;
  if (path.includes("/haber/assets/") || path.includes("/haber/uploads/") || path.includes("/haber/manifest")) {
    return false;
  }
  const slug = haberSlugFromPath(path);
  if (slug && VKD_INVENTORY_SLUG_SET.has(slug)) return true;
  return /^\/haber\/[a-z0-9][a-z0-9-]*\.html$/i.test(path);
}

export function slugFromVkdHaberUrl(raw: string): string | null {
  const canonical = normalizeVkdCanonicalUrl(raw);
  if (!canonical) return null;
  const rawSlug = haberSlugFromPath(new URL(canonical).pathname);
  if (!rawSlug) return null;
  if (VKD_INVENTORY_SLUG_SET.has(rawSlug)) return rawSlug;
  const slug = slugify(rawSlug);
  return slug && slug !== "haber" ? slug : null;
}

export function inventoryCanonicalUrls(): string[] {
  return VKD_WAYBACK_INVENTORY_SLUGS.flatMap((slug) => [
    `https://vatankahramanlari.org.tr/haber/${slug}.html`,
    `https://vatankahramanlari.org.tr/haber/${slug}`,
  ]);
}

export function waybackReplayUrl(timestamp: string, original: string, modifier = ""): string {
  const ts = String(timestamp || VKD_WAYBACK_PREFERRED_SNAPSHOT).replace(/\D/g, "").slice(0, 14);
  return `https://web.archive.org/web/${ts}${modifier}/${original}`;
}

export function fixBrokenVkdHostPath(url: string): string {
  return String(url ?? "").replace(
    /(https?:\/\/(?:www\.)?vatankahramanlari\.org\.tr)(?!\/)(?=[a-z])/i,
    "$1/",
  );
}

export function isVkdContentImageUrl(url: string): boolean {
  const u = String(url ?? "");
  if (!u || SKIP_IMAGE_RE.test(u)) return false;
  if (CONTENT_IMAGE_RE.test(u)) return true;
  return /\/tema\/belediye\/uploads\/haberler\//i.test(u);
}

export function toWaybackImageUrl(src: string, timestamp: string, pageUrl?: string): string | null {
  let raw = fixBrokenVkdHostPath(decodeHtmlEntities(String(src ?? "").trim()));
  if (!raw || raw.startsWith("data:") || raw.startsWith("javascript:")) return null;
  raw = raw.replace(/^https?:\/\/web-static\.archive\.org\//i, "");
  if (raw.startsWith("//")) raw = `https:${raw}`;

  const archivePath = raw.match(/^(?:https?:\/\/web\.archive\.org)?(\/web\/\d{8,14}(?:id_|im_|js_|cs_)?\/.+)$/i);
  if (archivePath?.[1]) raw = `https://web.archive.org${archivePath[1]}`;

  if (/^https?:\/\/web\.archive\.org\/web\//i.test(raw)) {
    raw = raw.replace(/\/web\/(\d{8,14})(?:id_|js_|cs_)?\//i, "/web/$1im_/");
    return isVkdContentImageUrl(raw) ? raw : null;
  }

  let absolute: string | null = null;
  try {
    const base = "https://vatankahramanlari.org.tr/";
    const u = new URL(raw, base);
    if (/vatankahramanlari\.org\.tr$/i.test(u.hostname)) {
      u.protocol = "https:";
      u.hostname = "vatankahramanlari.org.tr";
      absolute = u.toString();
    } else {
      return null;
    }
  } catch {
    return null;
  }
  if (!absolute || !isVkdContentImageUrl(absolute)) return null;
  const ts = String(timestamp || VKD_WAYBACK_PREFERRED_SNAPSHOT).replace(/\D/g, "").slice(0, 14);
  return waybackReplayUrl(ts, absolute, "im_");
}

/** Wayback `im_/` when the file is on the old VKD host; otherwise keep an off-host https URL for R2 rehost. */
export function resolveImportableImageUrl(src: string, timestamp: string, pageUrl?: string): string | null {
  const archived = toWaybackImageUrl(src, timestamp, pageUrl);
  if (archived) return archived;
  let raw = fixBrokenVkdHostPath(decodeHtmlEntities(String(src ?? "").trim()));
  if (!raw || raw.startsWith("data:") || raw.startsWith("javascript:")) return null;
  if (raw.startsWith("//")) raw = `https:${raw}`;
  try {
    const u = new URL(raw, "https://vatankahramanlari.org.tr/");
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "vatankahramanlari.org.tr" || host.endsWith(".archive.org")) return null;
    if (!/^https?:$/i.test(u.protocol) || SKIP_IMAGE_RE.test(u.href)) return null;
    return u.href;
  } catch {
    return null;
  }
}

export function parseTurkishDateLabel(label: string): Date | null {
  const raw = decodeHtmlEntities(String(label ?? "")).replace(/\s+/g, " ").trim();
  if (!raw) return null;
  const m = raw.match(
    /^(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/,
  );
  if (!m) return null;
  const monthKey = slugify(m[2] ?? "");
  const month = MONTHS[monthKey];
  if (!month) return null;
  const day = Number(m[1]);
  const year = Number(m[3]);
  const hour = m[4] != null ? Number(m[4]) : 12;
  const minute = m[5] != null ? Number(m[5]) : 0;
  const d = new Date(Date.UTC(year, month - 1, day, hour - 3, minute, 0));
  return Number.isFinite(d.getTime()) ? d : null;
}

export function parseFlexibleDate(raw: string): Date | null {
  const labeled = parseTurkishDateLabel(raw);
  if (labeled) return labeled;
  const m = String(raw ?? "")
    .trim()
    .match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/,
    );
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const hour = Number(m[4]);
    const minute = Number(m[5]);
    const second = Number(m[6] ?? 0);
    if (m[7]) {
      const d = new Date(String(raw).trim().replace(" ", "T"));
      return Number.isFinite(d.getTime()) ? d : null;
    }
    const d = new Date(Date.UTC(year, month - 1, day, hour - 3, minute, second));
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const d = new Date(String(raw ?? "").trim());
  return Number.isFinite(d.getTime()) ? d : null;
}

function foldTrText(raw: string): string {
  return decodeHtmlEntities(String(raw ?? ""))
    .replace(/<[^>]+>/g, " ")
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .replace(/ı/g, "i")
    .replace(/Ş/g, "s")
    .replace(/ş/g, "s")
    .replace(/Ç/g, "c")
    .replace(/ç/g, "c")
    .replace(/Ğ/g, "g")
    .replace(/ğ/g, "g")
    .replace(/Ö/g, "o")
    .replace(/ö/g, "o")
    .replace(/Ü/g, "u")
    .replace(/ü/g, "u")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapVkdWaybackCategory(title: string, _content = ""): VkdWaybackCategorySlug {
  const titleFold = foldTrText(title);
  if (
    /sehit|gazi|15 temmuz|sagolsun|basi sag|silah arkadas|hayatini kaybet|ebediyet/.test(titleFold)
  ) {
    return "sehit-gazi";
  }
  if (
    /federasyon karari|tuzuk|onursal uye|savunma hizmetleri ltd|ismimize benzer|dernek uyarisi/.test(
      titleFold,
    ) ||
    titleFold === "vatan kahramanlari dernegi"
  ) {
    return "dernegimiz";
  }
  return "faaliyetlerimiz";
}

function metaContent(html: string, property: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
    "i",
  );
  const m = html.match(re);
  if (m?.[1]) return decodeHtmlEntities(m[1]).trim();
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
    "i",
  );
  const m2 = html.match(re2);
  return m2?.[1] ? decodeHtmlEntities(m2[1]).trim() : "";
}

function extractByClass(html: string, className: string): string | null {
  const startRe = new RegExp(
    `<(div|section)([^>]*\\bclass=["'][^"']*\\b${className}\\b[^"']*["'][^>]*)>`,
    "i",
  );
  const m = startRe.exec(html);
  if (!m) return null;
  const tag = m[1] ?? "div";
  let i = m.index + m[0].length;
  let depth = 1;
  const openRe = new RegExp(`<${tag}\\b`, "i");
  const closeRe = new RegExp(`</${tag}>`, "i");
  while (i < html.length && depth > 0) {
    const rest = html.slice(i);
    const nextOpen = rest.search(openRe);
    const nextClose = rest.search(closeRe);
    if (nextClose < 0) return html.slice(m.index + m[0].length);
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      i += nextOpen + tag.length + 1;
    } else {
      depth -= 1;
      if (depth === 0) return html.slice(m.index + m[0].length, i + nextClose);
      i += nextClose + tag.length + 3;
    }
  }
  return null;
}

function cutBeforeClass(html: string, className: string): string {
  const re = new RegExp(`<div[^>]*class=["'][^"']*\\b${className}\\b`, "i");
  const idx = html.search(re);
  return idx >= 0 ? html.slice(0, idx) : html;
}

function stripCmsChrome(html: string): string {
  let out = String(html ?? "");
  out = cutBeforeClass(out, "otherNews");
  out = cutBeforeClass(out, "innerGalleryDetail");
  out = cutBeforeClass(out, "addthis_inline_share_toolbox_34zm");
  out = out
    .replace(/<div[^>]*class=["'][^"']*\bpost-img\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i, "")
    .replace(/<div[^>]*class=["'][^"']*\bpost-meta\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i, "")
    .replace(/<div[^>]*class=["'][^"']*\b(?:bn-content|col-bn-ds)\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "");
  return out
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<div[^>]*class=["'][^"']*addthis[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<span[^>]*class=["'][^"']*meta-[^"']*["'][\s\S]*?<\/span>/gi, "")
    .replace(/<p>(?:\s|&nbsp;)*<\/p>/gi, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, ">\n<")
    .trim();
}

function firstImgSrc(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1]?.trim() || null;
}

function collectHrefAndImg(html: string): string[] {
  const out: string[] = [];
  const re = /(?:src|href)=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const u = m[1]?.trim();
    if (u) out.push(u);
  }
  return out;
}

function rewriteContentImages(html: string, timestamp: string, pageUrl: string): { html: string; urls: string[] } {
  const urls: string[] = [];
  const seen = new Set<string>();
  const next = html.replace(/<img\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>/gi, (all, pre: string, src: string, post: string) => {
    const rewritten = resolveImportableImageUrl(src, timestamp, pageUrl);
    if (!rewritten) return "";
    if (!seen.has(rewritten)) {
      seen.add(rewritten);
      urls.push(rewritten);
    }
    return `<img${pre}src="${rewritten}"${post}>`;
  });
  return { html: next.replace(/<img\b[^>]*>\s*/gi, (tag) => (tag.includes("src=") ? tag : "")), urls };
}

function textSpot(html: string, max = 500): string | null {
  const plain = decodeHtmlEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  return plain ? plain.slice(0, max) : null;
}

export function extractVkdWaybackArticle(
  html: string,
  opts: { originalUrl: string; timestamp: string },
): VkdWaybackArticle | null {
  const canonical = normalizeVkdCanonicalUrl(opts.originalUrl);
  if (!canonical || !isVkdHaberArticleUrl(canonical)) return null;
  const timestamp = String(opts.timestamp || VKD_WAYBACK_PREFERRED_SNAPSHOT).replace(/\D/g, "").slice(0, 14);
  const raw = String(html ?? "");
  if (!raw || /<title[^>]*>\s*Wayback Machine\s*<\/title>/i.test(raw) && !/innerPageNewsDetail|og:title/i.test(raw)) {
    return null;
  }

  const belediyeDetail = extractByClass(raw, "innerPageNewsDetail") ?? "";
  const newspaperDetail =
    extractByClass(raw, "post-text") ?? extractByClass(raw, "post-content") ?? "";
  const detail = belediyeDetail.trim() ? belediyeDetail : newspaperDetail;
  const pageTitle =
    extractByClass(raw, "innerPageContent")
      ?.match(/<div[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>\s*<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ??
    raw.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ??
    "";
  const title = decodeHtmlEntities(
    (pageTitle || metaContent(raw, "og:title") || raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  )
    .replace(/\s*[|\-–]\s*Vatan Kahramanlar[ıi] Derneğ[iı].*$/i, "")
    .trim();
  if (!title) return null;
  const urlSlug = slugFromVkdHaberUrl(canonical);
  if (slugify(title) === "vatan-kahramanlari-dernegi" && !detail.trim() && urlSlug !== "vatan-kahramanlari-dernegi") {
    return null;
  }

  const dateLabel = decodeHtmlEntities(
    (detail.match(/<span[^>]*class=["'][^"']*meta-date[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "")
      .replace(/<[^>]+>/g, " ")
      .trim(),
  ) || null;
  const publishedMeta = metaContent(raw, "article:published_time") || metaContent(raw, "article:modified_time");
  const when = dateLabel
    ? parseTurkishDateLabel(dateLabel)
    : publishedMeta
      ? parseFlexibleDate(publishedMeta)
      : null;

  const postImg =
    extractByClass(detail, "post-img") ??
    extractByClass(raw, "post-img") ??
    extractByClass(raw, "post-image") ??
    "";
  const gallery = extractByClass(detail, "innerGalleryDetail") ?? "";
  const featuredRaw =
    firstImgSrc(postImg) ||
    metaContent(raw, "og:image") ||
    collectHrefAndImg(gallery).find((u) => !/\/kucuk\//i.test(u)) ||
    null;
  const featuredImageUrl = featuredRaw ? resolveImportableImageUrl(featuredRaw, timestamp, canonical) : null;

  let body = stripCmsChrome(detail);
  if (!body) {
    const paragraphs = raw.match(/<p\b[\s\S]*?<\/p>/gi) ?? [];
    body = paragraphs.slice(0, 12).join("\n");
  }
  body = decodeHtmlEntities(body);
  const rewritten = rewriteContentImages(body, timestamp, canonical);
  const galleryFull = collectHrefAndImg(gallery)
    .map((u) => resolveImportableImageUrl(u, timestamp, canonical))
    .filter((u): u is string => !!u && !/\/kucuk\//i.test(u));
  const extraFigs = galleryFull
    .filter((u) => u !== featuredImageUrl && !rewritten.urls.includes(u))
    .map((u) => `<p><img src="${u}" alt="${title.replace(/"/g, "&quot;")}"></p>`);
  let content = [rewritten.html, ...extraFigs].filter(Boolean).join("\n").trim();
  content = content.replace(/(<p>\s*<\/p>\s*)+/g, "");
  if (!content) content = `<p>${title}</p>`;

  const bodyImageUrls = [...new Set([...rewritten.urls, ...galleryFull, featuredImageUrl].filter((u): u is string => !!u))];
  const slug = urlSlug || slugify(title);
  const categorySlug = mapVkdWaybackCategory(title, content);

  return {
    title,
    slug,
    canonicalUrl: canonical,
    sourceUrl: waybackReplayUrl(timestamp, canonical),
    timestamp,
    date: when ? when.toISOString() : publishedMeta ? publishedMeta : null,
    dateLabel: dateLabel || (publishedMeta ? publishedMeta : null),
    categorySlug,
    spot: textSpot(content),
    content,
    featuredImageUrl,
    bodyImageUrls,
  };
}

export function emptyVkdWaybackPayload(snapshot = VKD_WAYBACK_PREFERRED_SNAPSHOT): VkdWaybackPayload {
  return {
    version: 1,
    type: "vkd-wayback-haber",
    sourceHost: "vatankahramanlari.org.tr",
    snapshot,
    crawledAt: new Date().toISOString(),
    items: [],
  };
}

export function parseVkdWaybackPayload(raw: unknown): VkdWaybackPayload {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const itemsIn = Array.isArray(obj.items) ? obj.items : [];
  const items: VkdWaybackArticle[] = [];
  const seen = new Set<string>();
  for (const row of itemsIn) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const canonical = normalizeVkdCanonicalUrl(String(r.canonicalUrl ?? r.link ?? "")) ?? "";
    const title = decodeHtmlEntities(String(r.title ?? "")).trim();
    if (!title || !canonical || !isVkdHaberArticleUrl(canonical)) continue;
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    const rawSlug = String(r.slug ?? "").trim().toLowerCase();
    const slug = VKD_INVENTORY_SLUG_SET.has(rawSlug)
      ? rawSlug
      : slugify(rawSlug || slugFromVkdHaberUrl(canonical) || title);
    const content = String(r.content ?? `<p>${title}</p>`);
    const categorySlug = mapVkdWaybackCategory(title, content);
    const bodyImageUrls = Array.isArray(r.bodyImageUrls)
      ? r.bodyImageUrls.map((u) => String(u)).filter(Boolean)
      : [];
    items.push({
      title,
      slug,
      canonicalUrl: canonical,
      sourceUrl: String(r.sourceUrl ?? waybackReplayUrl(String(r.timestamp ?? VKD_WAYBACK_PREFERRED_SNAPSHOT), canonical)),
      timestamp: String(r.timestamp ?? VKD_WAYBACK_PREFERRED_SNAPSHOT),
      date: r.date ? String(r.date) : null,
      dateLabel: r.dateLabel ? String(r.dateLabel) : null,
      categorySlug,
      spot: r.spot ? String(r.spot) : null,
      content,
      featuredImageUrl: r.featuredImageUrl ? String(r.featuredImageUrl) : null,
      bodyImageUrls,
    });
  }
  return {
    version: 1,
    type: "vkd-wayback-haber",
    sourceHost: String(obj.sourceHost ?? "vatankahramanlari.org.tr"),
    snapshot: String(obj.snapshot ?? VKD_WAYBACK_PREFERRED_SNAPSHOT),
    crawledAt: String(obj.crawledAt ?? new Date().toISOString()),
    items,
  };
}

function articleKeepScore(item: VkdWaybackArticle): number {
  return (
    (item.content?.length ?? 0) +
    (item.featuredImageUrl ? 10_000 : 0) +
    (item.canonicalUrl.endsWith(".html") ? 100 : 0)
  );
}

export function mergeVkdWaybackArticles(lists: VkdWaybackArticle[][]): VkdWaybackArticle[] {
  const byKey = new Map<string, VkdWaybackArticle>();
  for (const list of lists) {
    for (const item of list) {
      const key = item.slug || item.canonicalUrl;
      const prev = byKey.get(key);
      if (!prev || articleKeepScore(item) > articleKeepScore(prev)) {
        byKey.set(key, item);
      }
    }
  }
  return [...byKey.values()].sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")));
}

export function extractHaberLinksFromHtml(html: string): string[] {
  const hrefs = String(html ?? "").match(/href=["']([^"']+)["']/gi) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of hrefs) {
    const href = raw.replace(/^href=["']|["']$/gi, "");
    const canonical = normalizeVkdCanonicalUrl(href);
    if (!canonical || !isVkdHaberArticleUrl(canonical) || seen.has(canonical)) continue;
    seen.add(canonical);
    out.push(canonical);
  }
  return out;
}

export type VkdCdxRow = { timestamp: string; original: string };

function imageStem(pathOrUrl: string): string {
  const path = String(pathOrUrl ?? "").split("?")[0] ?? "";
  const base = decodeURIComponent(path.split("/").pop() ?? "");
  return foldTrText(base.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/_\d+$/, ""));
}

function imageFolderRank(url: string): number {
  const u = url.toLowerCase();
  if (u.includes("/haberler/anasayfa/")) return 0;
  if (u.includes("/haberler/manset/")) return 1;
  if (u.includes("/haberler/kucuk/")) return 3;
  return 2;
}

export function resolveVkdArchivedImage(opts: {
  slug: string;
  extractedUrl?: string | null;
  catalog: VkdCdxRow[];
}): string | null {
  const slugFold = foldTrText(opts.slug);
  if (!slugFold || !opts.catalog.length) {
    return opts.extractedUrl ?? null;
  }
  const slugTokens = slugFold.split(" ").filter((t) => t.length >= 2);
  const scored: Array<{ score: number; row: VkdCdxRow }> = [];
  for (const row of opts.catalog) {
    const stem = imageStem(row.original);
    if (!stem) continue;
    const stemTokens = stem.split(" ").filter((t) => t.length >= 2);
    const inter = stemTokens.filter((t) => slugTokens.includes(t)).length;
    const precision = stemTokens.length ? inter / stemTokens.length : 0;
    const recall = slugTokens.length ? inter / slugTokens.length : 0;
    let score = -1;
    if (stem === slugFold) score = 100;
    else if (stem.startsWith(`${slugFold} `) && stemTokens.length - slugTokens.length <= 1) score = 80;
    else if (slugFold.startsWith(`${stem} `) && stemTokens.length >= 4) score = 75;
    else if (precision >= 0.7 && inter >= 3) score = 70;
    else if (precision >= 0.5 && recall >= 0.5 && inter >= 4) score = 55;
    if (score < 0) continue;
    score -= imageFolderRank(row.original) * 5;
    scored.push({ score, row });
  }
  scored.sort((a, b) => b.score - a.score || b.row.timestamp.localeCompare(a.row.timestamp));
  const best = scored[0];
  if (!best || best.score < 50) return opts.extractedUrl ?? null;
  return waybackReplayUrl(best.row.timestamp, best.row.original, "im_");
}

export function applyVkdImageCatalog(payload: VkdWaybackPayload, catalog: VkdCdxRow[]): VkdWaybackPayload {
  const items = payload.items.map((item) => {
    const featured = resolveVkdArchivedImage({
      slug: item.slug,
      extractedUrl: item.featuredImageUrl,
      catalog,
    });
    const body = [...new Set([featured, ...item.bodyImageUrls].filter((u): u is string => !!u))];
    let content = item.content;
    if (featured && item.featuredImageUrl && featured !== item.featuredImageUrl) {
      content = content.split(item.featuredImageUrl).join(featured);
    }
    if (featured && !content.includes(featured) && !/<img\b/i.test(content)) {
      content = `<p><img src="${featured}" alt="${item.title.replace(/"/g, "&quot;")}"></p>\n${content}`;
    }
    return {
      ...item,
      featuredImageUrl: featured,
      bodyImageUrls: body,
      content,
    };
  });
  return { ...payload, items };
}

export function pickPreferredCdxTimestamp(rows: VkdCdxRow[], preferred = VKD_WAYBACK_PREFERRED_SNAPSHOT): string {
  if (!rows.length) return preferred;
  const pref = Number(preferred);
  let best = rows[0]!;
  let bestDist = Math.abs(Number(best.timestamp) - pref);
  for (const row of rows) {
    const dist = Math.abs(Number(row.timestamp) - pref);
    if (dist < bestDist || (dist === bestDist && Number(row.timestamp) > Number(best.timestamp))) {
      best = row;
      bestDist = dist;
    }
  }
  return best.timestamp;
}

export function selectVkdHaberCdxRows(rows: VkdCdxRow[], preferred = VKD_WAYBACK_PREFERRED_SNAPSHOT): VkdCdxRow[] {
  const byCanon = new Map<string, VkdCdxRow[]>();
  for (const row of rows) {
    if (!isVkdHaberArticleUrl(row.original)) continue;
    const canonical = normalizeVkdCanonicalUrl(row.original);
    if (!canonical) continue;
    const list = byCanon.get(canonical) ?? [];
    list.push(row);
    byCanon.set(canonical, list);
  }
  const picked: VkdCdxRow[] = [];
  for (const [canonical, list] of byCanon) {
    const ts = pickPreferredCdxTimestamp(list, preferred);
    picked.push({ timestamp: ts, original: canonical });
  }
  return picked.sort((a, b) => a.original.localeCompare(b.original));
}

export async function fetchVkdHaberImageCdx(opts?: {
  fetchImpl?: typeof fetch;
}): Promise<VkdCdxRow[]> {
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const queries = [
    "https://web.archive.org/cdx/search/cdx?url=vatankahramanlari.org.tr/tema/belediye/uploads/haberler/*&output=json&fl=timestamp,original,statuscode,mimetype&filter=statuscode:200&collapse=urlkey&limit=500",
    "https://web.archive.org/cdx/search/cdx?url=vatankahramanlari.org.tr/haber/uploads/images/*&output=json&fl=timestamp,original,statuscode,mimetype&filter=statuscode:200&collapse=urlkey&limit=400",
  ];
  const rows: VkdCdxRow[] = [];
  const seen = new Set<string>();
  for (const url of queries) {
    const res = await fetchImpl(url, {
      headers: { "User-Agent": "Yekpare-VKD-WaybackImporter/1.0" },
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) continue;
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) continue;
    for (const row of data.slice(1)) {
      if (!Array.isArray(row) || row.length < 2) continue;
      const original = String(row[1] ?? "");
      if (
        !/\/tema\/belediye\/uploads\/haberler\//i.test(original) &&
        !/\/haber\/uploads\/images\//i.test(original)
      ) {
        continue;
      }
      const key = original.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ timestamp: String(row[0] ?? ""), original });
    }
  }
  return rows;
}

export async function fetchVkdWaybackCdx(opts?: {
  fetchImpl?: typeof fetch;
  preferredSnapshot?: string;
}): Promise<VkdCdxRow[]> {
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const preferred = opts?.preferredSnapshot ?? VKD_WAYBACK_PREFERRED_SNAPSHOT;
  const queries = [
    "https://web.archive.org/cdx/search/cdx?url=vatankahramanlari.org.tr/haber/*&output=json&fl=timestamp,original,statuscode,mimetype&filter=statuscode:200&collapse=urlkey&limit=400",
    "https://web.archive.org/cdx/search/cdx?url=www.vatankahramanlari.org.tr/haber/*&output=json&fl=timestamp,original,statuscode,mimetype&filter=statuscode:200&collapse=urlkey&limit=400",
  ];
  const rows: VkdCdxRow[] = [];
  for (const url of queries) {
    const res = await fetchImpl(url, {
      headers: { "User-Agent": "Yekpare-VKD-WaybackImporter/1.0" },
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) continue;
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) continue;
    for (const row of data.slice(1)) {
      if (!Array.isArray(row) || row.length < 2) continue;
      const timestamp = String(row[0] ?? "");
      const original = String(row[1] ?? "");
      const mime = String(row[3] ?? "");
      if (mime && !/html/i.test(mime)) continue;
      rows.push({ timestamp, original });
    }
  }
  return selectVkdHaberCdxRows(rows, preferred);
}

export async function crawlVkdWaybackArticles(opts?: {
  fetchImpl?: typeof fetch;
  preferredSnapshot?: string;
  delayMs?: number;
  limit?: number;
  extraUrls?: string[];
  log?: (line: string) => void;
}): Promise<VkdWaybackPayload> {
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const preferred = opts?.preferredSnapshot ?? VKD_WAYBACK_PREFERRED_SNAPSHOT;
  const delayMs = opts?.delayMs ?? 220;
  const log = opts?.log ?? (() => {});
  const cdx = await fetchVkdWaybackCdx({ fetchImpl, preferredSnapshot: preferred });
  const extras = [...inventoryCanonicalUrls(), ...(opts?.extraUrls ?? [])]
    .map((u) => normalizeVkdCanonicalUrl(u))
    .filter((u): u is string => !!u);
  const seeds = new Map<string, string>();
  for (const row of cdx) seeds.set(row.original, row.timestamp);
  for (const extra of extras) if (!seeds.has(extra)) seeds.set(extra, preferred);

  const listingUrls = [
    waybackReplayUrl(preferred, "https://vatankahramanlari.org.tr/"),
    waybackReplayUrl(preferred, "https://vatankahramanlari.org.tr/haberler.html"),
  ];
  for (const listing of listingUrls) {
    try {
      const res = await fetchImpl(listing, {
        headers: { "User-Agent": "Yekpare-VKD-WaybackImporter/1.0" },
        signal: AbortSignal.timeout(45_000),
        redirect: "follow",
      });
      if (!res.ok) continue;
      const html = await res.text();
      for (const href of extractHaberLinksFromHtml(html)) {
        if (!seeds.has(href)) seeds.set(href, preferred);
      }
      log(`[liste] ${listing} → + bağlantı`);
    } catch (e) {
      log(`[liste] atlandı: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const targets = [...seeds.entries()].map(([original, timestamp]) => ({ original, timestamp }));
  const limited = typeof opts?.limit === "number" ? targets.slice(0, Math.max(0, opts.limit)) : targets;
  const items: VkdWaybackArticle[] = [];
  for (const row of limited) {
    const alt =
      row.original.endsWith(".html")
        ? row.original.replace(/\.html$/i, "")
        : `${row.original}.html`;
    const candidates = [
      { original: row.original, url: waybackReplayUrl(row.timestamp, row.original, "id_") },
      { original: row.original, url: waybackReplayUrl(row.timestamp, row.original) },
      { original: alt, url: waybackReplayUrl(row.timestamp, alt, "id_") },
    ];
    let article: VkdWaybackArticle | null = null;
    for (const candidate of candidates) {
      try {
        const res = await fetchImpl(candidate.url, {
          headers: { "User-Agent": "Yekpare-VKD-WaybackImporter/1.0" },
          signal: AbortSignal.timeout(45_000),
          redirect: "follow",
        });
        if (!res.ok) continue;
        const html = await res.text();
        article = extractVkdWaybackArticle(html, {
          originalUrl: candidate.original,
          timestamp: row.timestamp,
        });
        if (article) break;
      } catch {
        /* try next Wayback form */
      }
    }
    if (!article) {
      log(`[atla] ayrıştırılamadı ${row.original}`);
    } else {
      items.push(article);
      log(`[ok] ${article.slug} (${article.categorySlug})`);
    }
    if (delayMs > 0) await sleep(delayMs);
  }

  let payload: VkdWaybackPayload = {
    ...emptyVkdWaybackPayload(preferred),
    items: mergeVkdWaybackArticles([items]),
  };
  try {
    const catalog = await fetchVkdHaberImageCdx({ fetchImpl });
    if (catalog.length) {
      payload = applyVkdImageCatalog(payload, catalog);
      log(`[görsel CDX] ${catalog.length} arşiv dosyası eşleştirildi`);
    }
  } catch (e) {
    log(`[görsel CDX] atlandı: ${e instanceof Error ? e.message : String(e)}`);
  }
  return payload;
}

export function toAhbHaberExport(payload: VkdWaybackPayload): {
  version: number;
  type: string;
  source: string;
  total: number;
  items: Array<{
    id: number;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    status: string;
    date: string;
    featured_image_url: string;
    taxonomies: { "haber-kategorisi": Array<{ name: string; slug: string }> };
  }>;
} {
  return {
    version: 1,
    type: "ahb-haber",
    source: "vkd-wayback",
    total: payload.items.length,
    items: payload.items.map((item, i) => ({
      id: i + 1,
      title: item.title,
      slug: item.slug,
      content: item.content,
      excerpt: item.spot ?? "",
      status: "publish",
      date: item.date ?? new Date().toISOString(),
      featured_image_url: item.featuredImageUrl ?? "",
      taxonomies: {
        "haber-kategorisi": [{ name: item.categorySlug, slug: item.categorySlug }],
      },
    })),
  };
}

function extractImgUrls(html: string): string[] {
  const urls: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const u = m[1]?.trim();
    if (u && /^https?:\/\//i.test(u)) urls.push(u);
  }
  return urls;
}

async function rewriteHtmlImages(
  html: string,
  cache: Map<string, string>,
  opts: { dryRun: boolean; title: string; log: (s: string) => void; onDownloaded: () => void; onFailed: () => void },
): Promise<string> {
  let out = html;
  for (const from of [...new Set(extractImgUrls(html))]) {
    let to = cache.get(from);
    if (!to) {
      if (opts.dryRun) {
        to = from;
      } else {
        try {
          const { downloadExternalImageToMedia } = await import("./mediaUploadService.js");
          to = (await downloadExternalImageToMedia(from, { title: opts.title, hashSeed: from })) ?? from;
          if (to !== from) {
            opts.onDownloaded();
            cache.set(from, to);
            await sleep(80);
          } else {
            opts.onFailed();
          }
        } catch (e) {
          opts.log(`[görsel] indirilemedi: ${from.slice(0, 80)} — ${e instanceof Error ? e.message : String(e)}`);
          opts.onFailed();
          to = from;
        }
      }
      if (!cache.has(from)) cache.set(from, to);
    }
    out = out.split(from).join(to);
  }
  return out;
}

export async function runHmVkdWaybackImport(params: {
  siteId: number;
  siteSlug?: string;
  payload: VkdWaybackPayload;
  dryRun: boolean;
  skipImages?: boolean;
  log?: (line: string) => void;
}): Promise<VkdWaybackImportResult> {
  const log = params.log ?? (() => {});
  const warnings: string[] = [];
  const warn = (s: string) => {
    warnings.push(s);
    log(s);
  };

  const siteSlug = (params.siteSlug ?? VKD_WAYBACK_DEFAULT_SITE_SLUG).trim().toLowerCase();
  if (params.siteId !== VKD_WAYBACK_DEFAULT_SITE_ID && siteSlug === VKD_WAYBACK_DEFAULT_SITE_SLUG) {
    warn(`[site] beklenen siteId=${VKD_WAYBACK_DEFAULT_SITE_ID} (vkd), gelen ${params.siteId}`);
  }
  if (!params.dryRun) {
    const { ensureVkdCorporateSiteCategories } = await import("./hm-corporate-news-policy.js");
    await ensureVkdCorporateSiteCategories(params.siteId, siteSlug);
  }

  const { categoriesTable, dualWriteInsert, getNewsDbForRead, newsTable } = await import("@workspace/db");
  const db = getNewsDbForRead();
  const { and, eq, or, isNull } = await import("drizzle-orm");

  const catRows = await db
    .select({ id: categoriesTable.id, slug: categoriesTable.slug })
    .from(categoriesTable)
    .where(or(isNull(categoriesTable.exclusiveSiteId), eq(categoriesTable.exclusiveSiteId, params.siteId)));
  const slugToId = new Map(
    catRows.map((c: { id: number; slug: string }) => [String(c.slug).toLowerCase(), c.id]),
  );

  const existing = await db
    .select({ title: newsTable.title, slug: newsTable.slug, rssSourceUrl: newsTable.rssSourceUrl })
    .from(newsTable)
    .where(eq(newsTable.siteId, params.siteId));
  const existingTitles = new Set<string>();
  const existingSlugs = new Set<string>();
  const existingSources = new Set<string>();
  for (const row of existing) {
    const t = normalizeNewsTitle(row.title);
    if (t) existingTitles.add(t);
    if (row.slug) existingSlugs.add(String(row.slug).trim().toLowerCase());
    if (row.rssSourceUrl) existingSources.add(String(row.rssSourceUrl).trim());
  }

  function allocSlug(base: string): string {
    let s = slugify(base);
    if (!s) s = "haber";
    let cand = s;
    let n = 0;
    while (existingSlugs.has(cand)) {
      n += 1;
      cand = `${s}-${n}`;
    }
    existingSlugs.add(cand);
    return cand;
  }

  const items = [...params.payload.items].sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")));
  const preview: VkdWaybackImportPreviewItem[] = [];
  const urlCache = new Map<string, string>();
  let newsAdded = 0;
  let newsSkipped = 0;
  let skippedDuplicates = 0;
  let imagesDownloaded = 0;
  let imagesFailed = 0;

  for (const item of items) {
    const title = item.title.trim();
    const source = waybackSourceKey(item.canonicalUrl);
    const normalizedTitle = normalizeNewsTitle(title);
    const bodyUrls = item.bodyImageUrls.length ? item.bodyImageUrls : extractImgUrls(item.content);
    const duplicateReason = existingSources.has(source)
      ? "atlanacak (aynı Wayback kaynağı)"
      : normalizedTitle && existingTitles.has(normalizedTitle)
        ? "atlanacak (aynı başlık)"
        : "";

    if (!title) {
      newsSkipped += 1;
      if (params.dryRun) {
        preview.push({
          title: "(boş başlık)",
          slug: item.slug,
          categorySlug: item.categorySlug,
          date: item.date,
          hasFeaturedImage: !!item.featuredImageUrl,
          imageCountInBody: bodyUrls.length,
          canonicalUrl: item.canonicalUrl,
          skipReason: "boş başlık",
        });
      }
      continue;
    }

    if (duplicateReason) {
      skippedDuplicates += 1;
      newsSkipped += 1;
      if (params.dryRun) {
        preview.push({
          title: title.slice(0, 120),
          slug: item.slug,
          categorySlug: item.categorySlug,
          date: item.date,
          hasFeaturedImage: !!item.featuredImageUrl,
          imageCountInBody: bodyUrls.length,
          canonicalUrl: item.canonicalUrl,
          skipReason: duplicateReason,
        });
      } else {
        log(`[haber] ${duplicateReason}: ${title.slice(0, 70)}`);
      }
      continue;
    }

    if (params.dryRun) {
      existingSources.add(source);
      if (normalizedTitle) existingTitles.add(normalizedTitle);
      preview.push({
        title: title.slice(0, 120),
        slug: item.slug,
        categorySlug: item.categorySlug,
        date: item.date,
        hasFeaturedImage: !!item.featuredImageUrl,
        imageCountInBody: bodyUrls.length,
        canonicalUrl: item.canonicalUrl,
      });
      continue;
    }

    let html = item.content.trim() || `<p>${title}</p>`;
    if (params.skipImages !== true) {
      html = await rewriteHtmlImages(html, urlCache, {
        dryRun: false,
        title,
        log: warn,
        onDownloaded: () => {
          imagesDownloaded += 1;
        },
        onFailed: () => {
          imagesFailed += 1;
        },
      });
    }

    let imageUrl: string | null = null;
    if (item.featuredImageUrl) {
      if (params.skipImages === true) {
        imageUrl = item.featuredImageUrl;
      } else {
        const cached = urlCache.get(item.featuredImageUrl);
        if (cached) {
          imageUrl = cached.startsWith("/api/media/uploads/") ? cached : cached;
        } else {
          try {
            const { downloadExternalImageToMedia } = await import("./mediaUploadService.js");
            const saved = await downloadExternalImageToMedia(item.featuredImageUrl, {
              title,
              hashSeed: item.featuredImageUrl,
            });
            if (saved) {
              imageUrl = saved;
              urlCache.set(item.featuredImageUrl, saved);
              imagesDownloaded += 1;
            } else {
              imagesFailed += 1;
              warn(`[kapak] indirilemedi: ${item.featuredImageUrl.slice(0, 90)}`);
            }
          } catch (e) {
            imagesFailed += 1;
            warn(`[kapak] ${title.slice(0, 40)}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
    }
    if (!imageUrl) {
      const localM = html.match(/src=["'](\/api\/media\/uploads\/[^"']+)["']/i);
      if (localM?.[1]) imageUrl = localM[1];
    }

    const categoryId = slugToId.get(item.categorySlug) ?? null;
    if (!categoryId) warn(`[kategori] eşleşmedi slug=${item.categorySlug}: ${title.slice(0, 50)}`);

    const when = item.date ? new Date(item.date) : new Date();
    const createdAt = Number.isFinite(when.getTime()) ? when : new Date();
    const slug = allocSlug(item.slug || title);

    await dualWriteInsert(newsTable, {
      title,
      slug,
      spot: item.spot ?? textSpot(html),
      content: html,
      imageUrl,
      categoryId,
      status: "published",
      isFeatured: false,
      isBreaking: false,
      tags: [VKD_WAYBACK_TAG, item.categorySlug],
      siteId: params.siteId,
      rssSourceUrl: source,
      isEditorManual: true,
      siteOnly: true,
      ownerSiteId: params.siteId,
      createdAt,
      updatedAt: createdAt,
    });

    existingSources.add(source);
    if (normalizedTitle) existingTitles.add(normalizedTitle);
    newsAdded += 1;
    log(`[haber] + ${title.slice(0, 70)} (${item.categorySlug})`);
  }

  return {
    itemsTotal: items.length,
    itemsProcessed: items.length,
    newsAdded,
    newsSkipped,
    skippedDuplicates,
    imagesDownloaded,
    imagesFailed,
    warnings,
    preview: params.dryRun ? preview : undefined,
  };
}
