import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ilike } from "drizzle-orm";
import { db, newsTable } from "@workspace/db";
import { getMediaUploadRoot } from "./mediaUploadRoot";
import { putS3Object, s3ObjectExists } from "./mediaObjectStorage";
import { getMediaStorageMode, shouldUseS3ForMediaIo } from "./mediaStorageConfig";
import { parseUploadFname } from "./mediaBulkMigrate";
import { logger } from "./logger";

const SAFE_FNAME = /^[a-zA-Z0-9._-]+$/;

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
};

function mimeFromFname(fname: string): string {
  const ext = fname.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function legacyMediaOrigin(): string | null {
  const raw = process.env.LEGACY_MEDIA_ORIGIN;
  if (raw != null) {
    const t = raw.trim();
    if (!t || t === "0" || t === "false" || t === "off") return null;
    return t.replace(/\/+$/, "");
  }
  return "https://goalgo-y7ze.onrender.com";
}

async function readLocalMediaBytes(fname: string): Promise<Buffer | null> {
  const root = getMediaUploadRoot();
  const primary = join(root, fname);
  const legacy = join(process.cwd(), "data", "media-uploads", fname);
  for (const path of [primary, legacy]) {
    if (!existsSync(path)) continue;
    try {
      const buf = await readFile(path);
      return buf.length > 0 ? buf : null;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function fetchLegacyMediaBytes(fname: string): Promise<Buffer | null> {
  const legacy = legacyMediaOrigin();
  const candidates = [
    legacy ? `${legacy}/api/media/uploads/${fname}` : null,
    `https://goalgo-y7ze.onrender.com/api/media/uploads/${fname}`,
    `https://goalgo-production.up.railway.app/api/media/uploads/${fname}`,
    `https://yekpare.net/api/media/uploads/${fname}`,
  ].filter(Boolean) as string[];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
        headers: { Accept: "image/*,application/pdf,video/*,audio/*,*/*;q=0.8" },
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 0) return buf;
    } catch (e) {
      logger.warn({ err: e, fname, url }, "[media-r2-migrate] legacy fetch failed");
    }
  }
  return null;
}

/** Tek dosyayı R2'ye yükler — yerel disk veya legacy Render/Railway kaynağından. */
export async function ensureUploadFileInR2(fname: string): Promise<boolean> {
  if (!fname || fname.includes("..") || !SAFE_FNAME.test(fname)) return false;
  if (!shouldUseS3ForMediaIo()) return false;

  try {
    if (await s3ObjectExists(fname)) return true;
  } catch (e) {
    logger.warn({ err: e, fname }, "[media-r2-migrate] s3 head failed");
    return false;
  }

  let buf = await readLocalMediaBytes(fname);
  if (!buf?.length) buf = await fetchLegacyMediaBytes(fname);
  if (!buf?.length) return false;

  try {
    await putS3Object(fname, buf, mimeFromFname(fname));
    logger.info({ fname, bytes: buf.length }, "[media-r2-migrate] uploaded to R2");
    return true;
  } catch (e) {
    logger.error({ err: e, fname }, "[media-r2-migrate] s3 put failed");
    return false;
  }
}

export type MediaR2MigrateResult = {
  dryRun: boolean;
  storage: string;
  scannedLocal: number;
  scannedDb: number;
  uploaded: number;
  alreadyInR2: number;
  skipped: number;
  failed: number;
  details: Array<{ fname: string; source: string; ok: boolean; error?: string }>;
};

async function listLocalMediaFilenames(limit: number): Promise<string[]> {
  const root = getMediaUploadRoot();
  if (!existsSync(root)) return [];
  const entries = await readdir(root, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (!SAFE_FNAME.test(name)) continue;
    out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}

/** Render diski / legacy kaynak → Cloudflare R2 toplu taşıma. */
export async function migrateMediaVolumeToR2(opts: {
  limit?: number;
  dryRun?: boolean;
  includeDbReferenced?: boolean;
  scanLocalDisk?: boolean;
}): Promise<MediaR2MigrateResult> {
  const limit = Math.min(2000, Math.max(1, opts.limit ?? 200));
  const dryRun = opts.dryRun === true;
  const includeDbReferenced = opts.includeDbReferenced !== false;
  const scanLocalDisk = opts.scanLocalDisk !== false;

  const result: MediaR2MigrateResult = {
    dryRun,
    storage: getMediaStorageMode(),
    scannedLocal: 0,
    scannedDb: 0,
    uploaded: 0,
    alreadyInR2: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  if (!shouldUseS3ForMediaIo()) {
    throw new Error(
      "R2 yapılandırması aktif değil — Render'da MEDIA_STORAGE_MODE=s3 ve S3_* değişkenlerini tanımlayın.",
    );
  }

  const seen = new Set<string>();

  if (scanLocalDisk) {
    const localFiles = await listLocalMediaFilenames(limit);
    result.scannedLocal = localFiles.length;
    for (const fname of localFiles) {
      if (seen.has(fname)) continue;
      seen.add(fname);
      if (dryRun) {
        result.skipped += 1;
        continue;
      }
      try {
        if (await s3ObjectExists(fname)) {
          result.alreadyInR2 += 1;
          continue;
        }
      } catch {
        /* upload attempt below */
      }
      const ok = await ensureUploadFileInR2(fname);
      if (ok) {
        result.uploaded += 1;
        if (result.details.length < 100) {
          result.details.push({ fname, source: "local-disk", ok: true });
        }
      } else {
        result.failed += 1;
        if (result.details.length < 100) {
          result.details.push({ fname, source: "local-disk", ok: false, error: "yüklenemedi" });
        }
      }
    }
  }

  if (includeDbReferenced) {
    const rows = await db
      .select({ imageUrl: newsTable.imageUrl })
      .from(newsTable)
      .where(ilike(newsTable.imageUrl, "/api/media/uploads/%"))
      .limit(limit);

    const fnames = new Set<string>();
    for (const row of rows) {
      const fname = parseUploadFname(String(row.imageUrl ?? ""));
      if (fname) fnames.add(fname);
    }
    result.scannedDb = fnames.size;

    for (const fname of fnames) {
      if (seen.has(fname)) continue;
      seen.add(fname);
      if (dryRun) {
        result.skipped += 1;
        continue;
      }
      try {
        if (await s3ObjectExists(fname)) {
          result.alreadyInR2 += 1;
          continue;
        }
      } catch {
        /* continue */
      }
      const ok = await ensureUploadFileInR2(fname);
      if (ok) {
        result.uploaded += 1;
        if (result.details.length < 100) {
          result.details.push({ fname, source: "db-reference", ok: true });
        }
      } else {
        result.failed += 1;
        if (result.details.length < 100) {
          result.details.push({ fname, source: "db-reference", ok: false, error: "bulunamadı" });
        }
      }
    }
  }

  return result;
}

/** Yerel dosyaları stream ile listeler (çok büyük diskler için). */
export async function countLocalMediaFiles(): Promise<number> {
  const root = getMediaUploadRoot();
  if (!existsSync(root)) return 0;
  const entries = await readdir(root, { withFileTypes: true });
  return entries.filter((e) => e.isFile() && SAFE_FNAME.test(e.name)).length;
}
