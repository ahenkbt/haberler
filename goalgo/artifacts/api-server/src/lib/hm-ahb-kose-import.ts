/**
 * AHB (`__tbl_ky_yazarlar__` / `__ky_makaleler__`) JSON → HM site köşe yazarları + `hm_makaleler` köşe yazıları.
 */
import { downloadExternalImageToMediaDetailed } from "./mediaUploadService";

export type AhbYazarItem = {
  id: string;
  ad_soyad: string;
  slug: string;
  unvan?: string;
  foto?: string;
  fotograf?: string;
  foto_url?: string;
  resim?: string;
  resim_url?: string;
  avatar?: string;
  avatar_url?: string;
  image?: string;
  image_url?: string;
  img?: string;
  img_url?: string;
  photo?: string;
  photo_url?: string;
  picture?: string;
  picture_url?: string;
  profile_image?: string;
  profile_image_url?: string;
  profile_photo?: string;
  profile_photo_url?: string;
  profil_foto?: string;
  profil_foto_url?: string;
  profil_resmi?: string;
  yazar_foto?: string;
  yazar_foto_url?: string;
  yazar_resim?: string;
  biyografi?: string;
  aktif?: string;
  sira?: string;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
};

export type AhbYazarExport = {
  items?: AhbYazarItem[];
  source?: string;
  source_url?: string;
  base_url?: string;
  site_url?: string;
  home_url?: string;
};

export type AhbMakaleItem = {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: string;
  date?: string;
  meta?: { _ky_yazar_id?: string; ppma_authors_name?: string };
};

export type AhbMakaleExport = { items?: AhbMakaleItem[] };

export type HmAhbKoseImportResult = {
  authorsMapped: number;
  postsAdded: number;
  postsSkipped: number;
  imagesDownloaded: number;
  imagesFailed: number;
  imagesSkipped: number;
  warnings: string[];
};

/** `authors` = yalnızca yazarlar; `posts` = yalnızca makaleler (yazarlar JSON isteğe bağlı, eşleme için); `full` = ikisi birden. */
export type HmAhbKoseImportMode = "full" | "authors" | "posts";

function slugify(input: string): string {
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
    .slice(0, 80) || "haber";
}

function stripWpComments(html: string): string {
  return html.replace(/<!--\s*\/?wp:[\s\S]*?-->/gi, "").trim();
}

function decodeHtmlEntities(raw: string): string {
  return String(raw ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

function normalizeImageUrl(raw: string | null | undefined, baseUrl: string | null): string | null {
  const t = decodeHtmlEntities(String(raw ?? "").trim());
  if (!t) return null;
  if (/^(?:data|blob|mailto|tel|javascript):/i.test(t)) return null;
  if (t.startsWith("/api/media/uploads/")) return t;
  if (t.startsWith("//")) return `https:${t}`;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^wp-content\/uploads\//i.test(t)) return normalizeImageUrl(`/${t}`, baseUrl);
  if (/^uploads\//i.test(t)) return normalizeImageUrl(`/wp-content/${t}`, baseUrl);
  if (!baseUrl) return null;
  try {
    return new URL(t, baseUrl).toString();
  } catch {
    return null;
  }
}

type ImgSrcRef = {
  raw: string;
  normalized: string;
};

function extractImgSrcRefs(html: string, baseUrl: string | null): ImgSrcRef[] {
  const refs: ImgSrcRef[] = [];
  const seen = new Set<string>();
  const attrRe = /\b(?:src|data-src|data-lazy-src|data-original|data-orig-file|data-large-file|data-medium-file)\s*=\s*["']([^"']+)["']/gi;
  const srcsetRe = /\b(?:srcset|data-srcset)\s*=\s*["']([^"']+)["']/gi;
  const add = (rawValue: string) => {
    const raw = String(rawValue ?? "").trim();
    const normalized = normalizeImageUrl(raw, baseUrl);
    if (!raw || !normalized) return;
    const key = `${raw}\u0000${normalized}`;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push({ raw, normalized });
  };

  const imgRe = /<img\b[^>]*>/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imgRe.exec(String(html ?? ""))) !== null) {
    const tag = imgMatch[0] ?? "";
    let attrMatch: RegExpExecArray | null;
    attrRe.lastIndex = 0;
    while ((attrMatch = attrRe.exec(tag)) !== null) {
      add(attrMatch[1] ?? "");
    }
    srcsetRe.lastIndex = 0;
    while ((attrMatch = srcsetRe.exec(tag)) !== null) {
      const first = String(attrMatch[1] ?? "")
        .split(",")
        .map((part) => part.trim().split(/\s+/)[0] ?? "")
        .find(Boolean);
      if (first) add(first);
    }
  }
  return refs;
}

function firstFeaturedImageUrlFromHtml(html: string, baseUrl: string | null): string | null {
  return extractImgSrcRefs(String(html ?? ""), baseUrl)[0]?.normalized ?? null;
}

function textSpot(html: string, excerpt: string | undefined, max = 400): string | null {
  const ex = (excerpt ?? "").trim();
  if (ex) return ex.slice(0, max);
  const plain = stripWpComments(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return null;
  return plain.slice(0, max);
}

function parseExportDate(s: string | undefined): Date {
  if (!s || !String(s).trim()) return new Date();
  const m = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return new Date();
  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6]),
  );
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const s = String(value ?? "").trim();
    if (s) return s;
  }
  return null;
}

