import {
  downloadExternalImageToMediaDetailed,
  extFromMime,
  publicUploadUrl,
  saveMediaBuffer,
} from "./mediaUploadService.js";
import { upgradeGooglePhotoResolution, isLocalCachedMediaUrl } from "./map-image-proxy.js";
import { fetchGooglePlacePhotoBytes } from "./place-photo-refresh.js";
import { resolveGooglePlacesApiKey } from "./google-places-key.js";
import { logger } from "./logger.js";

export { isLocalCachedMediaUrl } from "./map-image-proxy.js";

export const MAP_IMAGE_CACHE_MAX_WIDTH = 800;
export const MAP_IMAGE_CACHE_JPEG_QUALITY = 80;

const PRIORITY_SUPER_CATEGORIES = new Set([
  "siparis",
  "yiyecek",
  "market",
  "alisveris",
  "hizmet",
  "servis",
  "turizm",
  "seyahat",
  "rentacar",
  "arac",
  "ulasim",
]);

export function isExternalHotlinkUrl(url: unknown): boolean {
  const value = String(url ?? "").trim();
  if (!value || isLocalCachedMediaUrl(value)) return false;
  if (value.startsWith("/api/map/places/")) return true;
  return /^https?:\/\//i.test(value);
}

export function shouldCacheMapBusinessImage(meta: {
  homepageSuperCategory?: string | null;
  homepageFeatured?: boolean | null;
  storeType?: string | null;
}): boolean {
  if (meta.homepageFeatured === true) return true;
  const superCat = String(meta.homepageSuperCategory ?? "").trim().toLowerCase();
  if (PRIORITY_SUPER_CATEGORIES.has(superCat)) return true;
  const store = String(meta.storeType ?? "").trim().toLowerCase();
  if (/restoran|market|yemek|food|kafe|cafe/.test(store)) return true;
  return false;
}

function prepareGoogleDownloadUrl(url: string, maxWidth: number): string {
  const value = upgradeGooglePhotoResolution(url);
  if (!/(googleusercontent|ggpht|gstatic)\.com\//i.test(value)) return value;
  const height = Math.max(1, Math.round(maxWidth * 0.75));
  return value
    .replace(/=w\d+-h\d+/g, `=w${maxWidth}-h${height}`)
    .replace(/=s\d+/g, `=s${maxWidth}`);
}

async function compressImageBuffer(
  buf: Buffer,
  contentType: string,
  maxWidth = MAP_IMAGE_CACHE_MAX_WIDTH,
): Promise<{ buf: Buffer; mime: string; ext: string }> {
  try {
    const sharpMod = await import("sharp");
    const sharp = sharpMod.default;
    const out = await sharp(buf)
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .jpeg({ quality: MAP_IMAGE_CACHE_JPEG_QUALITY })
      .toBuffer();
    return { buf: out, mime: "image/jpeg", ext: "jpg" };
  } catch {
    const mime = String(contentType || "image/jpeg").split(";")[0]?.trim() || "image/jpeg";
    const ext = extFromMime(mime) || "jpg";
    return { buf, mime, ext };
  }
}

async function persistImageBuffer(buf: Buffer, contentType: string): Promise<string | null> {
  if (!buf.length) return null;
  const compressed = await compressImageBuffer(buf, contentType);
  const saved = await saveMediaBuffer(compressed.buf, {
    ext: compressed.ext,
    mime: compressed.mime,
    prefix: "map-",
  });
  return publicUploadUrl(saved.fname);
}

/** Harici veya proxy görseli indirip sıkıştırarak `/api/media/uploads/…` olarak kaydeder. */
export async function cacheExternalImageToMedia(
  rawUrl: string | null | undefined,
  opts: { maxWidth?: number } = {},
): Promise<string | null> {
  const url = String(rawUrl ?? "").trim();
  if (!url) return null;
  if (isLocalCachedMediaUrl(url)) return url;

  const maxWidth = opts.maxWidth ?? MAP_IMAGE_CACHE_MAX_WIDTH;

  if (url.startsWith("/api/map/places/")) {
    const apiKey = await resolveGooglePlacesApiKey();
    if (!apiKey) return null;
    const fetched = await fetchGooglePlacePhotoBytes(url, apiKey);
    if (!fetched?.buffer?.length) return null;
    return persistImageBuffer(fetched.buffer, fetched.contentType);
  }

  const candidates = [prepareGoogleDownloadUrl(url, maxWidth), url];
  for (const candidate of candidates) {
    const result = await downloadExternalImageToMediaDetailed(candidate, { timeoutMs: 12_000 });
    if (!result.ok) continue;
    if (result.bytes <= MAP_IMAGE_CACHE_MAX_WIDTH * MAP_IMAGE_CACHE_MAX_WIDTH * 2) {
      return result.url;
    }
    try {
      const res = await fetch(result.finalUrl || candidate, { redirect: "follow" });
      if (!res.ok) return result.url;
      const buf = Buffer.from(await res.arrayBuffer());
      const persisted = await persistImageBuffer(buf, result.contentType);
      return persisted || result.url;
    } catch {
      return result.url;
    }
  }

  logger.debug({ url }, "[map-image-cache] download failed");
  return null;
}

/** Öncelikli kategorilerde ilk kapak görselini sunucuya kaydeder; diğerlerinde hotlink korunur. */
export async function resolveCachedCoverPhoto(
  photos: string[],
  meta: {
    homepageSuperCategory?: string | null;
    homepageFeatured?: boolean | null;
    storeType?: string | null;
  },
): Promise<{ coverUrl: string | null; galleryPhotos: string[] }> {
  const gallery = photos.map((p) => String(p ?? "").trim()).filter(Boolean);
  const first = gallery[0] ?? null;
  if (!first || !shouldCacheMapBusinessImage(meta)) {
    return { coverUrl: first, galleryPhotos: gallery };
  }
  if (isLocalCachedMediaUrl(first)) {
    return { coverUrl: first, galleryPhotos: gallery };
  }
  const cached = await cacheExternalImageToMedia(first);
  if (!cached) {
    return { coverUrl: first, galleryPhotos: gallery };
  }
  return { coverUrl: cached, galleryPhotos: [cached, ...gallery.slice(1)] };
}
