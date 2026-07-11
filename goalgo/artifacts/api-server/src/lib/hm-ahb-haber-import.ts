/**
 * AHB `ahb-export-haber-*.json` → HM site `news` tablosu.
 */
import { downloadExternalImageToMedia } from "./mediaUploadService";
import { slugify } from "./news-context";

export type AhbHaberTaxTerm = { name?: string; slug?: string };
export type AhbHaberItem = {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: string;
  date?: string;
  date_gmt?: string;
  author_login?: string;
  taxonomies?: {
    "haber-kategorisi"?: AhbHaberTaxTerm[];
    "haber-etiketi"?: AhbHaberTaxTerm[];
    sehir?: AhbHaberTaxTerm[];
  };
  categories_text?: string;
  featured_image_url?: string;
  meta?: Record<string, string | undefined>;
};

export type AhbHaberExport = {
  version?: number;
  type?: string;
  source?: string;
  categories_filter?: string[];
  total?: number;
  items?: AhbHaberItem[];
};

export type HmAhbHaberImportPreviewItem = {
  id: number;
  title: string;
  slug: string;
  categorySlug: string;
  categoryResolved: boolean;
  status: string;
  date?: string;
  hasFeaturedImage: boolean;
  imageCountInBody: number;
  skipReason?: string;
};

export type HmAhbHaberImportResult = {
  itemsTotal: number;
  itemsProcessed: number;
  newsAdded: number;
  newsSkipped: number;
  skippedDuplicates: number;
  imagesDownloaded: number;
  warnings: string[];
  preview?: HmAhbHaberImportPreviewItem[];
  hasMore: boolean;
  nextOffset: number;
};