function normalizedBaseUrl(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const u = new URL(value);
    return `${u.protocol}//${u.host}/`;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stringValuesDeep(value: unknown, limit = 200): string[] {
  const out: string[] = [];
  const seen = new Set<unknown>();
  const visit = (v: unknown, depth: number) => {
    if (out.length >= limit || v == null || depth > 5) return;
    if (typeof v === "string" || typeof v === "number") {
      const s = String(v).trim();
      if (s) out.push(s);
      return;
    }
    if (typeof v !== "object") return;
    if (seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) {
      for (const item of v) visit(item, depth + 1);
      return;
    }
    for (const item of Object.values(v as Record<string, unknown>)) visit(item, depth + 1);
  };
  visit(value, 0);
  return out;
}

function inferBaseUrlFromExports(authorsExport: AhbYazarExport, postsExport: AhbMakaleExport): string | null {
  const values = [
    ...stringValuesDeep(authorsExport, 350),
    ...stringValuesDeep(postsExport, 350),
  ];
  for (const value of values) {
    const matches = value.match(/https?:\/\/[^\s"'<>\\]+/gi) ?? [];
    for (const match of matches) {
      if (/\/wp-content\/uploads\//i.test(match)) {
        const base = normalizedBaseUrl(match);
        if (base) return base;
      }
    }
  }
  for (const value of values) {
    const base = normalizedBaseUrl(value);
    if (base) return base;
  }
  return null;
}

function sourceBaseUrlFromExports(authorsExport: AhbYazarExport, postsExport: AhbMakaleExport): string | null {
  const raw = firstString(
    authorsExport.source_url,
    authorsExport.base_url,
    authorsExport.site_url,
    authorsExport.home_url,
    authorsExport.source,
    (postsExport as { source_url?: unknown }).source_url,
    (postsExport as { base_url?: unknown }).base_url,
    (postsExport as { site_url?: unknown }).site_url,
    (postsExport as { home_url?: unknown }).home_url,
    (postsExport as { source?: unknown }).source,
  );
  return normalizedBaseUrl(raw) ?? inferBaseUrlFromExports(authorsExport, postsExport);
}

type AuthorImageCandidate = {
  raw: string;
  source: string;
};

const DIRECT_AUTHOR_IMAGE_KEYS = new Set(
  [
    "foto",
    "fotograf",
    "fotograf_url",
    "foto_url",
    "resim",
    "resim_url",
    "avatar",
    "avatar_url",
    "image",
    "image_url",
    "img",
    "img_url",
    "photo",
    "photo_url",
    "picture",
    "picture_url",
    "profile_image",
    "profile_image_url",
    "profile_photo",
    "profile_photo_url",
    "profil_foto",
    "profil_fotograf",
    "profil_fotografi",
    "profil_foto_url",
    "profil_resim",
    "profil_resmi",
    "yazar_foto",
    "yazar_fotograf",
    "yazar_fotografi",
    "yazar_foto_url",
    "yazar_resim",
    "yazar_resmi",
    "yazar_resim_url",
    "author_image",
    "author_photo",
    "featured_image",
    "featured_image_url",
    "featured_media_url",
    "thumbnail",
    "thumbnail_url",
    "_thumbnail_url",
    "user_avatar",
    "wp_user_avatar",
    "_wp_user_avatar",
    "simple_local_avatar",
    "cupp_upload_meta",
    "avatar_manager_custom_avatar",
    "ppma_avatar",
    "_ppma_author_image",
  ].map((key) => key.toLowerCase()),
);

function normalizedImageKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[İIı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Çç]/g, "c")
    .replace(/[Öö]/g, "o")
    .replace(/[Üü]/g, "u")
    .replace(/[Ğğ]/g, "g")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isLikelyAuthorImageKey(key: string): boolean {
  const k = normalizedImageKey(key);
  return (
    DIRECT_AUTHOR_IMAGE_KEYS.has(k) ||
    /(?:^|_)(?:avatar|foto|fotograf|photo|image|img|picture|resim|gorsel|thumbnail)(?:_|$)/.test(k)
  );
}

function addCandidate(out: AuthorImageCandidate[], seen: Set<string>, raw: string, source: string, baseUrl: string | null): void {
  const value = decodeHtmlEntities(String(raw ?? "").trim());
  if (!value || /^\d+$/.test(value)) return;
  const normalized = normalizeImageUrl(value, baseUrl);
  if (!normalized) return;
  const key = normalized.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  out.push({ raw: value, source });
}

function extractUrlCandidatesFromText(text: string, baseUrl: string | null): string[] {
  const value = decodeHtmlEntities(String(text ?? "").trim());
  if (!value) return [];
  const out: string[] = [];
  const add = (candidate: string) => {
    const clean = candidate.trim().replace(/[),.;\]]+$/g, "");
    if (!clean || out.includes(clean)) return;
    out.push(clean);
  };

  for (const ref of extractImgSrcRefs(value, baseUrl)) add(ref.raw);

  const absoluteRe = /(?:https?:)?\/\/[^\s"'<>\\]+/gi;
  let m: RegExpExecArray | null;
  while ((m = absoluteRe.exec(value)) !== null) {
    const candidate = m[0] ?? "";
    if (/\/wp-content\/uploads\//i.test(candidate) || /\.(?:jpe?g|png|gif|webp|svg)(?:[?#]|$)/i.test(candidate)) {
      add(candidate);
    }
  }

  const relativeRe = /(?:^|["'(\s])((?:\/?wp-content\/uploads\/|\/uploads\/)[^\s"'<>\\)]+)/gi;
  while ((m = relativeRe.exec(value)) !== null) add(m[1] ?? "");

  return out;
}

function imageCandidatesFromValue(
  value: unknown,
  source: string,
  baseUrl: string | null,
  opts: { direct: boolean },
): AuthorImageCandidate[] {
  const out: AuthorImageCandidate[] = [];
  const seen = new Set<string>();
  const visit = (v: unknown, label: string, depth: number) => {
    if (v == null || depth > 5) return;
    if (typeof v === "string" || typeof v === "number") {
      const raw = String(v).trim();
      if (!raw) return;
      if (opts.direct) addCandidate(out, seen, raw, label, baseUrl);
      for (const candidate of extractUrlCandidatesFromText(raw, baseUrl)) addCandidate(out, seen, candidate, label, baseUrl);
      if ((raw.startsWith("{") || raw.startsWith("[")) && raw.length < 50_000) {
        try {
          visit(JSON.parse(raw) as unknown, `${label} JSON`, depth + 1);
        } catch {
          /* Serialized/PHP strings are still covered by URL extraction above. */
        }
      }
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) visit(item, label, depth + 1);
      return;
    }
    if (isRecord(v)) {
      for (const [k, child] of Object.entries(v)) {
        const childDirect = opts.direct || isLikelyAuthorImageKey(k) || ["url", "src", "source_url", "guid", "file"].includes(normalizedImageKey(k));
        const childCandidates = imageCandidatesFromValue(child, `${label}.${k}`, baseUrl, { direct: childDirect });
        for (const candidate of childCandidates) addCandidate(out, seen, candidate.raw, candidate.source, baseUrl);
      }
    }
  };
  visit(value, source, 0);
  return out;
}

function authorImageCandidate(y: AhbYazarItem, baseUrl: string | null): AuthorImageCandidate | null {
  const meta = y.meta && typeof y.meta === "object" ? y.meta : {};
  const candidates: AuthorImageCandidate[] = [];
  const addAll = (list: AuthorImageCandidate[]) => {
    for (const item of list) {
      if (!candidates.some((x) => normalizeImageUrl(x.raw, baseUrl) === normalizeImageUrl(item.raw, baseUrl))) {
        candidates.push(item);
      }
    }
  };

  for (const [key, value] of Object.entries(y)) {
    if (key === "meta" || key === "biyografi") continue;
    if (isLikelyAuthorImageKey(key)) {
      addAll(imageCandidatesFromValue(value, key, baseUrl, { direct: true }));
    }
  }
  for (const [key, value] of Object.entries(meta)) {
    if (isLikelyAuthorImageKey(key)) {
      addAll(imageCandidatesFromValue(value, `meta.${key}`, baseUrl, { direct: true }));
    }
  }
  addAll(imageCandidatesFromValue(String(y.biyografi ?? ""), "biyografi", baseUrl, { direct: false }));

  return candidates[0] ?? null;
}

async function importImageUrl(params: {
  raw: string;
  baseUrl: string | null;
  label: string;
  warn: (s: string) => void;
  onDownloaded: () => void;
  onFailed: () => void;
  onSkipped: () => void;
}): Promise<string | null> {
  const normalized = normalizeImageUrl(params.raw, params.baseUrl);
  if (!normalized) {
    params.onSkipped();
    params.warn(`[görsel] URL çözülemedi (${params.label}): ${String(params.raw ?? "").slice(0, 90)}`);
    return null;
  }
  if (normalized.startsWith("/api/media/uploads/")) return normalized;
  try {
    const saved = await downloadExternalImageToMediaDetailed(normalized);
    if (saved.ok) {
      params.onDownloaded();
      return saved.url;
    }
    params.onFailed();
    params.warn(`[görsel] indirilemedi (${params.label}): ${normalized.slice(0, 90)} — ${saved.error}`);
  } catch (e) {
    params.onFailed();
    params.warn(
      `[görsel] indirilemedi (${params.label}): ${normalized.slice(0, 90)} — ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
  return /^https?:\/\//i.test(normalized) ? normalized : null;
}

async function rewriteHtmlImages(
  html: string,
  baseUrl: string | null,
  cache: Map<string, string>,
  opts: {
    warn: (s: string) => void;
    onDownloaded: () => void;
    onFailed: () => void;
    onSkipped: () => void;
  },
): Promise<string> {
  let out = html;
  const refsByUrl = new Map<string, ImgSrcRef[]>();
  for (const ref of extractImgSrcRefs(html, baseUrl)) {
    const list = refsByUrl.get(ref.normalized) ?? [];
    list.push(ref);
    refsByUrl.set(ref.normalized, list);
  }
  for (const [from, refs] of refsByUrl) {
    let to = cache.get(from);
    if (!to) {
      to =
        (await importImageUrl({
          raw: from,
          baseUrl,
          label: "makale içi",
          warn: opts.warn,
          onDownloaded: opts.onDownloaded,
          onFailed: opts.onFailed,
          onSkipped: opts.onSkipped,
        })) ?? from;
      cache.set(from, to);
    }
    out = out.split(from).join(to);
    for (const ref of refs) {
      out = out.split(ref.raw).join(to);
      const decodedRaw = decodeHtmlEntities(ref.raw);
      if (decodedRaw !== ref.raw) out = out.split(decodedRaw).join(to);
    }
  }
  return out;
}

async function resolveMakaleAuthorId(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  authorsTable: typeof import("@workspace/db")["authorsTable"];
  siteId: number;
  ky: string;
  oldMap: Map<string, number>;
  ppmaName: string | undefined;
  warn: (s: string) => void;
  titleHint: string;
}): Promise<number | null> {
  const { db, authorsTable, siteId, ky, oldMap, ppmaName, warn, titleHint } = params;
  const { and, eq, ilike } = await import("drizzle-orm");
  if (ky && ky !== "0") {
    const fromMap = oldMap.get(ky);
    if (fromMap) return fromMap;
  }
  const nm = (ppmaName ?? "").trim();
  if (nm) {
    const [hit] = await db
      .select({ id: authorsTable.id })
      .from(authorsTable)
      .where(and(eq(authorsTable.hmSiteId, siteId), eq(authorsTable.name, nm)))
      .limit(1);
    if (hit) return hit.id;
    const [hitLoose] = await db
      .select({ id: authorsTable.id })
      .from(authorsTable)
      .where(and(eq(authorsTable.hmSiteId, siteId), ilike(authorsTable.name, nm)))
      .limit(1);
    if (hitLoose) return hitLoose.id;
  }
  if (ky && ky !== "0") {
    warn(`[makale] yazar eşleşmedi (id ${ky}${nm ? `, ad ${nm.slice(0, 40)}` : ""}): ${titleHint.slice(0, 50)}`);
  }
  return null;
}

/**
 * @param mediaUploadDir — örn. `join(process.cwd(), "data", "media-uploads")` (api-server kökü)
 */
export async function runHmAhbKoseImport(params: {
  siteId: number;
  authorsExport: AhbYazarExport;
  postsExport: AhbMakaleExport;
  mode: HmAhbKoseImportMode;
  mediaUploadDir: string;
  /** Varsayılan: console.log */
  log?: (line: string) => void;
}): Promise<HmAhbKoseImportResult> {
  const log = params.log ?? ((s: string) => console.log(s));
  const warnings: string[] = [];
  const warn = (s: string) => {
    warnings.push(s);
    log(s);
  };

  const {
    authorsTable,
    dualWriteInsert,
    dualWriteUpdate,
    getNewsDbForRead,
    hmMakalelerTable,
  } = await import("@workspace/db");
  const db = getNewsDbForRead();
  const { and, eq, sql } = await import("drizzle-orm");

  const siteId = params.siteId;
  const mode = params.mode ?? "full";
  const sourceBaseUrl = sourceBaseUrlFromExports(params.authorsExport, params.postsExport);
  if (sourceBaseUrl) log(`[görsel] kaynak base URL: ${sourceBaseUrl}`);

  const yazarlar = Array.isArray(params.authorsExport.items) ? params.authorsExport.items : [];
  const makaleler = Array.isArray(params.postsExport.items) ? params.postsExport.items : [];

  const sortedY = [...yazarlar].sort(
    (a, b) => parseInt(String(a.sira ?? "0"), 10) - parseInt(String(b.sira ?? "0"), 10),
  );

  const oldAuthorIdToNew = new Map<string, number>();
  const imageCache = new Map<string, string>();
  let imagesDownloaded = 0;
  let imagesFailed = 0;
  let imagesSkipped = 0;
  const imageCounters = {
    onDownloaded: () => {
      imagesDownloaded += 1;
    },
    onFailed: () => {
      imagesFailed += 1;
    },
    onSkipped: () => {
      imagesSkipped += 1;
    },
  };

  if (mode === "full") {
    if (sortedY.length === 0) throw new Error("Yazarlar JSON boş veya items yok.");
    if (makaleler.length === 0) throw new Error("Makale JSON boş veya items yok.");
  }
  if (mode === "authors" && sortedY.length === 0) {
    throw new Error("Yazarlar JSON boş veya items yok.");
  }
  if (mode === "posts" && makaleler.length === 0) {
    throw new Error("Makale JSON boş veya items yok.");
  }

  const runAuthorLoop =
    mode === "full" || mode === "authors" || (mode === "posts" && sortedY.length > 0);
  if (runAuthorLoop) {
    for (const y of sortedY) {
      if (String(y.aktif ?? "1") !== "1") continue;
      const name = String(y.ad_soyad ?? "").trim();
      if (!name) continue;
      const oldId = String(y.id ?? "").trim();
      const avatarSource = authorImageCandidate(y, sourceBaseUrl);
      const resolveAvatar = async (): Promise<string | null> => {
        if (!avatarSource) {
          imagesSkipped += 1;
          warn(`[yazar] foto alanı yok: ${name}`);
          return null;
        }
        const normalized = normalizeImageUrl(avatarSource.raw, sourceBaseUrl);
        if (normalized && imageCache.has(normalized)) return imageCache.get(normalized)!;
        const saved = await importImageUrl({
          raw: avatarSource.raw,
          baseUrl: sourceBaseUrl,
          label: `yazar ${name} (${avatarSource.source})`,
          warn,
          ...imageCounters,
        });
        if (normalized && saved) imageCache.set(normalized, saved);
        if (saved) {
          log(
            `[yazar] foto bulundu: ${name} (${avatarSource.source}) ${normalized ? normalized.slice(0, 90) : ""} → ${saved}`,
          );
        }
        return saved;
      };

      const [existing] = await db
        .select({ id: authorsTable.id, avatarUrl: authorsTable.avatarUrl })
        .from(authorsTable)
        .where(and(eq(authorsTable.hmSiteId, siteId), eq(authorsTable.name, name)))
        .limit(1);
      if (existing) {
        oldAuthorIdToNew.set(oldId, existing.id);
        if (!String(existing.avatarUrl ?? "").trim() && avatarSource) {
          try {
            const avatarUrl = await resolveAvatar();
            if (avatarUrl) {
              await dualWriteUpdate(authorsTable, { avatarUrl }, eq(authorsTable.id, existing.id));
              log(`[yazar] foto güncellendi: ${name} → id ${existing.id}`);
            } else {
              log(`[yazar] atlandı (aynı ad, foto yok): ${name} → id ${existing.id}`);
            }
          } catch (e) {
            warn(`[yazar] foto indirilemedi ${name}: ${e instanceof Error ? e.message : String(e)}`);
            log(`[yazar] atlandı (aynı ad): ${name} → id ${existing.id}`);
          }
        } else {
          log(`[yazar] atlandı (aynı ad): ${name} → id ${existing.id}`);
        }
        continue;
      }

      let avatarUrl: string | null = null;
      try {
        avatarUrl = await resolveAvatar();
      } catch (e) {
        warn(`[yazar] foto indirilemedi ${name}: ${e instanceof Error ? e.message : String(e)}`);
      }

      const [row] = await dualWriteInsert(authorsTable, {
          name,
          title: String(y.unvan ?? "").trim() || null,
          avatarUrl,
          bio: String(y.biyografi ?? "").trim() || null,
          hmSiteId: siteId,
          email: null,
          passwordHash: null,
        });

      if (row) {
        oldAuthorIdToNew.set(oldId, row.id);
        log(`[yazar] eklendi: ${name} (ahb id ${oldId}) → ${row.id}`);
      }
    }
  }

  if (mode === "authors") {
    return {
      authorsMapped: oldAuthorIdToNew.size,
      postsAdded: 0,
      postsSkipped: 0,
      imagesDownloaded,
      imagesFailed,
      imagesSkipped,
      warnings,
    };
  }

  const existingSlugs = new Set<string>();
  const slugRows = await db
    .select({ slug: hmMakalelerTable.slug })
    .from(hmMakalelerTable)
    .where(eq(hmMakalelerTable.siteId, siteId));
  for (const r of slugRows) existingSlugs.add(r.slug);

  function allocSlug(base: string): string {
    let s = slugify(base);
    if (!s) s = "yazi";
    let cand = s;
    let n = 0;
    while (existingSlugs.has(cand)) {
      n += 1;
      cand = `${s}-${n}`;
    }
    existingSlugs.add(cand);
    return cand;
  }

  let artAdded = 0;
  let artSkipped = 0;

  const sortedM = [...makaleler].sort(
    (a, b) => parseExportDate(a.date).getTime() - parseExportDate(b.date).getTime(),
  );

  for (const m of sortedM) {
    const dedupeKey = `ahb-ky:${m.id}`;
    const [dup] = await db
      .select({ id: hmMakalelerTable.id })
      .from(hmMakalelerTable)
      .where(and(eq(hmMakalelerTable.siteId, siteId), eq(hmMakalelerTable.externalKey, dedupeKey)))
      .limit(1);
    if (dup) {
      artSkipped += 1;
      continue;
    }

    const title = String(m.title ?? "").trim();
    if (!title) {
      artSkipped += 1;
      continue;
    }
    const [sameTitle] = await db
      .select({ id: hmMakalelerTable.id })
      .from(hmMakalelerTable)
      .where(
        and(
          eq(hmMakalelerTable.siteId, siteId),
          sql`lower(regexp_replace(btrim(${hmMakalelerTable.title}), '\s+', ' ', 'g')) = ${title
            .replace(/\s+/g, " ")
            .toLocaleLowerCase("tr-TR")}`,
        ),
      )
      .limit(1);
    if (sameTitle) {
      artSkipped += 1;
      continue;
    }

    let rawHtml = String(m.content ?? "");
    rawHtml = stripWpComments(rawHtml);
    if (!rawHtml.trim()) {
      rawHtml = `<p>${title}</p>`;
    }
    const firstImageBeforeRewrite = firstFeaturedImageUrlFromHtml(rawHtml, sourceBaseUrl);
    rawHtml = await rewriteHtmlImages(rawHtml, sourceBaseUrl, imageCache, {
      warn,
      ...imageCounters,
    });

    const ky = String(m.meta?._ky_yazar_id ?? "").trim();
    const authorId = await resolveMakaleAuthorId({
      db,
      authorsTable,
      siteId,
      ky,
      oldMap: oldAuthorIdToNew,
      ppmaName: m.meta?.ppma_authors_name,
      warn,
      titleHint: title,
    });

    const status = m.status === "publish" ? "published" : "draft";
    const when = parseExportDate(m.date);
    const slug = allocSlug(m.slug || title);
    const spot = textSpot(rawHtml, m.excerpt);
    const imageUrl = firstFeaturedImageUrlFromHtml(rawHtml, sourceBaseUrl) ?? firstImageBeforeRewrite;

    await dualWriteInsert(hmMakalelerTable, {
      title,
      slug,
      spot,
      content: rawHtml,
      imageUrl,
      authorId,
      status,
      siteId,
      externalKey: dedupeKey,
      createdAt: when,
      updatedAt: when,
    });
    artAdded += 1;
    log(`[makale] + ${title.slice(0, 60)}`);
  }

  return {
    authorsMapped: oldAuthorIdToNew.size,
    postsAdded: artAdded,
    postsSkipped: artSkipped,
    imagesDownloaded,
    imagesFailed,
    imagesSkipped,
    warnings,
  };
}
