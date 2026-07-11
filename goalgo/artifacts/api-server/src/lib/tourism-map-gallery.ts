import { db, mapBusinessImagesTable } from "@workspace/db";
import { asc, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  googlePlacePhotoProxyUrl,
  normalizeImageUrlValue,
  upgradeGooglePhotoResolution,
} from "./map-image-proxy.js";
import { isLocalCachedMediaUrl } from "./map-image-proxy.js";
import { resolveGooglePlacesApiKey } from "./google-places-key.js";

export const TOURISM_HOTEL_IMAGE_FALLBACK = "/assets/turizm-bc/hotel/hotel-featured-1.jpg";

/** BC tema yatak odası placeholder'ı — gerçek Google foto yokken otomatik atanmamalı. */
export function isTourismBcPlaceholderImage(raw: unknown): boolean {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return false;
  if (value.includes("/assets/turizm-bc/hotel/")) return true;
  if (value.includes("unsplash.com/photo-1566073771259")) return true;
  return false;
}

function addPhoto(seen: Set<string>, out: string[], raw: unknown): void {
  const normalized = normalizeImageUrlValue(raw);
  if (!normalized || seen.has(normalized) || isTourismBcPlaceholderImage(normalized)) return;
  if (out.length > 0 && isLocalCachedMediaUrl(normalized) && !isLocalCachedMediaUrl(out[0]!)) {
    seen.add(normalized);
    out.unshift(normalized);
    return;
  }
  seen.add(normalized);
  out.push(normalized);
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function collectExtrasPhotos(extras: unknown, seen: Set<string>, out: string[]): void {
  if (!extras || typeof extras !== "object") return;
  const ex = extras as Record<string, unknown>;
  for (const p of parseJsonArray(ex.photos)) {
    if (typeof p === "string") {
      addPhoto(seen, out, p);
      continue;
    }
    if (!p || typeof p !== "object") continue;
    const po = p as Record<string, unknown>;
    if (po.photo_reference) {
      addPhoto(seen, out, googlePlacePhotoProxyUrl(String(po.photo_reference)));
    } else if (po.photoReference) {
      addPhoto(seen, out, googlePlacePhotoProxyUrl(String(po.photoReference)));
    } else if (typeof po.name === "string" && po.name.startsWith("places/")) {
      addPhoto(
        seen,
        out,
        `/api/map/places/photo-media?resource=${encodeURIComponent(po.name)}&maxWidthPx=1200`,
      );
    } else if (typeof po.url === "string") {
      addPhoto(seen, out, po.url);
    }
  }
}

async function fetchGooglePlacePhotoUrls(placeId: string): Promise<string[]> {
  const apiKey = await resolveGooglePlacesApiKey();
  if (!apiKey || !placeId.trim()) return [];
  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}` +
      `&fields=photos&language=tr&key=${encodeURIComponent(apiKey)}`;
    const gRes = await fetch(url);
    const gData = (await gRes.json()) as {
      status: string;
      result?: { photos?: Array<{ photo_reference: string }> };
    };
    if (gData.status !== "OK" || !gData.result?.photos?.length) return [];
    return gData.result.photos
      .slice(0, 10)
      .map((p) => googlePlacePhotoProxyUrl(p.photo_reference));
  } catch {
    return [];
  }
}

/** map_businesses kaydı için normalize edilmiş galeri URL'leri (proxy + fallback). */
export async function fetchMapBusinessGallery(businessId: string): Promise<string[]> {
  const safeId = businessId.replace(/'/g, "''");
  const bizR = await db.execute(sql.raw(`
    SELECT id, google_place_id, cover_photo_url, photo_url, scraped_photos, google_places_extras
    FROM map_businesses
    WHERE id = '${safeId}'
    LIMIT 1
  `));
  const biz = bizR.rows[0] as Record<string, unknown> | undefined;
  if (!biz) return [TOURISM_HOTEL_IMAGE_FALLBACK];

  const seen = new Set<string>();
  const photos: string[] = [];

  const imgRows = await db.execute(sql.raw(`
    SELECT image_url FROM map_business_images
    WHERE business_id = '${safeId}'
    ORDER BY sort_order ASC
    LIMIT 12
  `));
  for (const row of imgRows.rows as { image_url?: string }[]) {
    addPhoto(seen, photos, row.image_url);
  }

  for (const u of parseJsonArray(biz.scraped_photos)) {
    addPhoto(seen, photos, u);
  }

  addPhoto(seen, photos, biz.cover_photo_url);
  addPhoto(seen, photos, biz.photo_url);
  collectExtrasPhotos(biz.google_places_extras, seen, photos);

  if (photos.length === 0 && biz.google_place_id) {
    for (const u of await fetchGooglePlacePhotoUrls(String(biz.google_place_id))) {
      addPhoto(seen, photos, u);
    }
  }

  if (photos.length === 0) return [TOURISM_HOTEL_IMAGE_FALLBACK];
  return photos.slice(0, 12);
}

/** Liste satırı için tek kapak görseli — scraped_photos, extras, galeri tablosu sırasıyla. */
export function resolveMapBusinessCoverImageFromRow(biz: Record<string, unknown>): string | null {
  const seen = new Set<string>();
  const photos: string[] = [];

  addPhoto(seen, photos, biz.first_gallery_image);
  for (const u of parseJsonArray(biz.scraped_photos)) {
    addPhoto(seen, photos, u);
  }
  addPhoto(seen, photos, biz.cover_photo_url);
  addPhoto(seen, photos, biz.photo_url);
  collectExtrasPhotos(biz.google_places_extras, seen, photos);
  addPhoto(seen, photos, biz.image_url);

  const first = photos[0] ?? null;
  return first ? upgradeGooglePhotoResolution(first) : null;
}

/** map_business_images tablosundan ilk görseli batch olarak ekle (N+1 önler). */
export async function enrichMapBusinessListingImages(
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  const ids = rows.map((r) => String(r.id ?? "").trim()).filter(Boolean);
  if (!ids.length) return rows;

  const images = await db
    .select({
      businessId: mapBusinessImagesTable.businessId,
      imageUrl: mapBusinessImagesTable.imageUrl,
    })
    .from(mapBusinessImagesTable)
    .where(inArray(mapBusinessImagesTable.businessId, ids))
    .orderBy(asc(mapBusinessImagesTable.sortOrder));

  const firstByBiz = new Map<string, string>();
  for (const img of images) {
    const bizId = String(img.businessId ?? "");
    const url = normalizeImageUrlValue(img.imageUrl);
    if (!bizId || !url) continue;
    const current = firstByBiz.get(bizId);
    if (!current || (isLocalCachedMediaUrl(url) && !isLocalCachedMediaUrl(current))) {
      firstByBiz.set(bizId, url);
    }
  }

  return rows.map((row) => {
    const bizId = String(row.id ?? "");
    const galleryImg = firstByBiz.get(bizId);
    if (!galleryImg) return row;
    return { ...row, first_gallery_image: galleryImg };
  });
}

export function normalizeTourismGalleryUrls(
  gallery: unknown,
  imageUrl?: unknown,
  options?: { allowFallback?: boolean },
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of parseJsonArray(gallery)) {
    addPhoto(seen, out, raw);
  }
  if (!out.length && imageUrl) addPhoto(seen, out, imageUrl);
  if (!out.length && options?.allowFallback !== false) out.push(TOURISM_HOTEL_IMAGE_FALLBACK);
  return out.slice(0, 12);
}