/** Karşılaştırma için başlık: trim, boşluk birleştirme, küçük harf. */
export function normalizeNewsTitle(title: string): string {
  return String(title ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** AHB dosya adı / taxonomy slug → Goalgo `categories.slug` */
const FILENAME_CATEGORY_MAP: Record<string, string> = {
  ekonomi: "ekonomi",
  gundem: "gundem",
  ozel: "ozel-haber",
  ankara: "ankara",
};

/** AHB slug varyantları → kanonik Goalgo slug (site editöründeki slug ile eşleşmeli). */
const AHB_TO_GOALGO_CATEGORY_SLUG: Record<string, string> = {
  gundem: "gundem",
  ekonomi: "ekonomi",
  ankara: "ankara",
  ozel: "ozel-haber",
  "ozel-haber": "ozel-haber",
  "ozel-haberler": "ozel-haber",
  ozelhaber: "ozel-haber",
};

function mapAhbCategorySlug(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return s;
  return AHB_TO_GOALGO_CATEGORY_SLUG[s] ?? s;
}

function categorySlugFromFilename(filename: string | undefined): string | null {
  if (!filename) return null;
  const base = filename.replace(/^.*[/\\]/, "");
  const m = base.match(/ahb-export-haber-([^-]+)-/i);
  if (!m?.[1]) return null;
  const key = m[1].toLowerCase().replace(/ö/g, "o").replace(/ü/g, "u").replace(/ı/g, "i");
  const mapped = FILENAME_CATEGORY_MAP[key];
  if (mapped) return mapped;
  return mapAhbCategorySlug(slugify(m[1]));
}

function normalizeCategoryLabel(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g");
}

function resolveItemCategorySlug(
  item: AhbHaberItem,
  exportFilter: string[],
  fileHint: string | null,
): string {
  const tax = item.taxonomies?.["haber-kategorisi"]?.[0];
  if (tax?.slug?.trim()) return mapAhbCategorySlug(tax.slug.trim());
  if (tax?.name?.trim()) return mapAhbCategorySlug(slugify(tax.name));
  const ct = (item.categories_text ?? "").split(",")[0]?.trim();
  if (ct) return mapAhbCategorySlug(slugify(ct));
  if (exportFilter[0]?.trim()) return mapAhbCategorySlug(slugify(exportFilter[0]));
  if (fileHint) return mapAhbCategorySlug(fileHint);
  return "gundem";
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

function stripAhbRelatedBlock(html: string): string {
  return html
    .replace(/<div[^>]*class\s*=\s*["'][^"']*ahb-related-news[^"']*["'][\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*class\s*=\s*["'][^"']*ahb-related-news[\s\S]*$/gi, "")
    .trim();
}

function cleanContentHtml(html: string): string {
  let h = String(html ?? "");
  h = h.replace(/<!--\s*\/?wp:[\s\S]*?-->/gi, "");
  h = stripAhbRelatedBlock(h);
  return h.trim();
}

function textSpot(html: string, excerpt: string | undefined, meta: Record<string, string | undefined>, max = 500): string | null {
  const spot = (meta._haber_spot ?? meta._ahb_spot ?? excerpt ?? "").trim();
  if (spot) return spot.slice(0, max);
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return null;
  return plain.slice(0, max);
}

function extractImgUrls(html: string): string[] {
  const urls: string[] = [];
  const re = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const u = m[1]?.trim();
    if (u && /^https?:\/\//i.test(u)) urls.push(u);
  }
  return urls;
}

function featuredUrlForItem(item: AhbHaberItem): string | null {
  const u = item.featured_image_url?.trim() || item.meta?._ahb_resim_url?.trim();
  if (!u) return null;
  if (u.startsWith("//")) return `https:${u}`;
  if (/^https?:\/\//i.test(u)) return u;
  return null;
}

function ahbSourceKey(source: string, itemId: number): string {
  const src = (source || "ahb").trim().toLowerCase();
  return `ahb-haber:${src}:${itemId}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function rewriteHtmlImages(
  html: string,
  cache: Map<string, string>,
  opts: { dryRun: boolean; title: string; log: (s: string) => void; onDownloaded: () => void },
): Promise<string> {
  let out = html;
  const urls = [...new Set(extractImgUrls(html))];
  for (const from of urls) {
    let to = cache.get(from);
    if (!to) {
      if (opts.dryRun) {
        to = from;
      } else {
        try {
          to = (await downloadExternalImageToMedia(from, { title: opts.title, hashSeed: from })) ?? from;
          if (to !== from) {
            opts.onDownloaded();
            cache.set(from, to);
            await sleep(80);
          }
        } catch (e) {
          opts.log(`[görsel] indirilemedi: ${from.slice(0, 60)} — ${e instanceof Error ? e.message : String(e)}`);
          to = from;
        }
      }
      if (!cache.has(from)) cache.set(from, to);
    }
    out = out.split(from).join(to);
  }
  return out;
}

export type MergedAhbHaberBatch = {
  source: string;
  items: AhbHaberItem[];
  fileHints: Map<number, string>;
};

export function mergeAhbHaberExports(
  exports: Array<{ export: AhbHaberExport; filename?: string }>,
): MergedAhbHaberBatch {
  const items: AhbHaberItem[] = [];
  const fileHints = new Map<number, string>();
  let source = "ahb";
  for (const { export: ex, filename } of exports) {
    if (ex.source?.trim()) source = ex.source.trim();
    const filter = Array.isArray(ex.categories_filter) ? ex.categories_filter : [];
    const hint = categorySlugFromFilename(filename);
    const list = Array.isArray(ex.items) ? ex.items : [];
    for (const item of list) {
      items.push(item);
      const slug = resolveItemCategorySlug(item, filter, hint);
      fileHints.set(item.id, slug);
    }
  }
  return { source, items, fileHints };
}

export type HmAhbHaberCategoryOverrideMode = "auto" | "all" | "fallback";

export async function runHmAhbHaberImport(params: {
  siteId: number;
  batch: MergedAhbHaberBatch;
  dryRun: boolean;
  offset: number;
  limit: number;
  imageDelayMs?: number;
  /** true: görseller uzaktan bırakılır (Vercel vekil zaman aşımını önler). */
  skipImages?: boolean;
  /** true: aynı başlıklı haberler yine de eklenir (AHB kimliği tekrarı yine atlanır). */
  allowDuplicateTitles?: boolean;
  log?: (line: string) => void;
  /** Tüm haberler veya eşleşmeyenlerde kullanılacak sabit kategori kimliği. */
  categoryOverrideId?: number | null;
  categoryOverrideSlug?: string | null;
  categoryOverrideMode?: HmAhbHaberCategoryOverrideMode;
}): Promise<HmAhbHaberImportResult> {
  const log = params.log ?? (() => {});
  const warnings: string[] = [];
  const warn = (s: string) => {
    warnings.push(s);
    log(s);
  };

  const {
    categoriesTable,
    dualWriteInsert,
    getNewsDbForRead,
    newsTable,
  } = await import("@workspace/db");
  const db = getNewsDbForRead();
  const { and, eq, or, isNull } = await import("drizzle-orm");

  const siteId = params.siteId;
  const skipImages = params.skipImages === true;
  const allowDuplicateTitles = params.allowDuplicateTitles === true;
  const imageDelayMs = skipImages ? 0 : (params.imageDelayMs ?? 60);
  const allItems = params.batch.items;
  const slice = allItems.slice(params.offset, params.offset + params.limit);
  const hasMore = params.offset + params.limit < allItems.length;
  const nextOffset = hasMore ? params.offset + params.limit : allItems.length;

  const catRows = await db
    .select({ id: categoriesTable.id, slug: categoriesTable.slug, name: categoriesTable.name })
    .from(categoriesTable)
    .where(or(isNull(categoriesTable.exclusiveSiteId), eq(categoriesTable.exclusiveSiteId, siteId)));

  const slugToId = new Map<string, number>();
  const nameToId = new Map<string, number>();
  for (const c of catRows) {
    slugToId.set(c.slug.toLowerCase(), c.id);
    nameToId.set(normalizeCategoryLabel(c.name), c.id);
  }

  function resolveCategoryId(slug: string): number | null {
    const candidates = new Set<string>();
    const base = slug.trim().toLowerCase();
    if (base) {
      candidates.add(base);
      candidates.add(mapAhbCategorySlug(base));
    }
    for (const s of candidates) {
      if (slugToId.has(s)) return slugToId.get(s)!;
      const norm = normalizeCategoryLabel(s.replace(/-/g, " "));
      if (nameToId.has(norm)) return nameToId.get(norm)!;
    }
    return null;
  }

  const overrideMode: HmAhbHaberCategoryOverrideMode = params.categoryOverrideMode ?? "auto";
  let fixedOverrideId: number | null = null;
  if (overrideMode !== "auto") {
    if (params.categoryOverrideId != null && params.categoryOverrideId > 0) {
      fixedOverrideId = params.categoryOverrideId;
    } else if (params.categoryOverrideSlug?.trim()) {
      fixedOverrideId = resolveCategoryId(params.categoryOverrideSlug.trim());
    }
    if (fixedOverrideId != null && !catRows.some((c) => c.id === fixedOverrideId)) {
      fixedOverrideId = null;
    }
    if (fixedOverrideId == null) {
      warn(
        `[kategori] Geçersiz kategori geçersiz kılması (mode=${overrideMode}); JSON eşlemesi kullanılacak.`,
      );
    }
  }

  function resolveItemCategory(
    jsonSlug: string,
  ): { categoryId: number | null; categorySlug: string; categoryResolved: boolean } {
    const jsonId = resolveCategoryId(jsonSlug);
    if (overrideMode === "all" && fixedOverrideId != null) {
      const fixedSlug =
        catRows.find((c) => c.id === fixedOverrideId)?.slug?.toLowerCase() ?? jsonSlug;
      return { categoryId: fixedOverrideId, categorySlug: fixedSlug, categoryResolved: true };
    }
    if (overrideMode === "fallback" && fixedOverrideId != null) {
      if (jsonId != null) {
        return { categoryId: jsonId, categorySlug: jsonSlug, categoryResolved: true };
      }
      const fixedSlug =
        catRows.find((c) => c.id === fixedOverrideId)?.slug?.toLowerCase() ?? jsonSlug;
      return { categoryId: fixedOverrideId, categorySlug: fixedSlug, categoryResolved: true };
    }
    return {
      categoryId: jsonId,
      categorySlug: jsonSlug,
      categoryResolved: jsonId != null,
    };
  }

  const existingSlugs = new Set<string>();
  const existingTitles = new Set<string>();
  const titleRows = await db
    .select({ title: newsTable.title })
    .from(newsTable)
    .where(eq(newsTable.siteId, siteId));
  for (const r of titleRows) {
    const n = normalizeNewsTitle(r.title);
    if (n) existingTitles.add(n);
  }

  if (!params.dryRun) {
    const slugRows = await db
      .select({ slug: newsTable.slug })
      .from(newsTable)
      .where(eq(newsTable.siteId, siteId));
    for (const r of slugRows) existingSlugs.add(r.slug);
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

  const preview: HmAhbHaberImportPreviewItem[] = [];
  let newsAdded = 0;
  let newsSkipped = 0;
  let skippedDuplicates = 0;
  let imagesDownloaded = 0;
  const urlCache = new Map<string, string>();

  const sorted = [...slice].sort(
    (a, b) => parseExportDate(a.date).getTime() - parseExportDate(b.date).getTime(),
  );

  for (const item of sorted) {
    const title = String(item.title ?? "").trim();
    const categorySlug = params.batch.fileHints.get(item.id) ?? "gundem";
    const { categoryId, categorySlug: effectiveSlug, categoryResolved } =
      resolveItemCategory(categorySlug);
    const feat = featuredUrlForItem(item);
    const bodyUrls = extractImgUrls(String(item.content ?? ""));

    if (!title) {
      newsSkipped += 1;
      if (params.dryRun) {
        preview.push({
          id: item.id,
          title: "(boş başlık)",
          slug: item.slug,
          categorySlug: effectiveSlug,
          categoryResolved,
          status: item.status,
          date: item.date,
          hasFeaturedImage: !!feat,
          imageCountInBody: bodyUrls.length,
          skipReason: "boş başlık",
        });
      }
      continue;
    }

    const normalizedTitle = normalizeNewsTitle(title);
    if (!allowDuplicateTitles && normalizedTitle && existingTitles.has(normalizedTitle)) {
      skippedDuplicates += 1;
      newsSkipped += 1;
      if (params.dryRun) {
        preview.push({
          id: item.id,
          title: title.slice(0, 120),
          slug: item.slug,
          categorySlug: effectiveSlug,
          categoryResolved,
          status: item.status,
          date: item.date,
          hasFeaturedImage: !!feat,
          imageCountInBody: bodyUrls.length,
          skipReason: "atlanacak (aynı başlık)",
        });
      } else {
        log(`[haber] atlandı (aynı başlık): ${title.slice(0, 70)}`);
      }
      continue;
    }

    if (params.dryRun) {
      if (normalizedTitle) existingTitles.add(normalizedTitle);
      preview.push({
        id: item.id,
        title: title.slice(0, 120),
        slug: item.slug,
        categorySlug: effectiveSlug,
        categoryResolved,
        status: item.status,
        date: item.date,
        hasFeaturedImage: !!feat,
        imageCountInBody: bodyUrls.length,
      });
      continue;
    }

    const dedupeKey = ahbSourceKey(params.batch.source, item.id);
    const [dup] = await db
      .select({ id: newsTable.id })
      .from(newsTable)
      .where(and(eq(newsTable.siteId, siteId), eq(newsTable.rssSourceUrl, dedupeKey)))
      .limit(1);
    if (dup) {
      newsSkipped += 1;
      continue;
    }

    let rawHtml = cleanContentHtml(String(item.content ?? ""));
    if (!rawHtml.trim()) rawHtml = `<p>${title}</p>`;

    if (!skipImages) {
      rawHtml = await rewriteHtmlImages(rawHtml, urlCache, {
        dryRun: false,
        title,
        log: warn,
        onDownloaded: () => {
          imagesDownloaded += 1;
        },
      });
    }

    let imageUrl: string | null = null;
    const featUrl = featuredUrlForItem(item);
    if (featUrl) {
      if (skipImages) {
        imageUrl = featUrl.startsWith("//") ? `https:${featUrl}` : featUrl;
      } else {
        let local: string | undefined = urlCache.get(featUrl);
        if (!local) {
          try {
            const saved = await downloadExternalImageToMedia(featUrl, { title, hashSeed: featUrl });
            if (saved) {
              local = saved;
              urlCache.set(featUrl, saved);
              imagesDownloaded += 1;
              await sleep(imageDelayMs);
            }
          } catch (e) {
            warn(`[kapak] ${title.slice(0, 40)}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
        imageUrl = local ?? null;
      }
    }
    if (!imageUrl) {
      const localM = rawHtml.match(/src\s*=\s*["'](\/api\/media\/uploads\/[^"']+)["']/i);
      if (localM?.[1]) imageUrl = localM[1];
    }

    if (!categoryId) {
      warn(`[kategori] eşleşmedi slug=${effectiveSlug}: ${title.slice(0, 50)}`);
    }

    const status = item.status === "publish" ? "published" : "draft";
    const when = parseExportDate(item.date ?? item.date_gmt);
    const slug = allocSlug(item.slug || title);
    const spot = textSpot(rawHtml, item.excerpt, item.meta ?? {});
    const tags = (item.taxonomies?.["haber-etiketi"] ?? [])
      .map((t) => t.name?.trim())
      .filter((x): x is string => !!x)
      .slice(0, 12);

    await dualWriteInsert(newsTable, {
      title,
      slug,
      spot,
      content: rawHtml,
      imageUrl,
      categoryId,
      status,
      isFeatured: false,
      isBreaking: false,
      tags: tags.length ? tags : ["ahb-import"],
      siteId,
      rssSourceUrl: dedupeKey,
      isEditorManual: true,
      createdAt: when,
      updatedAt: when,
    });
    if (normalizedTitle) existingTitles.add(normalizedTitle);
    newsAdded += 1;
    log(`[haber] + ${title.slice(0, 70)} (${effectiveSlug})`);
    if (!skipImages && imageDelayMs > 0) await sleep(imageDelayMs);
  }

  return {
    itemsTotal: allItems.length,
    itemsProcessed: slice.length,
    newsAdded,
    newsSkipped,
    skippedDuplicates,
    imagesDownloaded,
    warnings,
    preview: params.dryRun ? preview : undefined,
    hasMore,
    nextOffset,
  };
}
