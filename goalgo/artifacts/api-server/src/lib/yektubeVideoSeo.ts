import { eq } from "drizzle-orm";
import {
  dualWriteYektubeUpdate,
  getYektubeDbForRead,
  videosTable,
  type VideoRow,
} from "@workspace/db";
import { categoryDisplayLabel } from "./yektubeCategoryCatalog.js";
import { googleTranslateTexts } from "./googleTranslate.js";
import { isLikelyTurkish } from "./turkishContent.js";
import { fetchYoutubeTurkishCaptionExcerpt } from "./youtubeCaptionsTr.js";
import { logger } from "./logger.js";

const db = getYektubeDbForRead();
const SEO_DESC_MAX = 320;
const SEO_TITLE_MAX = 120;

export type VideoSeoMeta = {
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  jsonLd: Record<string, unknown>;
  translated: boolean;
  source: "native" | "google-translate" | "cache" | "captions";
  locale: "tr-TR";
  inLanguage: "tr";
  configured: boolean;
};

export type ResolveVideoSeoInput = {
  dbId?: number;
  youtubeVideoId: string;
  title: string;
  description?: string | null;
  channelName?: string | null;
  thumbnail?: string | null;
  duration?: string | null;
  publishedAt?: string | null;
  categorySlug?: string;
  pageUrl?: string;
};

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function buildKeywords(seoTitle: string, channelName: string | null, categorySlug: string | undefined): string[] {
  const words = new Set<string>();
  for (const w of seoTitle.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (w.length >= 3) words.add(w);
  }
  if (channelName?.trim()) words.add(channelName.trim());
  if (categorySlug) words.add(categoryDisplayLabel(categorySlug));
  words.add("Yektube");
  words.add("Türkiye");
  words.add("video");
  return [...words].slice(0, 12);
}

function buildJsonLd(input: ResolveVideoSeoInput, seoTitle: string, seoDescription: string): Record<string, unknown> {
  const uploadDate = input.publishedAt?.trim() || undefined;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: seoTitle,
    description: seoDescription,
    thumbnailUrl: input.thumbnail?.trim() || undefined,
    uploadDate,
    duration: input.duration?.trim() || undefined,
    inLanguage: "tr",
    contentLocation: {
      "@type": "Country",
      name: "Türkiye",
    },
    publisher: {
      "@type": "Organization",
      name: "Yektube",
      url: "https://yekpare.net/yp/",
    },
    ...(input.channelName?.trim()
      ? {
          author: {
            "@type": "Organization",
            name: input.channelName.trim(),
          },
        }
      : {}),
    ...(input.pageUrl?.trim() ? { url: input.pageUrl.trim(), mainEntityOfPage: input.pageUrl.trim() } : {}),
    ...(input.youtubeVideoId?.trim()
      ? {
          contentUrl: `https://www.youtube.com/watch?v=${input.youtubeVideoId.trim()}`,
          embedUrl: `https://www.youtube.com/embed/${input.youtubeVideoId.trim()}`,
        }
      : {}),
  };
}

function cacheFresh(row: Pick<VideoRow, "seoTitle" | "seoUpdatedAt" | "title" | "description">): boolean {
  if (!row.seoTitle?.trim() || !row.seoUpdatedAt) return false;
  const ageMs = Date.now() - row.seoUpdatedAt.getTime();
  if (ageMs > 30 * 24 * 60 * 60 * 1000) return false;
  return true;
}

async function persistSeo(dbId: number, seoTitle: string, seoDescription: string): Promise<void> {
  await dualWriteYektubeUpdate(
    videosTable,
    {
      seoTitle: seoTitle.slice(0, 500),
      seoDescription: seoDescription.slice(0, 8000),
      seoUpdatedAt: new Date(),
    },
    eq(videosTable.id, dbId),
  );
}

export async function resolveVideoSeoMeta(input: ResolveVideoSeoInput): Promise<VideoSeoMeta> {
  const title = input.title.trim();
  const description = (input.description ?? "").trim();
  const channelName = input.channelName?.trim() || null;
  const categorySlug = input.categorySlug?.trim() || undefined;

  if (input.dbId && input.dbId > 0) {
    const [row] = await db.select().from(videosTable).where(eq(videosTable.id, input.dbId)).limit(1);
    if (row && cacheFresh(row)) {
      const seoTitle = row.seoTitle!.trim();
      const seoDescription = (row.seoDescription ?? description).trim();
      return {
        seoTitle,
        seoDescription: clip(seoDescription, SEO_DESC_MAX),
        keywords: buildKeywords(seoTitle, channelName, categorySlug),
        jsonLd: buildJsonLd(input, seoTitle, clip(seoDescription, SEO_DESC_MAX)),
        translated: !isLikelyTurkish(title),
        source: "cache",
        locale: "tr-TR",
        inLanguage: "tr",
        configured: true,
      };
    }
  }

  let seoTitle = title;
  let seoDescription = description;
  let source: VideoSeoMeta["source"] = "native";
  let translated = false;

  const titleNeedsTr = title.length > 0 && !isLikelyTurkish(title);
  const descNeedsTr = description.length > 0 && !isLikelyTurkish(description);

  if (titleNeedsTr || descNeedsTr) {
    const toTranslate: string[] = [];
    const keys: Array<"title" | "description"> = [];
    if (titleNeedsTr) {
      toTranslate.push(title.slice(0, 450));
      keys.push("title");
    }
    if (descNeedsTr) {
      toTranslate.push(description.slice(0, 4500));
      keys.push("description");
    }

    const translatedBatch = await googleTranslateTexts(toTranslate, "tr");
    if (translatedBatch) {
      translated = true;
      source = "google-translate";
      keys.forEach((k, i) => {
        const val = translatedBatch[i]?.trim();
        if (!val) return;
        if (k === "title") seoTitle = val;
        else seoDescription = val;
      });
    }
  }

  if (!seoDescription.trim()) {
    const caption = await fetchYoutubeTurkishCaptionExcerpt(input.youtubeVideoId);
    if (caption) {
      seoDescription = caption;
      if (source === "native") source = "captions";
    }
  }

  if (!seoDescription.trim() && channelName) {
    seoDescription = `${seoTitle} — ${channelName} | Yektube Türkiye`;
  }

  seoTitle = clip(seoTitle, SEO_TITLE_MAX);
  seoDescription = clip(seoDescription, SEO_DESC_MAX);

  const keywords = buildKeywords(seoTitle, channelName, categorySlug);
  const jsonLd = buildJsonLd(input, seoTitle, seoDescription);

  if (input.dbId && input.dbId > 0) {
    persistSeo(input.dbId, seoTitle, seoDescription).catch((err) =>
      logger.warn({ err, dbId: input.dbId }, "[yektubeVideoSeo] cache yazılamadı"),
    );
  }

  const configured = titleNeedsTr || descNeedsTr ? translated || !titleNeedsTr : true;

  return {
    seoTitle,
    seoDescription,
    keywords,
    jsonLd,
    translated,
    source,
    locale: "tr-TR",
    inLanguage: "tr",
    configured,
  };
}

/** İçe aktarım/senkron sonrası arka planda SEO meta üret */
export function scheduleVideoSeoResolve(input: ResolveVideoSeoInput): void {
  if (!input.youtubeVideoId.trim() || !input.title.trim()) return;
  if (isLikelyTurkish(input.title) && isLikelyTurkish(input.description)) return;
  setImmediate(() => {
    resolveVideoSeoMeta(input).catch((err) =>
      logger.warn({ err, videoId: input.youtubeVideoId }, "[yektubeVideoSeo] async resolve failed"),
    );
  });
}
