import { eq, sql, and, inArray, or, type SQL } from "drizzle-orm";
import { getYektubeDbForRead, videoSourcesTable, videosTable, dualWriteYektubeUpdate } from "@workspace/db";
import { logger } from "./logger.js";
import { VIDEO_TV_PRESETS, type VideoTvPreset } from "../data/videoTvPresets.js";
import { mergeVideoTvChannelPresets, VIDEO_TV_TOP_CHANNEL_SUPPLEMENT, VIDEO_TV_TOP_PODCAST_CHANNEL_SUPPLEMENT } from "../data/videoTvTopChannels.js";
import { VIDEO_TV_KIDS_CHANNEL_SUPPLEMENT } from "../data/videoTvKidsChannels.js";

const db = getYektubeDbForRead();

export function slugifyVideoCategory(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Eski / alternatif slug'lar → kanonik admin slug */
const CATEGORY_CANONICAL_ALIASES: Record<string, readonly string[]> = {
  sinema: ["film-ve-animasyon", "film", "filmler", "sinema-filmleri"],
  muzik: ["music", "muzik-videolari"],
  eglence: ["eglence-videolari", "entertainment"],
  cocuk: ["kids", "cocuk-videolari"],
  "cocuk-animasyon": ["cocuk-animasyonu", "kids-animation"],
};

export function canonicalVideoCategorySlug(value: string | null | undefined): string {
  const norm = slugifyVideoCategory(value ?? "");
  if (!norm) return "";
  for (const [canonical, aliases] of Object.entries(CATEGORY_CANONICAL_ALIASES)) {
    if (norm === canonical || aliases.includes(norm)) return canonical;
  }
  return norm;
}

const CATEGORY_LABELS: Record<string, string> = {
  haberler: "Haberler ve Politika",
  sinema: "Film ve Animasyon",
  dizi: "Dizi",
  "film-dizi": "Canlı Film & Dizi",
  muzik: "Müzik",
  oyun: "Oyun",
  spor: "Spor",
  eglence: "Eğlence",
  komedi: "Komedi",
  bilim: "Bilim",
  teknoloji: "Bilim ve Teknoloji",
  egitim: "Eğitim",
  seyahat: "Seyahat ve Etkinlikler",
  otomobil: "Otomobiller ve Araçlar",
  "evcil-hayvan": "Evcil Hayvanlar",
  doga: "Doğa",
  "nasil-yapilir": "Nasıl Yapılır ve Stil",
  vlog: "Kişiler ve Bloglar",
  tarih: "Tarih",
  saglik: "Sağlık",
  cocuk: "Çocuk",
  "cocuk-animasyon": "Çocuk Animasyon",
  aktivizm: "STK ve Aktivizm",
  belgesel: "Belgesel",
  podcast: "Podcast",
  yemek: "Yemek",
  "yemek-tarifleri": "Yemek Tarifleri",
};

/** Admin formunda her zaman gösterilecek slug'lar (video sayısı 0 olsa bile) */
export const ADMIN_CATEGORY_SLUGS = [
  "haberler",
  "sinema",
  "dizi",
  "muzik",
  "oyun",
  "spor",
  "eglence",
  "komedi",
  "bilim",
  "teknoloji",
  "egitim",
  "seyahat",
  "otomobil",
  "evcil-hayvan",
  "doga",
  "nasil-yapilir",
  "vlog",
  "tarih",
  "saglik",
  "cocuk",
  "aktivizm",
  "belgesel",
  "podcast",
  "yemek",
  "yemek-tarifleri",
] as const;

export function categoryDisplayLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
}

export type CategoryCatalogEntry = {
  slug: string;
  label: string;
  videoCount: number;
};

