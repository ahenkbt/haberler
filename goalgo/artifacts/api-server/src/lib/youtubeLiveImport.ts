import { eq, or, sql } from "drizzle-orm";
import { dualWriteYektubeInsert, dualWriteYektubeUpdate, getYektubeDbForRead, videoSourcesTable } from "@workspace/db";
import { slugifyVideoCategory } from "./yektubeCategoryCatalog.js";
import { extractYoutubeVideoId, isYoutubeLiveVideoId } from "./youtubeLiveVideoId.js";
import { searchYoutubeLiveVideos, type YoutubeLiveSearchHit } from "./youtubeLiveSearch.js";
import { livePresetThumbnail, VIDEO_TV_LIVE_PRESETS, type VideoTvLivePreset } from "../data/videoTvLivePresets.js";
import { liveSearchCategoryByKey, LIVE_TV_SEARCH_CATEGORIES } from "../data/videoTvLiveCategories.js";
import { guessLiveTvCategory, isBlockedLiveBirthContent, normalizeLiveCategorySlug } from "./liveTvCategoryGuess.js";
import { fetchYoutubeVideoSnippetMap } from "./youtubeVideoMeta.js";
import { fetchYoutubeChannelCover, isUsableYoutubeCover } from "./youtubeCoverImages.js";

const db = getYektubeDbForRead();

export type LiveImportResult = {
  added: number;
  skipped: number;
  updated: number;
  errors: string[];
};

async function existingLiveKeys(): Promise<{ ids: Set<string>; names: Set<string> }> {
  const rows = await db
    .select({ channelId: videoSourcesTable.channelId, name: videoSourcesTable.name, url: videoSourcesTable.url })
    .from(videoSourcesTable)
    .where(or(eq(videoSourcesTable.isLive, true), eq(videoSourcesTable.sourceType, "live")));
  const ids = new Set<string>();
  for (const r of rows) {
    const cid = String(r.channelId ?? "").trim().toLowerCase();
    if (cid) ids.add(cid);
    const vid = extractYoutubeVideoId(r.url ?? "") ?? extractYoutubeVideoId(r.channelId);
    if (vid) ids.add(vid.toLowerCase());
  }
  const names = new Set(rows.map((r) => String(r.name ?? "").trim().toLowerCase()).filter(Boolean));
  return { ids, names };
}

function displayName(hit: YoutubeLiveSearchHit): string {
  const ch = hit.channelTitle?.trim();
  if (ch && ch.length > 1 && ch !== hit.videoId) return ch.slice(0, 200);
  return hit.title.slice(0, 200);
}

async function resolveLiveLogoUrl(videoId: string, preferred?: string | null): Promise<string> {
  const stored = preferred?.trim();
  if (stored && isUsableYoutubeCover(stored) && !stored.includes("/vi/")) return stored;

  const metaMap = await fetchYoutubeVideoSnippetMap([videoId]);
  const meta = metaMap.get(videoId);
  if (meta?.thumbnail && isUsableYoutubeCover(meta.thumbnail)) return meta.thumbnail;

  if (meta?.channelId) {
    const chLogo = await fetchYoutubeChannelCover(meta.channelId).catch(() => "");
    if (chLogo) return chLogo;
  }

  return livePresetThumbnail(videoId);
}

export async function insertLiveVideoSource(opts: {
  videoId: string;
  name: string;
  categorySlug: string;
  logoUrl?: string | null;
}): Promise<{ id: number; created: boolean } | null> {
  const videoId = extractYoutubeVideoId(opts.videoId) ?? opts.videoId.trim();
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
  const categorySlug = slugifyVideoCategory(opts.categorySlug) || "haberler";
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const logoUrl = await resolveLiveLogoUrl(videoId, opts.logoUrl);

  const [row] = await dualWriteYektubeInsert(videoSourcesTable, {
    name: opts.name.slice(0, 200) || videoId,
    platform: "youtube",
    sourceType: "live",
    channelId: videoId,
    url,
    logoUrl,
    categorySlug,
    active: true,
    isLive: true,
    useYoutubeApi: true,
  });

  return { id: row.id, created: true };
}

export async function importLiveSearchHits(
  hits: YoutubeLiveSearchHit[],
  categorySlug: string,
): Promise<LiveImportResult> {
  const result: LiveImportResult = { added: 0, skipped: 0, updated: 0, errors: [] };
  const { ids, names } = await existingLiveKeys();
  const cat = slugifyVideoCategory(categorySlug) || "haberler";

  for (const hit of hits) {
    const videoId = extractYoutubeVideoId(hit.videoId) ?? hit.videoId.trim();
    if (!videoId) {
      result.skipped++;
      continue;
    }
    const key = videoId.toLowerCase();
    const name = displayName(hit);
    const nameKey = name.toLowerCase();
    if (isBlockedLiveBirthContent({ name, title: hit.title, channelTitle: hit.channelTitle })) {
      result.skipped++;
      continue;
    }
    const guessedCat = normalizeLiveCategorySlug(name, hit.title, cat);
    if (ids.has(key) || names.has(nameKey)) {
      result.skipped++;
      continue;
    }
    try {
      const inserted = await insertLiveVideoSource({
        videoId,
        name,
        categorySlug: guessedCat,
        logoUrl: hit.thumbnail ?? livePresetThumbnail(videoId),
      });
      if (inserted) {
        result.added++;
        ids.add(key);
        names.add(nameKey);
      }
    } catch (err) {
      result.errors.push(`${name}: ${err instanceof Error ? err.message : "hata"}`);
    }
  }

  return result;
}

