import { extFromMime } from "./mediaUploadService.js";
import { logger } from "./logger.js";

/** Haber kartları için hedef genişlik (mobil vitrin). */
export const NEWS_IMAGE_MAX_WIDTH = 720;
export const NEWS_IMAGE_WEBP_QUALITY = 78;

export function shouldOptimizeNewsImage(mime: string, ext: string): boolean {
  const m = mime.toLowerCase();
  const e = ext.toLowerCase();
  if (m === "image/svg+xml" || e === "svg") return false;
  if (m === "image/gif" || e === "gif") return false;
  return m.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "bmp"].includes(e);
}

export async function optimizeNewsImageBuffer(
  buf: Buffer,
  contentType?: string,
): Promise<{ buf: Buffer; mime: string; ext: string }> {
  const declared = String(contentType ?? "").split(";")[0]?.trim().toLowerCase() || "";
  if (!shouldOptimizeNewsImage(declared, extFromMime(declared) ?? "jpg")) {
    const mime = declared || "image/jpeg";
    const ext = extFromMime(mime) ?? "jpg";
    return { buf, mime, ext };
  }

  try {
    const sharpMod = await import("sharp");
    const sharp = sharpMod.default;
    const out = await sharp(buf)
      .rotate()
      .resize({ width: NEWS_IMAGE_MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: NEWS_IMAGE_WEBP_QUALITY, effort: 4 })
      .toBuffer();
    return { buf: out, mime: "image/webp", ext: "webp" };
  } catch (e) {
    logger.warn({ err: e }, "[news-image] WebP optimize atlandı — orijinal kaydedilecek");
    const mime = declared || "image/jpeg";
    const ext = extFromMime(mime) ?? "jpg";
    return { buf, mime, ext };
  }
}
