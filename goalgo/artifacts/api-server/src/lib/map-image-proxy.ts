export function isLocalCachedMediaUrl(url: unknown): boolean {
  const value = String(url ?? "").trim();
  return value.startsWith("/api/media/");
}

export function googlePlacePhotoProxyUrl(ref: string, maxwidth = "800"): string {
  return `/api/map/places/photo?ref=${encodeURIComponent(ref)}&maxwidth=${encodeURIComponent(maxwidth)}`;
}

/**
 * Google usercontent görselleri küçük boyut jetonuyla (`=w86-h86`, `=s100`) gelir; pikselli
 * görünmesin diye yüksek çözünürlük iste. Suffix (`-k-no`, `-c` vb.) korunur.
 */
export function upgradeGooglePhotoResolution(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (!value) return value;
  if (!/(googleusercontent|ggpht|gstatic)\.com\//i.test(value)) return value;
  return value
    .replace(/=w\d+-h\d+/g, "=w1600-h1200")
    .replace(/=s\d+/g, "=s1600");
}

export function proxiedGooglePlaceImageUrl(raw: unknown): string | null {
  const value = upgradeGooglePhotoResolution(raw);
  if (!value) return null;
  if (isLocalCachedMediaUrl(value) || value.startsWith("/api/media/")) return value;
  if (value.startsWith("/api/map/places/photo") || value.startsWith("/api/map/places/photo-media")) {
    return value;
  }
  if (value.startsWith("/map/places/photo")) {
    return `/api${value}`;
  }

  if (
    !/^https?:\/\//i.test(value) &&
    !value.startsWith("/") &&
    value.length > 40 &&
    !/\s/.test(value)
  ) {
    return googlePlacePhotoProxyUrl(value);
  }

  try {
    const u = new URL(value);
    if (u.hostname === "maps.googleapis.com" && u.pathname === "/maps/api/place/photo") {
      const ref = u.searchParams.get("photo_reference") || u.searchParams.get("photoreference") || "";
      if (!ref) return value;
      const maxwidth = u.searchParams.get("maxwidth") || "800";
      return googlePlacePhotoProxyUrl(ref, maxwidth);
    }

    if (u.hostname === "places.googleapis.com" && u.pathname.startsWith("/v1/") && u.pathname.endsWith("/media")) {
      const resource = u.pathname.slice("/v1/".length, -"/media".length).replace(/^\/+|\/+$/g, "");
      if (!resource) return value;
      const maxWidthPx = u.searchParams.get("maxWidthPx") || "1200";
      return `/api/map/places/photo-media?resource=${encodeURIComponent(resource)}&maxWidthPx=${encodeURIComponent(maxWidthPx)}`;
    }
  } catch {
    return value;
  }

  return value;
}

export function normalizeMapImageFields<T extends { photoUrl?: string | null; coverPhotoUrl?: string | null }>(row: T): T {
  const photo = String(row.photoUrl ?? "").trim();
  const cover = String(row.coverPhotoUrl ?? "").trim();
  return {
    ...row,
    photoUrl: isLocalCachedMediaUrl(photo) ? photo : proxiedGooglePlaceImageUrl(row.photoUrl),
    coverPhotoUrl: isLocalCachedMediaUrl(cover) ? cover : proxiedGooglePlaceImageUrl(row.coverPhotoUrl),
  };
}

export function normalizeImageUrlValue(raw: unknown): string | null {
  return proxiedGooglePlaceImageUrl(raw);
}
