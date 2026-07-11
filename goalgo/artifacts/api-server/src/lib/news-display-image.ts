import { mediaObjectExists, publicUploadPath } from "./mediaUploadService";

const UPLOAD_PATH_RE = /\/api\/media\/uploads\/([a-zA-Z0-9._-]+)/g;

export function uploadFnameFromImageUrl(imageUrl: string | null | undefined): string | null {
  const raw = String(imageUrl ?? "").trim();
  if (!raw) return null;
  const m = raw.match(/\/api\/media\/uploads\/([a-zA-Z0-9._-]+)/);
  return m?.[1] ?? null;
}

export function collectUploadFnamesFromHtml(html: string | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const text = String(html ?? "");
  if (!text) return out;
  for (const m of text.matchAll(UPLOAD_PATH_RE)) {
    const fname = m[1];
    if (!fname || seen.has(fname)) continue;
    seen.add(fname);
    out.push(fname);
  }
  return out;
}

async function uploadPathExists(imageUrl: string | null | undefined): Promise<boolean> {
  const fname = uploadFnameFromImageUrl(imageUrl);
  if (!fname) return false;
  return mediaObjectExists(fname);
}

/**
 * Manşet / liste için görsel: önce `imageUrl`, yoksa veya volume/S3’te yoksa içerikteki ilk mevcut upload.
 * Harici http(s) URL’lere dokunulmaz.
 */
export async function resolveNewsDisplayImageUrl(
  imageUrl: string | null | undefined,
  content: string | null | undefined,
): Promise<string | null> {
  const primary = String(imageUrl ?? "").trim();
  if (primary && /^https?:\/\//i.test(primary)) return primary;
  if (primary && (await uploadPathExists(primary))) return primary;

  for (const fname of collectUploadFnamesFromHtml(content)) {
    if (await mediaObjectExists(fname)) return publicUploadPath(fname);
  }

  return primary || null;
}

export async function newsRowHasResolvableDisplayImage(
  imageUrl: string | null | undefined,
  content: string | null | undefined,
): Promise<boolean> {
  const resolved = await resolveNewsDisplayImageUrl(imageUrl, content);
  if (!resolved) return false;
  if (/^https?:\/\//i.test(resolved)) return true;
  return uploadPathExists(resolved);
}

/** Liste/kart API — yalnızca kayıtlı kapak alanları; içerik/HTML veya peer yedek yok. */
export function resolveNewsItemImageUrl(item: {
  imageUrl?: string | null;
  featuredImage?: string | null;
  thumbnailUrl?: string | null;
  thumbnail?: string | null;
  imageFallbackUrl?: string | null;
  image?: string | null;
  enclosure?: { url?: string | null } | string | null;
} | null | undefined): string | null {
  if (!item) return null;
  const enclosure =
    typeof item.enclosure === "string"
      ? item.enclosure
      : String(item.enclosure?.url ?? "").trim() || null;
  for (const raw of [
    item.imageUrl,
    item.featuredImage,
    item.image,
    item.thumbnailUrl,
    item.thumbnail,
    enclosure,
  ]) {
    const s = String(raw ?? "").trim();
    if (s) return s;
  }
  return null;
}

/** WebP mirror veya yerel upload yoksa harici kapak yedeği. */
export function resolveNewsItemImageFallbackUrl(item: {
  imageUrl?: string | null;
  featuredImage?: string | null;
  imageFallbackUrl?: string | null;
  thumbnailUrl?: string | null;
  thumbnail?: string | null;
  image?: string | null;
  enclosure?: { url?: string | null } | string | null;
} | null | undefined): string | null {
  if (!item) return null;
  const primary = resolveNewsItemImageUrl(item);
  const enclosure =
    typeof item.enclosure === "string"
      ? item.enclosure
      : String(item.enclosure?.url ?? "").trim() || null;
  for (const raw of [item.imageFallbackUrl, item.featuredImage, item.thumbnailUrl, item.thumbnail, item.image, enclosure]) {
    const s = String(raw ?? "").trim();
    if (!s || s === primary) continue;
    if (/^https?:\/\//i.test(s) || s.startsWith("//")) {
      return s.startsWith("//") ? `https:${s.slice(2)}` : s;
    }
  }
  return null;
}
