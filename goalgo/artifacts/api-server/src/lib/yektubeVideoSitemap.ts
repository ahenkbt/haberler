import { and, desc, eq, sql } from "drizzle-orm";
import { getYektubeDbForRead, videosTable } from "@workspace/db";
import { canonicalSitemapOrigin } from "./site-public-origin.js";
import { yektubeWatchPath } from "./yektubeSlugUrls.js";

const db = getYektubeDbForRead();
export const YEKTUBE_SITEMAP_PAGE_SIZE = 500;

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Google video sitemap: duration tamsayı saniye (ISO 8601 PT… değil). */
function videoDurationSeconds(duration: string | null | undefined): number | null {
  const sec = parseDurationSeconds(duration);
  if (sec == null || sec <= 0) return null;
  return Math.min(Math.floor(sec), 28800);
}

function resolveVideoPublicationIso(row: {
  publishedAt?: string | null;
  createdAt?: Date | string | null;
}): string | null {
  for (const raw of [row.publishedAt, row.createdAt]) {
    if (raw == null || String(raw).trim() === "") continue;
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}
function parseDurationSeconds(duration: string | null | undefined): number | null {
  const raw = (duration ?? "").trim();
  if (!raw) return null;
  const parts = raw.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
  return parts[0] ?? null;
}

const yektubeSitemapEligibleWhere = and(
  eq(videosTable.active, true),
  eq(videosTable.embedAllowed, true),
  sql`${videosTable.sourceId} IS NOT NULL AND ${videosTable.sourceId} > 0`,
  sql`COALESCE(NULLIF(trim(${videosTable.thumbnail}), ''), '') <> ''`,
  sql`COALESCE(NULLIF(trim(${videosTable.videoId}), ''), '') <> ''`,
  sql`(${videosTable.publishedAt} IS NOT NULL AND trim(${videosTable.publishedAt}) <> '' OR ${videosTable.createdAt} IS NOT NULL)`,
);

export async function countYektubeVideosForSitemap(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(videosTable)
    .where(yektubeSitemapEligibleWhere);
  return Number(row?.count ?? 0);
}

export async function countYektubeVideosOnSitemapPage(page: number): Promise<number> {
  const pageIndex = Math.max(1, page);
  const offset = (pageIndex - 1) * YEKTUBE_SITEMAP_PAGE_SIZE;
  const r = await db.execute(sql`
    SELECT count(*)::int AS count FROM (
      SELECT id FROM videos
      WHERE active = true
        AND embed_allowed = true
        AND source_id IS NOT NULL AND source_id > 0
        AND COALESCE(NULLIF(trim(thumbnail), ''), '') <> ''
        AND COALESCE(NULLIF(trim(video_id), ''), '') <> ''
        AND (published_at IS NOT NULL AND trim(published_at) <> '' OR created_at IS NOT NULL)
      ORDER BY id DESC
      LIMIT ${YEKTUBE_SITEMAP_PAGE_SIZE}
      OFFSET ${offset}
    ) sub
  `);
  return Number((r.rows?.[0] as { count?: number } | undefined)?.count ?? 0);
}

export async function buildYektubeVideoSitemapXml(baseOrigin: string, page: number): Promise<string> {
  const origin = canonicalSitemapOrigin(baseOrigin);
  const pageIndex = Math.max(1, page);
  const offset = (pageIndex - 1) * YEKTUBE_SITEMAP_PAGE_SIZE;

  const rows = await db
    .select()
    .from(videosTable)
    .where(yektubeSitemapEligibleWhere)
    .orderBy(desc(videosTable.id))
    .limit(YEKTUBE_SITEMAP_PAGE_SIZE)
    .offset(offset);

  const attrs =
    'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"';

  const blocks: string[] = [];
  for (const row of rows) {
    const channelName = row.channelName?.trim() || "Kanal";
    const displayTitle = (row.seoTitle?.trim() || row.title).slice(0, 100);
    const displayDesc = (
      row.seoDescription?.trim() ||
      row.description?.trim() ||
      `${displayTitle} — ${channelName} | Yektube Türkiye`
    ).slice(0, 2048);
    const loc = yektubeWatchPath(origin, row.sourceId!, channelName, row.videoId, row.title);
    // GSC: player_loc / content_loc <loc> ile aynı olamaz; YouTube için embed player kullanılır.
    // content_loc yalnızca gerçek medya dosyası içindir — watch?v= URL’leri yazılmaz.
    const playerLoc = `https://www.youtube.com/embed/${encodeURIComponent(row.videoId)}`;
    const thumb = row.thumbnail?.trim();
    const pubIso = resolveVideoPublicationIso(row);
    if (!thumb || !pubIso) continue;

    const sec = videoDurationSeconds(row.duration);
    const category = String(row.categorySlug ?? "video").trim() || "video";
    const lines = [
      "  <url>",
      `    <loc>${escXml(loc)}</loc>`,
      "    <video:video>",
      `      <video:thumbnail_loc>${escXml(thumb)}</video:thumbnail_loc>`,
      `      <video:title>${escXml(displayTitle)}</video:title>`,
      `      <video:description>${escXml(displayDesc)}</video:description>`,
      `      <video:player_loc allow_embed="yes">${escXml(playerLoc)}</video:player_loc>`,
      `      <video:publication_date>${pubIso}</video:publication_date>`,
      `      <video:family_friendly>yes</video:family_friendly>`,
      `      <video:requires_subscription>no</video:requires_subscription>`,
      `      <video:live>no</video:live>`,
    ];
    if (sec != null) lines.push(`      <video:duration>${sec}</video:duration>`);
    lines.push("      <video:tag>Türkiye</video:tag>");
    lines.push(`      <video:category>${escXml(category)}</video:category>`);
    lines.push("    </video:video>", "  </url>");
    blocks.push(lines.filter(Boolean).join("\n"));
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${attrs}>\n${blocks.join("\n")}\n</urlset>`;
}

export function buildYektubeStaticSitemapXml(baseOrigin: string): string {
  const origin = canonicalSitemapOrigin(baseOrigin);
  const paths = ["/yp/", "/yp/cocuk", "/yp/muzik", "/yp/canli", "/yp/yekcek", "/yp/ara", "/yp/telif-kullanim"];
  const urls = paths
    .map((p) => {
      const loc = `${origin}${p}`;
      return [
        "  <url>",
        `    <loc>${escXml(loc)}</loc>`,
        "    <changefreq>daily</changefreq>",
        "    <priority>0.8</priority>",
        "  </url>",
      ].join("\n");
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}
