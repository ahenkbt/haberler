import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { Readable } from "node:stream";
import { getMediaUploadRoot } from "./mediaUploadRoot";
import {
  getMediaStorageMode,
  hasPersistentVolumeMount,
  isS3TransportError,
  noteS3RuntimeFailure,
  shouldUseS3ForMediaIo,
} from "./mediaStorageConfig";
import { getS3ObjectStream, putS3Object, s3ObjectExists } from "./mediaObjectStorage";
import { logger } from "./logger";
import { optimizeNewsImageBuffer, shouldOptimizeNewsImage } from "./newsImageOptimize.js";
import { newsCoverFilenameStem, sanitizeMediaFilenameStem } from "./newsCoverFilename.js";

export type SaveMediaBufferOpts = {
  ext: string;
  mime: string;
  prefix?: string;
  /** Başlık tabanlı dosya adı gövdesi (uzantı hariç); verilirse `prefix+timestamp` yerine kullanılır. */
  filenameStem?: string;
  /** `filenameStem` yokken başlıktan otomatik üretim için. */
  title?: string;
  /** Hash çakışması önleme — genelde kaynak URL. */
  hashSeed?: string;
  optimizeNewsImage?: boolean;
};

export type DownloadExternalImageOpts = {
  timeoutMs?: number;
  title?: string;
  hashSeed?: string;
};

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "application/pdf": "pdf",
  "audio/mpeg": "mp3",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
};

const IMAGE_DOWNLOAD_MAX_BYTES = 8 * 1024 * 1024;

export type ExternalImageDownloadResult =
  | {
      ok: true;
      url: string;
      sourceUrl: string;
      finalUrl: string;
      contentType: string;
      bytes: number;
      attempts: string[];
    }
  | {
      ok: false;
      error: string;
      attempts: string[];
    };

function defaultContainerMediaUploadDir(): string {
  return join(process.cwd(), "data", "media-uploads");
}

function localPaths(name: string): string[] {
  const primary = join(getMediaUploadRoot(), name);
  const legacy = join(defaultContainerMediaUploadDir(), name);
  if (legacy === primary) return [primary];
  return [primary, legacy];
}

async function writeLocalMediaFile(name: string, buf: Buffer): Promise<void> {
  const root = getMediaUploadRoot();
  await mkdir(root, { recursive: true });
  await writeFile(join(root, name), buf);
}

export type ResolvedMedia =
  | { kind: "redirect"; url: string }
  | { kind: "file"; path: string }
  | { kind: "stream"; stream: Readable; contentType?: string };

function resolveLocalMedia(name: string): ResolvedMedia | null {
  for (const p of localPaths(name)) {
    if (existsSync(p)) return { kind: "file", path: p };
  }
  return null;
}

export function publicUploadPath(name: string): string {
  return `/api/media/uploads/${name}`;
}

/** İstemciye dönen adres: her zaman site vekili (`/api/media/uploads/…`); doğrudan r2.dev kullanılmaz. */
export function publicUploadUrl(name: string): string {
  return publicUploadPath(name);
}

function resolveFilenameStem(opts: SaveMediaBufferOpts): string | undefined {
  if (opts.filenameStem?.trim()) return sanitizeMediaFilenameStem(opts.filenameStem);
  if (opts.title?.trim()) return newsCoverFilenameStem(opts.title, opts.hashSeed);
  return undefined;
}

