import { db } from "@workspace/db";
import { mapBusinessesTable, vendorsTable } from "@workspace/db";
import { eq, or, ilike } from "drizzle-orm";
import { fetchPlaceDetailsNew, buildNewApiPhotoMediaUrls } from "./google-places-new.js";
import { normalizeImageUrlValue } from "./map-image-proxy.js";
import { extFromMime, publicUploadUrl, saveMediaBuffer } from "./mediaUploadService.js";
import { logger } from "./logger.js";

export type PlacePhotoFetchResult = {
  buffer: Buffer;
  contentType: string;
};

/** Google Places (New) medya veya legacy photo URL'sinden görsel baytlarını çeker. */
export async function fetchGooglePlacePhotoBytes(
  proxiedUrl: string,
  apiKey: string,
): Promise<PlacePhotoFetchResult | null> {
  const raw = String(proxiedUrl ?? "").trim();
  if (!raw) return null;

  if (raw.startsWith("/api/map/places/photo-media")) {
    try {
      const u = new URL(raw, "https://local");
      const resource = (u.searchParams.get("resource") ?? "").replace(/^\/+|\/+$/g, "");
      const maxWidthPx = u.searchParams.get("maxWidthPx") || "1200";
      if (!resource || !/^places\/[^/]+\/photos\/[^/]+$/.test(resource)) return null;
      const photoUrl = `https://places.googleapis.com/v1/${resource}/media?maxWidthPx=${encodeURIComponent(maxWidthPx)}&key=${encodeURIComponent(apiKey)}`;
      const gRes = await fetch(photoUrl, { redirect: "follow" });
      if (!gRes.ok) return null;
      return {
        buffer: Buffer.from(await gRes.arrayBuffer()),
        contentType: gRes.headers.get("content-type") || "image/jpeg",
      };
    } catch {
      return null;
    }
  }

  if (raw.startsWith("/api/map/places/photo")) {
    try {
      const u = new URL(raw, "https://local");
      const ref = u.searchParams.get("ref") ?? "";
      const maxwidth = u.searchParams.get("maxwidth") || "800";
      if (!ref) return null;
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${encodeURIComponent(maxwidth)}&photo_reference=${encodeURIComponent(ref)}&key=${encodeURIComponent(apiKey)}`;
      const gRes = await fetch(photoUrl, { redirect: "follow" });
      if (!gRes.ok) return null;
      return {
        buffer: Buffer.from(await gRes.arrayBuffer()),
        contentType: gRes.headers.get("content-type") || "image/jpeg",
      };
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Legacy `photo_reference` 404 döndüğünde Places API (New) ile taze fotoğraf çeker,
 * map_business + vendor kayıtlarını günceller.
 */
export async function refreshStaleLegacyPlacePhotoRef(
  ref: string,
  apiKey: string,
  maxwidth: string,
): Promise<PlacePhotoFetchResult | null> {
  const needle = `%${ref}%`;

  const [mapBiz] = await db
    .select({
      id: mapBusinessesTable.id,
      googlePlaceId: mapBusinessesTable.googlePlaceId,
    })
    .from(mapBusinessesTable)
    .where(or(ilike(mapBusinessesTable.photoUrl, needle), ilike(mapBusinessesTable.coverPhotoUrl, needle)))
    .limit(1);

  let placeId = String(mapBiz?.googlePlaceId ?? "").trim();
  let mapId = mapBiz?.id ? String(mapBiz.id) : "";

  if (!placeId) {
    const [vendor] = await db
      .select({
        googlePlaceId: vendorsTable.googlePlaceId,
        linkedMapBusinessId: vendorsTable.linkedMapBusinessId,
      })
      .from(vendorsTable)
      .where(or(ilike(vendorsTable.imageUrl, needle), ilike(vendorsTable.coverUrl, needle)))
      .limit(1);
    placeId = String(vendor?.googlePlaceId ?? "").trim();
    if (!mapId && vendor?.linkedMapBusinessId) mapId = String(vendor.linkedMapBusinessId);
  }

  if (!placeId) return null;

  const details = await fetchPlaceDetailsNew(apiKey, placeId);
  if (!details.ok) return null;

  const widthNum = Math.min(1600, Math.max(1, Number(maxwidth) || 1200));
  const photoUrls = buildNewApiPhotoMediaUrls(details.place.photos, apiKey, 3, widthNum)
    .map((u) => normalizeImageUrlValue(u))
    .filter((u): u is string => Boolean(u));

  const fresh = photoUrls[0];
  if (!fresh) return null;

  const now = new Date();
  if (mapId) {
    await db
      .update(mapBusinessesTable)
      .set({ photoUrl: fresh, coverPhotoUrl: fresh, updatedAt: now })
      .where(eq(mapBusinessesTable.id, mapId));
  }

  await db
    .update(vendorsTable)
    .set({ imageUrl: fresh, coverUrl: fresh, updatedAt: now })
    .where(
      mapId
        ? or(eq(vendorsTable.googlePlaceId, placeId), eq(vendorsTable.linkedMapBusinessId, mapId))
        : eq(vendorsTable.googlePlaceId, placeId),
    );

  const result = await fetchGooglePlacePhotoBytes(fresh, apiKey);
  if (result) schedulePersistFetchedPlacePhotoToMedia(result.buffer, result.contentType, fresh);
  return result;
}

function extractPlaceIdFromPhotoMediaResource(resource: string): string | null {
  const parts = String(resource ?? "").replace(/^\/+|\/+$/g, "").split("/");
  if (parts.length < 2 || parts[0] !== "places") return null;
  const placeId = String(parts[1] ?? "").trim();
  return placeId || null;
}

/** Başarılı proxy yanıtını S3/R2'ye yazar; eşleşen vendor/harita kayıtlarını kalıcı `/api/media/uploads/…` ile günceller. */
export function schedulePersistFetchedPlacePhotoToMedia(
  buffer: Buffer,
  contentType: string,
  proxiedUrl: string,
): void {
  void (async () => {
    try {
      const mime = String(contentType || "image/jpeg").split(";")[0]?.trim() || "image/jpeg";
      const ext = extFromMime(mime) || "jpg";
      const saved = await saveMediaBuffer(buffer, { ext, mime, prefix: "place-" });
      const mediaUrl = publicUploadUrl(saved.fname);
      const now = new Date();
      const raw = String(proxiedUrl ?? "").trim();
      if (!raw) return;

      await db
        .update(vendorsTable)
        .set({ imageUrl: mediaUrl, coverUrl: mediaUrl, updatedAt: now })
        .where(or(eq(vendorsTable.imageUrl, raw), eq(vendorsTable.coverUrl, raw), ilike(vendorsTable.imageUrl, `%${raw}%`), ilike(vendorsTable.coverUrl, `%${raw}%`)));

      await db
        .update(mapBusinessesTable)
        .set({ photoUrl: mediaUrl, coverPhotoUrl: mediaUrl, updatedAt: now })
        .where(or(eq(mapBusinessesTable.photoUrl, raw), eq(mapBusinessesTable.coverPhotoUrl, raw), ilike(mapBusinessesTable.photoUrl, `%${raw}%`), ilike(mapBusinessesTable.coverPhotoUrl, `%${raw}%`)));
    } catch (err) {
      logger.warn({ err, proxiedUrl }, "[place-photo] persist to media failed");
    }
  })();
}

/**
 * Places API (New) photo-media 404 döndüğünde placeId ile taze fotoğraf çeker,
 * map_business + vendor kayıtlarını günceller.
 */
export async function refreshStalePhotoMediaResource(
  resource: string,
  apiKey: string,
  maxWidthPx: string,
): Promise<PlacePhotoFetchResult | null> {
  const placeId = extractPlaceIdFromPhotoMediaResource(resource);
  if (!placeId) return null;

  const encodedResource = encodeURIComponent(resource);

  const [mapBiz] = await db
    .select({
      id: mapBusinessesTable.id,
      googlePlaceId: mapBusinessesTable.googlePlaceId,
    })
    .from(mapBusinessesTable)
    .where(
      or(
        eq(mapBusinessesTable.googlePlaceId, placeId),
        ilike(mapBusinessesTable.photoUrl, `%${encodedResource}%`),
        ilike(mapBusinessesTable.coverPhotoUrl, `%${encodedResource}%`),
      ),
    )
    .limit(1);

  let resolvedPlaceId = String(mapBiz?.googlePlaceId ?? placeId).trim();
  let mapId = mapBiz?.id ? String(mapBiz.id) : "";

  if (!mapId) {
    const [vendor] = await db
      .select({
        googlePlaceId: vendorsTable.googlePlaceId,
        linkedMapBusinessId: vendorsTable.linkedMapBusinessId,
      })
      .from(vendorsTable)
      .where(
        or(
          eq(vendorsTable.googlePlaceId, placeId),
          ilike(vendorsTable.imageUrl, `%${encodedResource}%`),
          ilike(vendorsTable.coverUrl, `%${encodedResource}%`),
        ),
      )
      .limit(1);
    if (!resolvedPlaceId) resolvedPlaceId = String(vendor?.googlePlaceId ?? placeId).trim();
    if (!mapId && vendor?.linkedMapBusinessId) mapId = String(vendor.linkedMapBusinessId);
  }

  if (!resolvedPlaceId) return null;

  const details = await fetchPlaceDetailsNew(apiKey, resolvedPlaceId);
  if (!details.ok) return null;

  const widthNum = Math.min(1600, Math.max(1, Number(maxWidthPx) || 1200));
  const photoUrls = buildNewApiPhotoMediaUrls(details.place.photos, apiKey, 3, widthNum)
    .map((u) => normalizeImageUrlValue(u))
    .filter((u): u is string => Boolean(u));

  const fresh = photoUrls[0];
  if (!fresh) return null;

  const now = new Date();
  if (mapId) {
    await db
      .update(mapBusinessesTable)
      .set({ photoUrl: fresh, coverPhotoUrl: fresh, updatedAt: now })
      .where(eq(mapBusinessesTable.id, mapId));
  }

  await db
    .update(vendorsTable)
    .set({ imageUrl: fresh, coverUrl: fresh, updatedAt: now })
    .where(
      mapId
        ? or(eq(vendorsTable.googlePlaceId, resolvedPlaceId), eq(vendorsTable.linkedMapBusinessId, mapId))
        : or(eq(vendorsTable.googlePlaceId, resolvedPlaceId), ilike(vendorsTable.imageUrl, `%${encodedResource}%`), ilike(vendorsTable.coverUrl, `%${encodedResource}%`)),
    );

  const result = await fetchGooglePlacePhotoBytes(fresh, apiKey);
  if (result) schedulePersistFetchedPlacePhotoToMedia(result.buffer, result.contentType, fresh);
  return result;
}

function extractLegacyPhotoRef(url: string | null | undefined): string | null {
  const raw = String(url ?? "").trim();
  if (!raw.includes("/api/map/places/photo")) return null;
  try {
    const u = new URL(raw, "https://local");
    const ref = u.searchParams.get("ref") ?? "";
    return ref.trim() || null;
  } catch {
    return null;
  }
}

/** Admin/job: legacy ref içeren kayıtları Places API (New) ile toplu yeniler. */
export async function bulkRefreshStaleLegacyPlacePhotos(
  apiKey: string,
  limit = 50,
): Promise<{ processed: number; refreshed: number; failed: number }> {
  const cap = Math.min(500, Math.max(1, limit));
  const rows = await db
    .select({
      photoUrl: mapBusinessesTable.photoUrl,
      coverPhotoUrl: mapBusinessesTable.coverPhotoUrl,
    })
    .from(mapBusinessesTable)
    .where(
      or(
        ilike(mapBusinessesTable.photoUrl, "%/api/map/places/photo%"),
        ilike(mapBusinessesTable.coverPhotoUrl, "%/api/map/places/photo%"),
      ),
    )
    .limit(cap * 3);

  const refs = new Set<string>();
  for (const row of rows) {
    for (const url of [row.photoUrl, row.coverPhotoUrl]) {
      const ref = extractLegacyPhotoRef(url);
      if (ref) refs.add(ref);
      if (refs.size >= cap) break;
    }
    if (refs.size >= cap) break;
  }

  let refreshed = 0;
  let failed = 0;
  for (const ref of refs) {
    const result = await refreshStaleLegacyPlacePhotoRef(ref, apiKey, "1200");
    if (result) refreshed += 1;
    else failed += 1;
  }

  return { processed: refs.size, refreshed, failed };
}