export async function importLiveFromYoutubeSearch(opts: {
  query: string;
  categorySlug?: string;
  categoryKey?: string;
  limit?: number;
}): Promise<LiveImportResult & { found: number }> {
  const catDef = opts.categoryKey ? liveSearchCategoryByKey(opts.categoryKey) : undefined;
  const categorySlug = slugifyVideoCategory(opts.categorySlug ?? catDef?.categorySlug ?? "haberler") || "haberler";
  const query = (opts.query ?? catDef?.defaultQuery ?? "haber canlı").trim();
  const limit = Math.min(Math.max(opts.limit ?? 15, 1), 50);

  let hits = await searchYoutubeLiveVideos(query, limit);
  if (hits.length === 0) {
    hits = await searchYoutubeLiveVideos(`${query} canlı yayın`, limit);
  }

  const base = await importLiveSearchHits(hits, categorySlug);
  return { ...base, found: hits.length };
}

/** Haber, Yaşam, Film, Dizi, Radyo, Doğa, Komedi — tüm kategorilerden canlı yayın içe aktar */
export async function importAllLiveCategories(limitPerCategory = 15): Promise<
  LiveImportResult & { categories: number; details: Array<{ key: string; label: string; added: number; found: number }> }
> {
  const result: LiveImportResult = { added: 0, skipped: 0, updated: 0, errors: [] };
  const details: Array<{ key: string; label: string; added: number; found: number }> = [];

  for (const cat of LIVE_TV_SEARCH_CATEGORIES) {
    try {
      const queries = [cat.defaultQuery, ...(cat.extraQueries ?? [])];
      let added = 0;
      let found = 0;
      for (const query of queries) {
        const r = await importLiveFromYoutubeSearch({
          categoryKey: cat.key,
          query,
          limit: limitPerCategory,
        });
        result.added += r.added;
        result.skipped += r.skipped;
        result.updated += r.updated;
        added += r.added;
        found += r.found;
        if (r.errors?.length) result.errors.push(...r.errors.slice(0, 2));
      }
      details.push({ key: cat.key, label: cat.label, added, found });
    } catch (err) {
      result.errors.push(`${cat.label}: ${err instanceof Error ? err.message : "hata"}`);
      details.push({ key: cat.key, label: cat.label, added: 0, found: 0 });
    }
  }

  return { ...result, categories: LIVE_TV_SEARCH_CATEGORIES.length, details };
}

export async function bootstrapLiveTv(opts?: { importPresets?: boolean; importCategories?: boolean; normalize?: boolean }): Promise<{
  presets: LiveImportResult | null;
  categories: Awaited<ReturnType<typeof importAllLiveCategories>> | null;
  normalize: { updated: number; recategorized: number } | null;
  message: string;
}> {
  const importPresets = opts?.importPresets !== false;
  const importCategories = opts?.importCategories !== false;
  const normalize = opts?.normalize !== false;

  let presets: LiveImportResult | null = null;
  let categories: Awaited<ReturnType<typeof importAllLiveCategories>> | null = null;
  let norm: { updated: number; recategorized: number } | null = null;

  if (normalize) norm = await normalizeLiveVideoSources();
  if (importPresets) presets = await importLiveFromPresets(VIDEO_TV_LIVE_PRESETS);
  if (importCategories) categories = await importAllLiveCategories(15);

  const parts: string[] = [];
  if (presets?.added) parts.push(`${presets.added} preset kanal`);
  if (presets?.updated) parts.push(`${presets.updated} preset güncellendi`);
  if (categories?.added) parts.push(`${categories.added} arama kanalı`);
  if (norm?.updated) parts.push(`${norm.updated} kayıt onarıldı`);
  if (norm?.recategorized) parts.push(`${norm.recategorized} kategori düzeltildi`);

  return {
    presets,
    categories,
    normalize: norm,
    message: parts.length ? parts.join(", ") : "Yeni eklenecek kanal bulunamadı",
  };
}

async function findLiveSourceByVideoId(videoId: string) {
  const rows = await db
    .select()
    .from(videoSourcesTable)
    .where(
      or(
        eq(videoSourcesTable.channelId, videoId),
        sql`${videoSourcesTable.url} LIKE ${`%v=${videoId}%`}`,
      ),
    );
  return rows.find((r) => r.isLive || r.sourceType === "live" || isYoutubeLiveVideoId(r.channelId)) ?? rows[0] ?? null;
}