export async function saveMediaBuffer(
  buf: Buffer,
  opts: SaveMediaBufferOpts,
): Promise<{ fname: string; url: string }> {
  let outBuf = buf;
  let ext = opts.ext;
  let mime = opts.mime;
  const stem = resolveFilenameStem(opts);
  const optimize =
    opts.optimizeNewsImage === true ||
    (opts.optimizeNewsImage !== false &&
      shouldOptimizeNewsImage(mime, ext) &&
      (Boolean(stem) || /^(rss-|haber-gonder-|hm-|news-|editor-)/i.test(String(opts.prefix ?? ""))));
  if (optimize && shouldOptimizeNewsImage(mime, ext)) {
    const optimized = await optimizeNewsImageBuffer(buf, mime);
    outBuf = optimized.buf;
    ext = optimized.ext;
    mime = optimized.mime;
  }
  const prefix = opts.prefix ?? "";
  const fname = stem
    ? `${stem}.${ext}`
    : `${prefix}${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
  if (getMediaStorageMode() === "s3") {
    try {
      await putS3Object(fname, outBuf, mime);
    } catch (e) {
      logger.error({ err: e, fname }, "[media-upload] S3 put failed");
      noteS3RuntimeFailure(e instanceof Error ? e.message : String(e));
      await writeLocalMediaFile(fname, outBuf);
      logger.warn(
        {
          fname,
          root: getMediaUploadRoot(),
          persistent: hasPersistentVolumeMount(),
        },
        "[media-upload] S3 başarısız — dosya site diskine yazıldı",
      );
    }
  } else {
    await writeLocalMediaFile(fname, outBuf);
  }
  return { fname, url: publicUploadUrl(fname) };
}

const DEFAULT_LEGACY_MEDIA_ORIGIN = "https://goalgo-production.up.railway.app";

function legacyMediaOrigin(): string | null {
  const raw = process.env.LEGACY_MEDIA_ORIGIN;
  if (raw != null) {
    const t = raw.trim();
    if (!t || t === "0" || t === "false" || t === "off") return null;
    return t.replace(/\/+$/, "");
  }
  return DEFAULT_LEGACY_MEDIA_ORIGIN;
}

export async function resolveMediaForGet(name: string): Promise<ResolvedMedia | null> {
  const local = resolveLocalMedia(name);
  if (local) return local;

  if (shouldUseS3ForMediaIo()) {
    try {
      const obj = await getS3ObjectStream(name);
      if (obj) return { kind: "stream", stream: obj.body, contentType: obj.contentType };
    } catch (e) {
      if (isS3TransportError(e)) {
        noteS3RuntimeFailure(e instanceof Error ? e.message : String(e));
      }
      logger.warn(
        { err: e, name, transport: isS3TransportError(e) },
        "[media-get] S3 read failed — volume yedeğine bakılıyor",
      );
      const retryLocal = resolveLocalMedia(name);
      if (retryLocal) return retryLocal;
    }
  }

  const legacy = legacyMediaOrigin();
  if (legacy) {
    return { kind: "redirect", url: `${legacy}/api/media/uploads/${name}` };
  }
  return null;
}

export async function mediaObjectExists(name: string): Promise<boolean> {
  if (resolveLocalMedia(name)) return true;
  if (!shouldUseS3ForMediaIo()) return false;
  try {
    return await s3ObjectExists(name);
  } catch (e) {
    if (isS3TransportError(e)) {
      noteS3RuntimeFailure(e instanceof Error ? e.message : String(e));
    }
    logger.warn({ err: e, name }, "[media-exists] S3 head failed");
    return false;
  }
}

export function extFromMime(mime: string): string | null {
  return MIME_EXT[mime.toLowerCase()] ?? null;
}

function extFromUrl(u: string): string | null {
  const low = u.split("?")[0]?.toLowerCase() ?? "";
  if (low.endsWith(".png")) return "png";
  if (low.endsWith(".jpg") || low.endsWith(".jpeg")) return "jpg";
  if (low.endsWith(".webp")) return "webp";
  if (low.endsWith(".gif")) return "gif";
  return null;
}

function safeDecodeUrlPart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function encodeUrlPathname(pathname: string): string {
  return pathname
    .split("/")
    .map((segment) => encodeURIComponent(safeDecodeUrlPart(segment)))
    .join("/");
}

function addUniqueUrl(out: string[], candidate: string | null | undefined): void {
  const clean = String(candidate ?? "").trim().replace(/&amp;/gi, "&");
  if (!clean || out.includes(clean)) return;
  out.push(clean);
}

function stripWordPressSizeSuffix(pathname: string): string {
  return pathname.replace(/-\d{2,5}x\d{2,5}(?=\.[a-z0-9]{2,5}$)/i, "");
}

function externalImageUrlCandidates(raw: string): string[] {
  const out: string[] = [];
  const clean = String(raw ?? "").trim().replace(/&amp;/gi, "&");
  addUniqueUrl(out, clean);
  if (!/^https?:\/\//i.test(clean)) return out;

  try {
    const parsed = new URL(clean);

    const encoded = new URL(parsed.toString());
    encoded.pathname = encodeUrlPathname(encoded.pathname);
    addUniqueUrl(out, encoded.toString());

    const noQuery = new URL(encoded.toString());
    noQuery.search = "";
    addUniqueUrl(out, noQuery.toString());

    const originalSized = new URL(encoded.toString());
    originalSized.pathname = stripWordPressSizeSuffix(originalSized.pathname);
    addUniqueUrl(out, originalSized.toString());
    originalSized.search = "";
    addUniqueUrl(out, originalSized.toString());

    for (const candidate of [...out]) {
      const u = new URL(candidate);
      if (u.protocol === "https:") {
        u.protocol = "http:";
        addUniqueUrl(out, u.toString());
      } else if (u.protocol === "http:") {
        u.protocol = "https:";
        addUniqueUrl(out, u.toString());
      }
    }
  } catch {
    // The primary URL will be rejected by the allow-list below.
  }

  return out.slice(0, 10);
}

function imageFetchHeaders(url: string): HeadersInit {
  let referer: string | undefined;
  try {
    const u = new URL(url);
    referer = `${u.protocol}//${u.host}/`;
  } catch {
    referer = undefined;
  }
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 Yekpare-HM-ImageImporter/1.1",
    Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    ...(referer ? { Referer: referer } : {}),
  };
}

