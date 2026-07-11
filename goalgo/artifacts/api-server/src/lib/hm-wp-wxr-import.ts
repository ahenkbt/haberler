import { downloadExternalImageToMediaDetailed } from "./mediaUploadService";
import { slugify } from "./news-context";

export type WpWxrCategoryRef = {
  domain: string;
  nicename: string;
  name: string;
};

export type WpWxrItem = {
  postId: number;
  title: string;
  slug: string;
  link: string;
  guid: string;
  creator: string;
  content: string;
  excerpt: string;
  postType: string;
  status: string;
  postDate: string;
  postDateGmt: string;
  pubDate: string;
  parentId: number;
  categories: WpWxrCategoryRef[];
  meta: Record<string, string[]>;
  attachmentUrl: string | null;
};

export type HmWordPressImportPreviewItem = {
  id: number;
  title: string;
  slug: string;
  date?: string;
  author?: string;
  wpCategories: string[];
  hasFeaturedImage: boolean;
  imageCountInBody: number;
  skipReason?: string;
};

export type HmWordPressImportSkippedItemCount = {
  postType: string;
  status: string;
  count: number;
  reason: string;
};

export type HmWordPressImportResult = {
  wxrItemsTotal: number;
  eligiblePostsTotal: number;
  skippedItemCounts: HmWordPressImportSkippedItemCount[];
  itemsTotal: number;
  itemsProcessed: number;
  newsAdded: number;
  newsSkipped: number;
  skippedDuplicates: number;
  imagesDownloaded: number;
  imagesFailed: number;
  imagesSkipped: number;
  warnings: string[];
  preview?: HmWordPressImportPreviewItem[];
  hasMore: boolean;
  nextOffset: number;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

function unwrapXmlPayload(raw: string): string {
  let out = String(raw ?? "").trim();
  out = out.replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "");
  return decodeXmlEntities(out);
}

function tagValue(block: string, tagName: string): string {
  const re = new RegExp(`<${escapeRegExp(tagName)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`, "i");
  const m = block.match(re);
  return m?.[1] ? unwrapXmlPayload(m[1]) : "";
}

function attrValue(attrs: string, name: string): string {
  const re = new RegExp(`${escapeRegExp(name)}\\s*=\\s*["']([^"']*)["']`, "i");
  const m = attrs.match(re);
  return m?.[1] ? decodeXmlEntities(m[1]).trim() : "";
}

function parseIntTag(block: string, tagName: string): number {
  const n = parseInt(tagValue(block, tagName), 10);
  return Number.isFinite(n) ? n : 0;
}

function parsePostMeta(block: string): Record<string, string[]> {
  const meta: Record<string, string[]> = {};
  const re = /<wp:postmeta\b[^>]*>([\s\S]*?)<\/wp:postmeta>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const raw = m[1] ?? "";
    const key = tagValue(raw, "wp:meta_key").trim();
    const value = tagValue(raw, "wp:meta_value").trim();
    if (!key) continue;
    if (!meta[key]) meta[key] = [];
    meta[key].push(value);
  }
  return meta;
}

function parseCategories(block: string): WpWxrCategoryRef[] {
  const out: WpWxrCategoryRef[] = [];
  const re = /<category\b([^>]*)>([\s\S]*?)<\/category>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const attrs = m[1] ?? "";
    const name = unwrapXmlPayload(m[2] ?? "").trim();
    out.push({
      domain: attrValue(attrs, "domain"),
      nicename: attrValue(attrs, "nicename"),
      name,
    });
  }
  return out;
}

function normalizeHttpUrl(raw: string, baseUrl?: string | null): string | null {
  const t = decodeXmlEntities(String(raw ?? "").trim());
  if (!t) return null;
  if (t.startsWith("//")) return `https:${t}`;
  if (/^https?:\/\//i.test(t)) return t;
  if (!baseUrl) return null;
  try {
    return new URL(t, baseUrl).toString();
  } catch {
    return null;
  }
}

function parseWxrItems(xml: string): WpWxrItem[] {
  const items: WpWxrItem[] = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1] ?? "";
    items.push({
      postId: parseIntTag(block, "wp:post_id"),
      title: tagValue(block, "title").trim(),
      slug: tagValue(block, "wp:post_name").trim(),
      link: tagValue(block, "link").trim(),
      guid: tagValue(block, "guid").trim(),
      creator: tagValue(block, "dc:creator").trim(),
      content: tagValue(block, "content:encoded"),
      excerpt: tagValue(block, "excerpt:encoded"),
      postType: tagValue(block, "wp:post_type").trim().toLowerCase(),
      status: tagValue(block, "wp:status").trim().toLowerCase(),
      postDate: tagValue(block, "wp:post_date").trim(),
      postDateGmt: tagValue(block, "wp:post_date_gmt").trim(),
      pubDate: tagValue(block, "pubDate").trim(),
      parentId: parseIntTag(block, "wp:post_parent"),
      categories: parseCategories(block),
      meta: parsePostMeta(block),
      attachmentUrl: tagValue(block, "wp:attachment_url").trim() || null,
    });
  }
  return items;
}