export async function importLiveFromPresets(presets: VideoTvLivePreset[]): Promise<LiveImportResult> {
  const result: LiveImportResult = { added: 0, skipped: 0, updated: 0, errors: [] };
  const { ids, names } = await existingLiveKeys();

  for (const preset of presets) {
    const videoId = preset.videoId.trim();
    const key = videoId.toLowerCase();
    const nameKey = preset.name.trim().toLowerCase();
    if (isBlockedLiveBirthContent({ name: preset.name })) {
      result.skipped++;
      continue;
    }
    const categorySlug = normalizeLiveCategorySlug(preset.name, null, preset.category);

    try {
      const existing = await findLiveSourceByVideoId(videoId);
      if (existing) {
        const logoUrl = await resolveLiveLogoUrl(videoId, preset.logoUrl ?? existing.logoUrl);
        const patch: Record<string, unknown> = {};
        if (existing.channelId !== videoId) patch.channelId = videoId;
        if (existing.sourceType !== "live") patch.sourceType = "live";
        if (!existing.isLive) patch.isLive = true;
        const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
        if (existing.url !== watchUrl) patch.url = watchUrl;
        if (existing.categorySlug !== categorySlug) patch.categorySlug = categorySlug;
        if (logoUrl && existing.logoUrl !== logoUrl) patch.logoUrl = logoUrl;
        if (existing.name !== preset.name.slice(0, 200)) patch.name = preset.name.slice(0, 200);

        if (Object.keys(patch).length > 0) {
          await dualWriteYektubeUpdate(videoSourcesTable, patch, eq(videoSourcesTable.id, existing.id));
          result.updated++;
        } else {
          result.skipped++;
        }
        ids.add(key);
        continue;
      }

      if (ids.has(key) || names.has(nameKey)) {
        result.skipped++;
        continue;
      }

      const inserted = await insertLiveVideoSource({
        videoId,
        name: preset.name,
        categorySlug,
        logoUrl: preset.logoUrl ?? livePresetThumbnail(videoId),
      });
      if (inserted) {
        result.added++;
        ids.add(key);
        names.add(nameKey);
      }
    } catch (err) {
      result.errors.push(`${preset.name}: ${err instanceof Error ? err.message : "hata"}`);
    }
  }

  return result;
}

/** Mevcut canlı kaynaklarda video ID, kapak ve kategori onarımı */
export async function normalizeLiveVideoSources(): Promise<{ updated: number; recategorized: number }> {
  const rows = await db
    .select()
    .from(videoSourcesTable)
    .where(or(eq(videoSourcesTable.isLive, true), eq(videoSourcesTable.sourceType, "live")));

  const videoIds = rows
    .map((row) => extractYoutubeVideoId(row.url) ?? extractYoutubeVideoId(row.channelId))
    .filter((id): id is string => Boolean(id));
  const metaMap = await fetchYoutubeVideoSnippetMap(videoIds);

  let updated = 0;
  let recategorized = 0;

  for (const row of rows) {
    const raw = (row.url && row.url.trim()) || row.channelId?.trim() || "";
    const videoId = extractYoutubeVideoId(raw);
    if (!videoId) continue;

    const meta = metaMap.get(videoId);
    const preset = VIDEO_TV_LIVE_PRESETS.find((p) => p.videoId === videoId);
    const categorySlug = normalizeLiveCategorySlug(row.name, meta?.title, preset?.category);

    const patch: Record<string, unknown> = {};
    if (row.channelId !== videoId) patch.channelId = videoId;
    if (row.sourceType !== "live") patch.sourceType = "live";
    if (!row.isLive) patch.isLive = true;
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    if (row.url !== watchUrl) patch.url = watchUrl;

    if (row.categorySlug !== categorySlug) {
      patch.categorySlug = categorySlug;
      recategorized++;
    }

    const logoUrl = await resolveLiveLogoUrl(videoId, meta?.thumbnail ?? row.logoUrl);
    if (logoUrl && row.logoUrl !== logoUrl) patch.logoUrl = logoUrl;

    if (meta?.channelTitle && row.name !== meta.channelTitle.slice(0, 200) && preset) {
      patch.name = preset.name.slice(0, 200);
    }

    if (Object.keys(patch).length === 0) continue;
    await dualWriteYektubeUpdate(videoSourcesTable, patch, eq(videoSourcesTable.id, row.id));
    updated++;
  }

  return { updated, recategorized };
}

/** Yanlış kategorideki canlı kanalları ad/heuristic ile düzelt */
export async function recategorizeLiveVideoSources(): Promise<{ updated: number }> {
  const rows = await db
    .select()
    .from(videoSourcesTable)
    .where(or(eq(videoSourcesTable.isLive, true), eq(videoSourcesTable.sourceType, "live")));

  let updated = 0;
  for (const row of rows) {
    const videoId = extractYoutubeVideoId(row.url) ?? extractYoutubeVideoId(row.channelId);
    const preset = videoId ? VIDEO_TV_LIVE_PRESETS.find((p) => p.videoId === videoId) : undefined;
    const categorySlug = normalizeLiveCategorySlug(row.name, null, preset?.category);
    if (row.categorySlug === categorySlug) continue;
    await dualWriteYektubeUpdate(videoSourcesTable, { categorySlug }, eq(videoSourcesTable.id, row.id));
    updated++;
  }
  return { updated };
}

export { guessLiveTvCategory };
