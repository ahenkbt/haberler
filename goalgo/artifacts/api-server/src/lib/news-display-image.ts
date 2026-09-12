import { parseMetaImageFromHtml } from "./articlePageImage.js";
import { isMissingNewsCoverImage } from "./hm-tepe-manset-select.js";
import { mediaObjectExists, publicUploadPath } from "./mediaUploadService";
import { extractRssCoverImage } from "./rssItemMedia.js";

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

/** Spot / gövde / RSS XML içinden og:image veya enclosure kapak. */
export function extractNewsCoverFromHtml(
  html: string | null | undefined,
  pageUrl?: string | null,
): string | null {
  const raw = String(html ?? "");
  if (!raw.trim()) return null;
  const page = String(pageUrl ?? "").trim();
  const fromMeta = parseMetaImageFromHtml(raw, page || "https://example.invalid/");
  if (fromMeta && isUsableNewsCoverUrl(fromMeta)) return fromMeta;
  const fromRss = extractRssCoverImage(raw, raw, page);
  if (fromRss && isUsableNewsCoverUrl(fromRss)) return fromRss;
  return null;
}

type NewsImageFields = {
  imageUrl?: string | null;
  featuredImage?: string | null;
  thumbnailUrl?: string | null;
  thumbnail?: string | null;
  imageFallbackUrl?: string | null;
  image?: string | null;
  enclosure?: { url?: string | null } | string | null;
  spot?: string | null;
  content?: string | null;
  rssSourceUrl?: string | null;
};

/** Liste/kart API — kayıtlı kapak alanları, yoksa spot/gövde enclosure. */
export function resolveNewsItemImageUrl(item: NewsImageFields | null | undefined): string | null {
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
    if (s && isUsableNewsCoverUrl(s)) return s;
    if (s) return s;
  }
  return (
    extractNewsCoverFromHtml(item.spot, item.rssSourceUrl) ||
    extractNewsCoverFromHtml(item.content, item.rssSourceUrl)
  );
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

const PLACEHOLDER_COVER_RE =
  /haber-gorsel-hazirlaniyor|gorsel-hazirlan|gorsel_hazirlan|(?:^|[/_-])(?:placeholder|no-image|noimage)(?:[._/-]|$)/i;

/** Anasayfa / home-bundle: boş, data-URI ve «Görsel Hazırlanmaktadır» kapak sayılmaz. */
export function isUsableNewsCoverUrl(src: string | null | undefined): boolean {
  if (isMissingNewsCoverImage(src)) return false;
  if (PLACEHOLDER_COVER_RE.test(String(src ?? "").trim())) return false;
  return true;
}

export function newsItemHasUsableCover(item: Parameters<typeof resolveNewsItemImageUrl>[0]): boolean {
  return isUsableNewsCoverUrl(resolveNewsItemImageUrl(item)) || isUsableNewsCoverUrl(resolveNewsItemImageFallbackUrl(item));
}

export function filterNewsItemsWithUsableCover<T extends Parameters<typeof resolveNewsItemImageUrl>[0]>(
  items: readonly T[],
): T[] {
  return items.filter((item) => newsItemHasUsableCover(item));
}