function parseWxrBaseUrl(xml: string): string | null {
  return (
    tagValue(xml, "wp:base_blog_url").trim() ||
    tagValue(xml, "wp:base_site_url").trim() ||
    tagValue(xml, "link").trim() ||
    null
  );
}

function normalizeSourceToken(baseUrl: string | null): string {
  const raw = String(baseUrl ?? "wordpress").trim();
  try {
    const u = new URL(raw);
    return `${u.hostname}${u.pathname}`.replace(/\/+$/, "") || "wordpress";
  } catch {
    return raw.replace(/^https?:\/\//i, "").replace(/\/+$/, "") || "wordpress";
  }
}

function sourceKey(sourceToken: string, item: WpWxrItem): string {
  const primary = item.postId > 0 ? String(item.postId) : item.guid || item.link || item.slug || item.title;
  return `wp-wxr:${sourceToken}:${primary}`.slice(0, 900);
}

function normalizeTitle(title: string): string {
  return String(title ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function cleanContentHtml(html: string): string {
  return String(html ?? "")
    .replace(/<!--\s*\/?wp:[\s\S]*?-->/gi, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .trim();
}

function textSpot(html: string, excerpt: string, max = 500): string | null {
  const ex = cleanContentHtml(excerpt).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (ex) return ex.slice(0, max);
  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain ? plain.slice(0, max) : null;
}

function parseExportDate(item: WpWxrItem): Date {
  const raw = item.postDate || item.postDateGmt || item.pubDate;
  if (!raw) return new Date();
  const wp = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (wp) {
    return new Date(
      Number(wp[1]),
      Number(wp[2]) - 1,
      Number(wp[3]),
      Number(wp[4]),
      Number(wp[5]),
      Number(wp[6]),
    );
  }
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : new Date();
}

type ImgSrcRef = {
  raw: string;
  normalized: string;
};

function extractImgSrcRefs(html: string, baseUrl: string | null): ImgSrcRef[] {
  const refs: ImgSrcRef[] = [];
  const seen = new Set<string>();
  const re = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = String(m[1] ?? "").trim();
    const normalized = normalizeHttpUrl(raw, baseUrl);
    if (!raw || !normalized) continue;
    const key = `${raw}\u0000${normalized}`;
    if (seen.has(key)) continue;
    refs.push({ raw, normalized });
    seen.add(key);
  }
  return refs;
}

function extractImgUrls(html: string, baseUrl: string | null): string[] {
  const urls: string[] = [];
  for (const ref of extractImgSrcRefs(html, baseUrl)) {
    if (!urls.includes(ref.normalized)) urls.push(ref.normalized);
  }
  return urls;
}

function uploadUrlFromAttachedFile(baseUrl: string | null, attachedFile: string | undefined): string | null {
  const raw = String(attachedFile ?? "").trim();
  if (!raw || !baseUrl) return null;
  if (/^(?:https?:)?\/\//i.test(raw)) return normalizeHttpUrl(raw, baseUrl);
  try {
    const base = new URL(baseUrl);
    const clean = raw.replace(/^\/+/, "");
    if (/^wp-content\/uploads\//i.test(clean)) return `${base.origin}/${clean}`;
    if (raw.startsWith("/")) return normalizeHttpUrl(raw, baseUrl);
    return `${base.origin}/wp-content/uploads/${clean}`;
  } catch {
    return null;
  }
}

function sourceMetaComment(item: WpWxrItem): string {
  const meta = {
    source: "wordpress-wxr",
    postId: item.postId || undefined,
    guid: item.guid || undefined,
    link: item.link || undefined,
    author: item.creator || undefined,
  };
  return `\n<!-- ${JSON.stringify(meta).replace(/--/g, "")} -->`;
}

async function rewriteHtmlImages(
  html: string,
  baseUrl: string | null,
  cache: Map<string, string>,
  opts: {
    skipImages: boolean;
    title: string;
    log: (line: string) => void;
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
      if (opts.skipImages) {
        to = from;
        opts.onSkipped();
      } else {
        try {
          const saved = await downloadExternalImageToMediaDetailed(from, {
            title: opts.title,
            hashSeed: from,
          });
          if (saved.ok) {
            to = saved.url;
            opts.onDownloaded();
          } else {
            to = from;
            opts.onFailed();
            opts.log(`[görsel] indirilemedi: ${from.slice(0, 90)} — ${saved.error}`);
          }
        } catch (e) {
          to = from;
          opts.onFailed();
          opts.log(`[görsel] indirilemedi: ${from.slice(0, 90)} — ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      cache.set(from, to);
    }
    out = out.split(from).join(to);
    for (const ref of refs) {
      out = out.split(ref.raw).join(to);
      const decodedRaw = decodeXmlEntities(ref.raw);
      if (decodedRaw !== ref.raw) out = out.split(decodedRaw).join(to);
    }
  }
  return out;
}

function firstMeta(meta: Record<string, string[]>, key: string): string | null {
  const v = meta[key]?.find((x) => String(x ?? "").trim());
  return v ? String(v).trim() : null;
}

function findFeaturedImageUrl(
  item: WpWxrItem,
  attachmentsById: Map<number, string>,
  attachmentsByParent: Map<number, string[]>,
  html: string,
  baseUrl: string | null,
): string | null {
  const thumbId = parseInt(firstMeta(item.meta, "_thumbnail_id") ?? "", 10);
  if (Number.isFinite(thumbId) && attachmentsById.has(thumbId)) return attachmentsById.get(thumbId)!;
  const og =
    firstMeta(item.meta, "_yoast_wpseo_opengraph-image") ??
    firstMeta(item.meta, "rank_math_facebook_image") ??
    firstMeta(item.meta, "_jetpack_featured_media_url") ??
    firstMeta(item.meta, "featured_image") ??
    firstMeta(item.meta, "image");
  const ogUrl = normalizeHttpUrl(og ?? "", baseUrl);
  if (ogUrl) return ogUrl;
  const attached = attachmentsByParent.get(item.postId)?.[0];
  if (attached) return attached;
  return extractImgUrls(html, baseUrl)[0] ?? null;
}

function buildAttachmentMaps(items: WpWxrItem[], baseUrl: string | null): {
  byId: Map<number, string>;
  byParent: Map<number, string[]>;
} {
  const byId = new Map<number, string>();
  const byParent = new Map<number, string[]>();
  for (const item of items) {
    if (item.postType !== "attachment") continue;
    const direct = normalizeHttpUrl(item.attachmentUrl ?? "", baseUrl);
    const fromMeta = uploadUrlFromAttachedFile(baseUrl, firstMeta(item.meta, "_wp_attached_file") ?? undefined);
    const url = direct ?? fromMeta ?? normalizeHttpUrl(item.guid || item.link, baseUrl);
    if (!url) continue;
    if (item.postId > 0) byId.set(item.postId, url);
    if (item.parentId > 0) {
      const list = byParent.get(item.parentId) ?? [];
      list.push(url);
      byParent.set(item.parentId, list);
    }
  }
  return { byId, byParent };
}

function skippedItemReason(item: Pick<WpWxrItem, "postType" | "status">): string {
  if (item.postType !== "post") return "post olmayan WXR öğesi";
  if (item.status !== "publish") return "yayında olmayan WordPress yazısı";
  return "";
}

function summarizeSkippedItems(items: WpWxrItem[]): HmWordPressImportSkippedItemCount[] {
  const counts = new Map<string, HmWordPressImportSkippedItemCount>();
  for (const item of items) {
    if (item.postType === "post" && item.status === "publish") continue;
    const postType = item.postType || "(boş)";
    const status = item.status || "(boş)";
    const key = `${postType}\u0000${status}`;
    const prev =
      counts.get(key) ??
      ({
        postType,
        status,
        count: 0,
        reason: skippedItemReason({ postType, status }),
      } satisfies HmWordPressImportSkippedItemCount);
    prev.count += 1;
    counts.set(key, prev);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.postType.localeCompare(b.postType));
}

export function parseWordPressWxr(xml: string): { baseUrl: string | null; posts: WpWxrItem[]; allItems: WpWxrItem[] } {
  const allItems = parseWxrItems(xml);
  const posts = allItems.filter((item) => item.postType === "post" && item.status === "publish");
  return { baseUrl: parseWxrBaseUrl(xml), posts, allItems };
}

export async function runHmWordPressWxrImport(params: {
  siteId: number;
  xml: string;
  categoryId: number;
  dryRun: boolean;
  offset: number;
  limit: number;
  skipImages?: boolean;
  log?: (line: string) => void;
}): Promise<HmWordPressImportResult> {
  const log = params.log ?? (() => {});
  const warnings: string[] = [];
  const warn = (line: string) => {
    warnings.push(line);
    log(line);
  };

  const { categoriesTable, dualWriteInsert, getNewsDbForRead, newsTable } = await import("@workspace/db");
  const db = getNewsDbForRead();
  const { and, eq } = await import("drizzle-orm");

  const categoryId = Number(params.categoryId);
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    throw new Error("Geçerli bir hedef kategori seçin.");
  }

  const [category] = await db
    .select({ id: categoriesTable.id, name: categoriesTable.name, slug: categoriesTable.slug })
    .from(categoriesTable)
    .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.exclusiveSiteId, params.siteId)))
    .limit(1);
  if (!category) {
    throw new Error("Seçilen kategori bu haber sitesi için geçerli değil.");
  }

  const parsed = parseWordPressWxr(params.xml);
  const { byId: attachmentsById, byParent: attachmentsByParent } = buildAttachmentMaps(parsed.allItems, parsed.baseUrl);
  const allPosts = parsed.posts;
  const skippedItemCounts = summarizeSkippedItems(parsed.allItems);
  const slice = allPosts.slice(params.offset, params.offset + params.limit);
  const hasMore = params.offset + params.limit < allPosts.length;
  const nextOffset = hasMore ? params.offset + params.limit : allPosts.length;
  const sourceToken = normalizeSourceToken(parsed.baseUrl);

  const existingRows = await db
    .select({ title: newsTable.title, slug: newsTable.slug, rssSourceUrl: newsTable.rssSourceUrl })
    .from(newsTable)
    .where(eq(newsTable.siteId, params.siteId));
  const existingTitles = new Set<string>();
  const existingSlugs = new Set<string>();
  const existingSources = new Set<string>();
  for (const row of existingRows) {
    const title = normalizeTitle(row.title);
    if (title) existingTitles.add(title);
    if (row.slug) existingSlugs.add(String(row.slug).trim().toLowerCase());
    if (row.rssSourceUrl) existingSources.add(String(row.rssSourceUrl).trim());
  }

  const sorted = [...slice].sort((a, b) => parseExportDate(a).getTime() - parseExportDate(b).getTime());
  const preview: HmWordPressImportPreviewItem[] = [];
  const urlCache = new Map<string, string>();
  let newsAdded = 0;
  let newsSkipped = 0;
  let skippedDuplicates = 0;
  let imagesDownloaded = 0;
  let imagesFailed = 0;
  let imagesSkipped = 0;

  for (const item of sorted) {
    const title = item.title.trim();
    let html = cleanContentHtml(item.content);
    const slug = slugify(item.slug || title);
    const normalizedTitle = normalizeTitle(title);
    const source = sourceKey(sourceToken, item);
    const featured = findFeaturedImageUrl(item, attachmentsById, attachmentsByParent, html, parsed.baseUrl);
    const bodyUrls = extractImgUrls(html, parsed.baseUrl);
    const duplicateReason =
      existingSources.has(source)
        ? "atlanacak (aynı WordPress kaynağı)"
        : slug && existingSlugs.has(slug)
          ? "atlanacak (aynı slug)"
          : normalizedTitle && existingTitles.has(normalizedTitle)
            ? "atlanacak (aynı başlık)"
            : "";

    if (!title || !slug) {
      newsSkipped += 1;
      if (params.dryRun) {
        preview.push({
          id: item.postId,
          title: title || "(boş başlık)",
          slug: slug || "(slug yok)",
          date: item.postDate || item.pubDate,
          author: item.creator || undefined,
          wpCategories: item.categories.map((c) => c.name).filter(Boolean),
          hasFeaturedImage: !!featured,
          imageCountInBody: bodyUrls.length,
          skipReason: "boş başlık/slug",
        });
      }
      continue;
    }

    if (duplicateReason) {
      skippedDuplicates += 1;
      newsSkipped += 1;
      if (params.dryRun) {
        preview.push({
          id: item.postId,
          title: title.slice(0, 120),
          slug,
          date: item.postDate || item.pubDate,
          author: item.creator || undefined,
          wpCategories: item.categories.map((c) => c.name).filter(Boolean),
          hasFeaturedImage: !!featured,
          imageCountInBody: bodyUrls.length,
          skipReason: duplicateReason,
        });
      } else {
        log(`[haber] ${duplicateReason}: ${title.slice(0, 70)}`);
      }
      continue;
    }

    if (params.dryRun) {
      existingSources.add(source);
      existingSlugs.add(slug);
      if (normalizedTitle) existingTitles.add(normalizedTitle);
      preview.push({
        id: item.postId,
        title: title.slice(0, 120),
        slug,
        date: item.postDate || item.pubDate,
        author: item.creator || undefined,
        wpCategories: item.categories.map((c) => c.name).filter(Boolean),
        hasFeaturedImage: !!featured,
        imageCountInBody: bodyUrls.length,
      });
      continue;
    }

    if (!html.trim()) html = `<p>${title}</p>`;
    html = await rewriteHtmlImages(html, parsed.baseUrl, urlCache, {
      skipImages: params.skipImages === true,
      title,
      log: warn,
      onDownloaded: () => {
        imagesDownloaded += 1;
      },
      onFailed: () => {
        imagesFailed += 1;
      },
      onSkipped: () => {
        imagesSkipped += 1;
      },
    });

    let imageUrl: string | null = null;
    if (featured) {
      if (params.skipImages === true) {
        imageUrl = featured;
        if (!urlCache.has(featured)) {
          urlCache.set(featured, featured);
          imagesSkipped += 1;
        }
      } else {
        const cached = urlCache.get(featured);
        if (cached) {
          imageUrl = cached;
        } else {
          try {
            const saved = await downloadExternalImageToMediaDetailed(featured, {
              title,
              hashSeed: featured,
            });
            if (saved.ok) {
              imageUrl = saved.url;
              urlCache.set(featured, saved.url);
              imagesDownloaded += 1;
            } else {
              imageUrl = featured;
              urlCache.set(featured, featured);
              imagesFailed += 1;
              warn(`[kapak] indirilemedi: ${featured.slice(0, 90)} — ${saved.error}`);
            }
          } catch (e) {
            imageUrl = featured;
            urlCache.set(featured, featured);
            imagesFailed += 1;
            warn(`[kapak] indirilemedi: ${featured.slice(0, 90)} — ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
    }
    if (!imageUrl) {
      const localM = html.match(/src\s*=\s*["'](\/api\/media\/uploads\/[^"']+)["']/i);
      if (localM?.[1]) imageUrl = localM[1];
    }
    if (!imageUrl) {
      imageUrl = extractImgUrls(html, parsed.baseUrl)[0] ?? null;
    }

    const when = parseExportDate(item);
    const tags = [
      "wp-import",
      ...item.categories.map((c) => c.name || c.nicename).filter(Boolean),
      item.creator ? `wp-author:${item.creator}` : "",
    ]
      .filter(Boolean)
      .slice(0, 16);

    await dualWriteInsert(newsTable, {
      title,
      slug,
      spot: textSpot(html, item.excerpt),
      content: `${html}${sourceMetaComment(item)}`,
      imageUrl,
      categoryId: category.id,
      status: "published",
      isFeatured: false,
      isBreaking: false,
      tags,
      siteId: params.siteId,
      rssSourceUrl: source,
      isEditorManual: true,
      createdAt: when,
      updatedAt: when,
    });

    existingSources.add(source);
    existingSlugs.add(slug);
    if (normalizedTitle) existingTitles.add(normalizedTitle);
    newsAdded += 1;
    log(`[haber] + ${title.slice(0, 70)} (${category.slug})`);
  }

  return {
    wxrItemsTotal: parsed.allItems.length,
    eligiblePostsTotal: allPosts.length,
    skippedItemCounts,
    itemsTotal: allPosts.length,
    itemsProcessed: slice.length,
    newsAdded,
    newsSkipped,
    skippedDuplicates,
    imagesDownloaded,
    imagesFailed,
    imagesSkipped,
    warnings,
    preview: params.dryRun ? preview : undefined,
    hasMore,
    nextOffset,
  };
}
