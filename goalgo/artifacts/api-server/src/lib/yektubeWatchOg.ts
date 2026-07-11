import { and, eq } from "drizzle-orm";
import { getYektubeDbForRead, videosTable } from "@workspace/db";
import { resolveVideoSeoMeta } from "./yektubeVideoSeo.js";
import { renderWatchOgHtml } from "./yektubeOgHtml.js";
import { resolveVideoSourceByRef } from "./yektubeSourceResolve.js";
import { yektubeWatchPath } from "./yektubeSlugUrls.js";

const yektubeDb = getYektubeDbForRead();
const YT_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function parseYoutubeVideoRef(ref: string): string {
  const raw = decodeURIComponent(ref.trim());
  if (YT_VIDEO_ID.test(raw)) return raw;
  const dashed = raw.match(/-([A-Za-z0-9_-]{11})$/);
  if (dashed?.[1] && YT_VIDEO_ID.test(dashed[1])) return dashed[1];
  const tail11 = raw.match(/([A-Za-z0-9_-]{11})$/);
  if (tail11?.[1] && YT_VIDEO_ID.test(tail11[1])) return tail11[1];
  const embedded = raw.match(/(?:^|[^A-Za-z0-9_-])([A-Za-z0-9_-]{11})(?:[^A-Za-z0-9_-]|$)/);
  if (embedded?.[1] && YT_VIDEO_ID.test(embedded[1])) return embedded[1];
  return raw;
}

const WATCH_PATH = /^(?:\/yp|\/yektube-v2)?\/kanal\/([^/?#]+)\/([^/?#]+)\/?$/;

export function parseYektubeWatchPath(pathname: string): { channelRef: string; videoRef: string } | null {
  const clean = String(pathname ?? "").replace(/\/+$/, "") || "/";
  const m = clean.match(WATCH_PATH);
  if (!m?.[1] || !m[2]) return null;
  try {
    return {
      channelRef: decodeURIComponent(m[1]).trim(),
      videoRef: decodeURIComponent(m[2]).trim(),
    };
  } catch {
    return null;
  }
}

export function isYektubeWatchOgPath(pathname: string): boolean {
  return Boolean(parseYektubeWatchPath(pathname));
}

export async function renderYektubeWatchOgByPath(opts: {
  pathname: string;
  origin: string;
}): Promise<string | null> {
  const parsed = parseYektubeWatchPath(opts.pathname);
  if (!parsed) return null;

  const youtubeVideoId = parseYoutubeVideoRef(parsed.videoRef);
  if (!youtubeVideoId || youtubeVideoId.length < 6) return null;

  const source = await resolveVideoSourceByRef(parsed.channelRef);
  const [video] = source
    ? await yektubeDb
        .select()
        .from(videosTable)
        .where(and(eq(videosTable.sourceId, source.id), eq(videosTable.videoId, youtubeVideoId)))
        .limit(1)
    : await yektubeDb.select().from(videosTable).where(eq(videosTable.videoId, youtubeVideoId)).limit(1);

  const channelName = source?.name ?? video?.channelName ?? "Yektube";
  const title = video?.title?.trim() || "Video";
  const description = video?.description?.trim() || "";
  const thumbnail = video?.thumbnail?.trim() || null;

  const origin = opts.origin.replace(/\/+$/, "");
  const pageUrl =
    source && video
      ? yektubeWatchPath(origin, source.id, channelName, youtubeVideoId, title)
      : `${origin}${opts.pathname.replace(/\/+$/, "") || "/"}`;

  const seo = await resolveVideoSeoMeta({
    dbId: video?.id,
    youtubeVideoId,
    title,
    description,
    channelName,
    thumbnail,
    duration: video?.duration ?? null,
    publishedAt: video?.publishedAt ?? null,
    categorySlug: video?.categorySlug ?? undefined,
    pageUrl,
  });

  return renderWatchOgHtml({
    title: seo.seoTitle,
    description: seo.seoDescription,
    image: thumbnail,
    pageUrl,
    jsonLd: seo.jsonLd,
  });
}