function imageMimeFromMagic(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buf.length >= 6) {
    const sig = buf.subarray(0, 6).toString("ascii");
    if (sig === "GIF87a" || sig === "GIF89a") return "image/gif";
  }
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  return null;
}

function isPrivateAddress(addr: string): boolean {
  const ipVersion = isIP(addr);
  if (ipVersion === 4) {
    const parts = addr.split(".").map((x) => Number(x));
    const [a, b] = parts;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      a === 0
    );
  }
  if (ipVersion === 6) {
    const low = addr.toLowerCase();
    if (low === "::1" || low === "::" || low.startsWith("fe80:") || low.startsWith("fc") || low.startsWith("fd")) {
      return true;
    }
    if (low.startsWith("::ffff:")) return isPrivateAddress(low.slice("::ffff:".length));
  }
  return false;
}

async function isAllowedExternalImageUrl(raw: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;
  const host = parsed.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost")) return false;
  if (isIP(host)) return !isPrivateAddress(host);
  try {
    const addresses = await lookup(host, { all: true, verbatim: false });
    if (addresses.length === 0) return false;
    return addresses.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

/** Harici HTTP(S) görseli indirip kalıcı medyaya yazar ve ayrıntılı hata döndürür. */
export async function downloadExternalImageToMediaDetailed(
  url: string,
  opts: DownloadExternalImageOpts = {},
): Promise<ExternalImageDownloadResult> {
  const u = url.trim();
  const attempts: string[] = [];
  if (!/^https?:\/\//i.test(u)) return { ok: false, error: "HTTP(S) olmayan URL", attempts };

  for (const candidate of externalImageUrlCandidates(u)) {
    if (!(await isAllowedExternalImageUrl(candidate))) {
      attempts.push(`${candidate}: izin verilmeyen hedef`);
      continue;
    }

    let res: Response;
    try {
      res = await fetch(candidate, {
        redirect: "follow",
        signal: AbortSignal.timeout(opts.timeoutMs ?? 8_000),
        headers: imageFetchHeaders(candidate),
      });
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      attempts.push(`${candidate}: ${reason}`);
      continue;
    }

    if (res.url && !(await isAllowedExternalImageUrl(res.url))) {
      attempts.push(`${candidate}: yönlendirme izin verilmeyen hedefe gitti`);
      continue;
    }
    if (!res.ok) {
      attempts.push(`${candidate}: HTTP ${res.status}`);
      continue;
    }

    const contentLength = Number(res.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > IMAGE_DOWNLOAD_MAX_BYTES) {
      attempts.push(`${candidate}: dosya çok büyük (${contentLength} bayt)`);
      continue;
    }

    const declaredType = (res.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) {
      attempts.push(`${candidate}: boş yanıt`);
      continue;
    }
    if (buf.length > IMAGE_DOWNLOAD_MAX_BYTES) {
      attempts.push(`${candidate}: dosya çok büyük (${buf.length} bayt)`);
      continue;
    }

    const sniffedType = imageMimeFromMagic(buf);
    const contentType = declaredType.startsWith("image/") ? declaredType : sniffedType;
    if (!contentType?.startsWith("image/")) {
      attempts.push(`${candidate}: görsel olmayan içerik (${declaredType || "content-type yok"})`);
      continue;
    }

    const ext = extFromMime(contentType) ?? extFromUrl(candidate) ?? "jpg";
    const mime = extFromMime(contentType) ? contentType : `image/${ext === "jpg" ? "jpeg" : ext}`;
    const saved = await saveMediaBuffer(buf, {
      ext,
      mime,
      title: opts.title,
      hashSeed: opts.hashSeed ?? u,
      prefix: opts.title ? undefined : "rss-",
      optimizeNewsImage: true,
    });
    return {
      ok: true,
      url: saved.url,
      sourceUrl: candidate,
      finalUrl: res.url || candidate,
      contentType: mime,
      bytes: buf.length,
      attempts,
    };
  }

  return {
    ok: false,
    error: attempts[attempts.length - 1] ?? "indirilebilir görsel bulunamadı",
    attempts,
  };
}

/** Harici HTTP(S) görseli indirip kalıcı medyaya yazar. */
export async function downloadExternalImageToMedia(
  url: string,
  opts: DownloadExternalImageOpts = {},
): Promise<string | null> {
  const result = await downloadExternalImageToMediaDetailed(url, opts);
  return result.ok ? result.url : null;
}

/** Yerel haber görselini WebP'ye sıkıştırır; başarılı olursa eski dosyayı siler. */
export async function reoptimizeLocalUploadToWebp(fname: string): Promise<string | null> {
  const name = String(fname ?? "").trim().split("?")[0] ?? "";
  if (!name || name.includes("..") || name.includes("/")) return null;
  if (/\.webp$/i.test(name)) return publicUploadPath(name);

  const local = resolveLocalMedia(name);
  if (local?.kind !== "file") return null;

  const buf = await readFile(local.path);
  const optimized = await optimizeNewsImageBuffer(buf);
  if (optimized.ext !== "webp") {
    return publicUploadPath(name);
  }

  const stemMatch = name.match(/^(.+)\.[a-z0-9]+$/i);
  const legacyPrefixMatch = name.match(/^(rss-|haber-gonder-|hm-|news-|editor-)/i);
  const saved = await saveMediaBuffer(optimized.buf, {
    ext: optimized.ext,
    mime: optimized.mime,
    filenameStem: legacyPrefixMatch ? undefined : stemMatch?.[1],
    prefix: legacyPrefixMatch?.[1] ?? "",
    optimizeNewsImage: false,
  });

  if (saved.fname !== name) {
    try {
      await unlink(local.path);
    } catch (e) {
      logger.warn({ err: e, fname: name }, "[news-image] eski dosya silinemedi");
    }
  }

  return saved.url;
}

export function createLocalReadStream(path: string): Readable {
  return createReadStream(path);
}