/** Aktif videoları olan + admin sabit listesi birleşik kategori listesi */
export async function getVideoCategoryCatalog(): Promise<CategoryCatalogEntry[]> {
  let customLabels: Record<string, string> = {};
  try {
    const { loadSectionConfig } = await import("./yektubeSectionConfig.js");
    const config = await loadSectionConfig();
    for (const c of config.yektubeCategories) {
      if (!c.hidden) customLabels[c.slug] = c.label;
    }
  } catch {
    /* config optional */
  }
  const rows = await db
    .select({
      categorySlug: videosTable.categorySlug,
      count: sql<number>`count(*)::int`,
    })
    .from(videosTable)
    .where(eq(videosTable.active, true))
    .groupBy(videosTable.categorySlug);

  const byNorm = new Map<string, number>();
  for (const row of rows) {
    const norm = slugifyVideoCategory(row.categorySlug ?? "");
    if (!norm) continue;
    byNorm.set(norm, (byNorm.get(norm) ?? 0) + Number(row.count ?? 0));
  }

  const slugSet = new Set<string>(ADMIN_CATEGORY_SLUGS);
  for (const slug of byNorm.keys()) slugSet.add(slug);
  for (const slug of Object.keys(customLabels)) slugSet.add(slug);

  return [...slugSet]
    .map((slug) => ({
      slug,
      label: customLabels[slug] ?? categoryDisplayLabel(slug),
      videoCount: byNorm.get(slug) ?? 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "tr"));
}

/** Yinelenen slug varyantlarını tek kanonik slug altında birleştirir */
export async function mergeDuplicateCategorySlugs(): Promise<{ sourcesUpdated: number; videosUpdated: number }> {
  const sources = await db.select({ id: videoSourcesTable.id, categorySlug: videoSourcesTable.categorySlug }).from(videoSourcesTable);
  const videos = await db.select({ id: videosTable.id, categorySlug: videosTable.categorySlug }).from(videosTable);

  const canonicalByRaw = new Map<string, string>();
  for (const row of [...sources, ...videos]) {
    const raw = row.categorySlug?.trim();
    if (!raw) continue;
    canonicalByRaw.set(raw, slugifyVideoCategory(raw));
  }

  let sourcesUpdated = 0;
  let videosUpdated = 0;

  for (const [raw, canonical] of canonicalByRaw) {
    if (raw === canonical) continue;
    const srcRes = await dualWriteYektubeUpdate(
      videoSourcesTable,
      { categorySlug: canonical },
      eq(videoSourcesTable.categorySlug, raw),
    );
    sourcesUpdated += srcRes.length;
    const vidRes = await dualWriteYektubeUpdate(
      videosTable,
      { categorySlug: canonical },
      eq(videosTable.categorySlug, raw),
    );
    videosUpdated += vidRes.length;
  }

  if (sourcesUpdated || videosUpdated) {
    logger.info({ sourcesUpdated, videosUpdated }, "[video] merged duplicate category slugs");
  }
  return { sourcesUpdated, videosUpdated };
}

/** Video categorySlug eşleşmesi (ham slug varyantları + alias dahil) */
export async function categoryVideoFilterCondition(categorySlug: string): Promise<SQL | undefined> {
  const norm = canonicalVideoCategorySlug(categorySlug);
  if (!norm) return undefined;

  const aliasSlugs = CATEGORY_CANONICAL_ALIASES[norm] ?? [];
  const videoRaws = await rawSlugsForCategory(norm);
  const matchSlugs = new Set<string>([norm, ...aliasSlugs, ...videoRaws]);
  const list = [...matchSlugs].filter(Boolean);
  if (list.length === 1) return eq(videosTable.categorySlug, list[0]!);
  if (list.length > 1) return inArray(videosTable.categorySlug, list);
  return eq(videosTable.categorySlug, norm);
}

/** Aktif kaynaklar — normalize kategori slug eşleşmesi */
export async function getActiveSourceIdsForCategory(categorySlug: string): Promise<number[]> {
  const norm = canonicalVideoCategorySlug(categorySlug);
  if (!norm) return [];

  const sources = await db
    .select({ id: videoSourcesTable.id, categorySlug: videoSourcesTable.categorySlug })
    .from(videoSourcesTable)
    .where(eq(videoSourcesTable.active, true));

  return sources
    .filter((s) => slugifyVideoCategory(s.categorySlug ?? "") === norm)
    .map((s) => s.id)
    .filter((id) => id > 0);
}

/**
 * Kategori akışı — video.categorySlug esas alınır (toplu taşıma / admin düzenlemesi korunur).
 */
export async function categoryFeedFilterCondition(categorySlug: string): Promise<SQL | undefined> {
  return categoryVideoFilterCondition(categorySlug);
}

/** Bellek içi kategori akışı doğrulaması (serialize sonrası) */
export function videoMatchesCategoryFeed(
  video: { sourceId?: number | null; categorySlug?: string | null },
  categorySlug: string,
  _activeSourceIds: ReadonlySet<number>,
): boolean {
  const norm = canonicalVideoCategorySlug(categorySlug);
  if (!norm) return true;
  return canonicalVideoCategorySlug(video.categorySlug) === norm;
}

/**
 * Eski slug kalıntılarını düzeltir — yalnızca geçersiz/boş categorySlug.
 * Kaynak kategorisinden farklı (manuel taşınmış) videolara dokunulmaz.
 */
export async function reconcileVideoCategoriesFromSources(): Promise<number> {
  const allowed = new Set(ADMIN_CATEGORY_SLUGS.map((s) => slugifyVideoCategory(s)).filter(Boolean));
  const sources = await db
    .select({ id: videoSourcesTable.id, categorySlug: videoSourcesTable.categorySlug })
    .from(videoSourcesTable)
    .where(eq(videoSourcesTable.active, true));
  const sourceNormById = new Map(
    sources.map((s) => [s.id, slugifyVideoCategory(s.categorySlug ?? "")] as const),
  );

  const rows = await db
    .select({ id: videosTable.id, sourceId: videosTable.sourceId, categorySlug: videosTable.categorySlug })
    .from(videosTable)
    .where(eq(videosTable.active, true));

  let updated = 0;
  for (const row of rows) {
    const current = slugifyVideoCategory(row.categorySlug ?? "");
    if (current && allowed.has(current)) continue;

    const sid = row.sourceId;
    const fallback =
      sid != null && sid > 0 ? sourceNormById.get(sid) ?? "haberler" : "haberler";
    const norm = allowed.has(fallback) ? fallback : "haberler";
    if (current === norm) continue;

    await dualWriteYektubeUpdate(videosTable, { categorySlug: norm }, eq(videosTable.id, row.id));
    updated += 1;
  }

  if (updated > 0) {
    logger.info({ updated }, "[video] reconciled invalid video category slugs");
  }
  return updated;
}

/** Aynı normalize slug'a düşen tüm ham slug'lar — filtre sorguları için */
export async function rawSlugsForCategory(normalizedSlug: string): Promise<string[]> {
  const norm = canonicalVideoCategorySlug(normalizedSlug);
  const rows = await db
    .selectDistinct({ categorySlug: videosTable.categorySlug })
    .from(videosTable)
    .where(eq(videosTable.active, true));
  const out = new Set<string>();
  for (const row of rows) {
    const raw = row.categorySlug?.trim();
    if (!raw) continue;
    if (canonicalVideoCategorySlug(raw) === norm) out.add(raw);
  }
  if (out.size === 0 && norm) out.add(norm);
  return [...out];
}

const PRESETS = mergeVideoTvChannelPresets(
  VIDEO_TV_PRESETS,
  VIDEO_TV_TOP_CHANNEL_SUPPLEMENT,
  VIDEO_TV_TOP_PODCAST_CHANNEL_SUPPLEMENT,
  VIDEO_TV_KIDS_CHANNEL_SUPPLEMENT,
);

/** Videosu olmayan kategorilere hazır kanallar ekler (en fazla 3/kategori) */
export async function seedEmptyCategoryChannels(
  insertPreset: (preset: VideoTvPreset) => Promise<{ id: number; created: boolean } | null>,
): Promise<{ categoriesSeeded: number; channelsAdded: number }> {
  const catalog = await getVideoCategoryCatalog();
  const withVideos = new Set(catalog.map((c) => c.slug));
  const allNormSlugs = new Set<string>();
  for (const p of PRESETS) {
    const s = slugifyVideoCategory(p.category);
    if (s) allNormSlugs.add(s);
  }

  let categoriesSeeded = 0;
  let channelsAdded = 0;

  for (const slug of allNormSlugs) {
    if (withVideos.has(slug)) continue;
    const presets = PRESETS.filter((p) => slugifyVideoCategory(p.category) === slug).slice(0, 3);
    if (presets.length === 0) continue;
    let addedForCat = 0;
    for (const preset of presets) {
      const result = await insertPreset(preset);
      if (result?.created) {
        addedForCat++;
        channelsAdded++;
      }
    }
    if (addedForCat > 0) categoriesSeeded++;
  }

  return { categoriesSeeded, channelsAdded };
}
