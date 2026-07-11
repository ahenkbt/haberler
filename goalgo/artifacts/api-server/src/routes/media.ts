import { Router, type IRouter, type Request } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db, newsTable } from "@workspace/db";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";
import jwt from "jsonwebtoken";
import {
  downloadExternalImageToMedia,
  extFromMime,
  mediaObjectExists,
  reoptimizeLocalUploadToWebp,
  saveMediaBuffer,
} from "../lib/mediaUploadService";
import { migrateMediaToDisk, type MediaMigrateScope } from "../lib/mediaBulkMigrate";
import { getMediaStorageMode } from "../lib/mediaStorageConfig";
import { logger } from "../lib/logger";
import { getSessionSecret } from "../lib/secrets";

const router: IRouter = Router();

const MAX_BYTES_IMAGE = 6 * 1024 * 1024;
const MAX_BYTES_PDF = 12 * 1024 * 1024;
const MAX_BYTES_VIDEO = 15 * 1024 * 1024;

/** GET `/api/media/uploads/:name` → `app.ts` (oturum ve rate limit dışı). */

function hmJwtSecret(): string {
  const s = String(process.env["HM_EDITOR_JWT_SECRET"] ?? "").trim();
  if (s) return s;
  return getSessionSecret();
}

function hasUploadBearer(req: Request): boolean {
  const auth = String(req.headers.authorization ?? "").trim();
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return false;
  try {
    const payload = jwt.verify(token, getSessionSecret()) as jwt.JwtPayload;
    return Boolean(
      (payload.typ === "vendor" && payload.vendorId) ||
        (payload.typ === "courier" && payload.courierId) ||
        payload.userId,
    );
  } catch {
    /* fall through — HM editör / köşe yazarı ayrı sır ile imzalanır */
  }
  try {
    const hm = jwt.verify(token, hmJwtSecret()) as jwt.JwtPayload;
    return Boolean(
      (hm.typ === "hm_editor" && typeof hm.eid === "number") ||
        (hm.typ === "hm_author" && typeof hm.aid === "number"),
    );
  } catch {
    return false;
  }
}

router.post("/media/upload", async (req, res): Promise<void> => {
  const maintenanceSecret = String(process.env["ADMIN_MAINTENANCE_SECRET"] ?? "").trim();
  const maintenanceHeader = String(req.headers["x-yekpare-admin-secret"] ?? "").trim();
  const adminOk = req.session?.panelBootstrap === true || Boolean(maintenanceSecret && maintenanceHeader === maintenanceSecret);
  if (!adminOk && !hasUploadBearer(req)) {
    res.status(401).json({ error: "Kimlik doğrulama gerekli" });
    return;
  }
  const dataUrl =
    req.body && typeof (req.body as { dataUrl?: unknown }).dataUrl === "string"
      ? String((req.body as { dataUrl: string }).dataUrl).trim()
      : "";
  const uploadTitle =
    req.body && typeof (req.body as { title?: unknown }).title === "string"
      ? String((req.body as { title: string }).title).trim()
      : "";
  const m =
    dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/i) ||
    dataUrl.match(/^data:(application\/pdf);base64,(.+)$/i) ||
    dataUrl.match(/^data:(video\/(?:mp4|webm|ogg));base64,(.+)$/i);
  if (!m) {
    res.status(400).json({ error: "Geçersiz data URL (jpeg, png, gif, webp, pdf, mp4, webm veya ogg)" });
    return;
  }
  const mime = m[1].toLowerCase();
  const b64 = m[2].replace(/\s/g, "");
  let buf: Buffer;
  try {
    buf = Buffer.from(b64, "base64");
  } catch {
    res.status(400).json({ error: "Base64 okunamadı" });
    return;
  }
  const maxBytes = mime === "application/pdf" ? MAX_BYTES_PDF : mime.startsWith("video/") ? MAX_BYTES_VIDEO : MAX_BYTES_IMAGE;
  if (!buf.length || buf.length > maxBytes) {
    res.status(400).json({ error: `Dosya çok büyük (en fazla ${maxBytes / 1024 / 1024} MB)` });
    return;
  }
  const ext = extFromMime(mime);
  if (!ext) {
    res.status(400).json({ error: "Desteklenmeyen dosya türü" });
    return;
  }
  try {
    const saved = await saveMediaBuffer(buf, {
      ext,
      mime,
      optimizeNewsImage: mime.startsWith("image/"),
      ...(uploadTitle && mime.startsWith("image/") ? { title: uploadTitle } : {}),
    });
    res.json({ url: saved.url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ err: e, storage: getMediaStorageMode() }, "[media-upload] save failed");
    /* S3/TLS bağlantı hataları editör panelinde anlaşılır görünsün (gizli değer sızdırmadan). */
    const s3Issue = /EPROTO|handshake|certificate|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|AccessDenied|SignatureDoesNotMatch|InvalidAccessKeyId|NoSuchBucket/i.test(msg);
    res.status(500).json({
      error: s3Issue
        ? "Yükleme başarısız: medya diski yazılamadı. Yönetici: Render Disk veya MEDIA_UPLOAD_ROOT tanımlayın; Cloudflare R2 kullanmayacaksanız S3 değişkenlerini kaldırın veya MEDIA_STORAGE_MODE=volume ayarlayın."
        : "Yükleme başarısız",
      ...(process.env.NODE_ENV === "production" ? {} : { detail: msg, storage: getMediaStorageMode() }),
    });
  }
});

/**
 * Harici `image_url` (http/https) olan haber görsellerini sunucuya çeker.
 * Yalnızca dış URL'ler; `/api/media/uploads/…` kırık dosyalar için volume/S3 yedeği gerekir.
 */
router.post("/media/repair-external-images", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;

  const limit = Math.min(200, Math.max(1, Number((req.body as { limit?: number })?.limit) || 50));
  const dryRun = (req.body as { dryRun?: boolean })?.dryRun === true;

  const rows = await db
    .select({
      id: newsTable.id,
      imageUrl: newsTable.imageUrl,
      title: newsTable.title,
    })
    .from(newsTable)
    .where(
      or(
        ilike(newsTable.imageUrl, "http://%"),
        ilike(newsTable.imageUrl, "https://%"),
      ),
    )
    .limit(limit);

  const results: Array<{ id: number; from: string; to?: string; ok: boolean; error?: string }> = [];

  for (const row of rows) {
    const from = String(row.imageUrl ?? "").trim();
    if (!/^https?:\/\//i.test(from)) continue;
    if (dryRun) {
      results.push({ id: row.id, from, ok: true });
      continue;
    }
    try {
      const to = await downloadExternalImageToMedia(from, {
        title: String(row.title ?? "").trim() || "haber",
        hashSeed: from,
      });
      if (!to) {
        results.push({ id: row.id, from, ok: false, error: "indirilemedi" });
        continue;
      }
      await db.update(newsTable).set({ imageUrl: to }).where(eq(newsTable.id, row.id));
      results.push({ id: row.id, from, to, ok: true });
    } catch (e: unknown) {
      results.push({
        id: row.id,
        from,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  res.json({
    ok: true,
    dryRun,
    storage: getMediaStorageMode(),
    scanned: rows.length,
    results,
  });
});

/** Kırık `/api/media/uploads/…` referanslarını listeler (onarım için teşhis). */
router.get("/media/missing-uploads", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;

  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
  const rows = await db
    .select({ id: newsTable.id, imageUrl: newsTable.imageUrl })
    .from(newsTable)
    .where(ilike(newsTable.imageUrl, "/api/media/uploads/%"))
    .limit(limit);

  const missing: Array<{ id: number; imageUrl: string; fname: string }> = [];
  for (const row of rows) {
    const imageUrl = String(row.imageUrl ?? "");
    const fname = imageUrl.replace(/^.*\/api\/media\/uploads\//, "").split("?")[0] ?? "";
    if (!fname) continue;
    if (!(await mediaObjectExists(fname))) {
      missing.push({ id: row.id, imageUrl, fname });
    }
  }

  res.json({
    ok: true,
    storage: getMediaStorageMode(),
    checked: rows.length,
    missingCount: missing.length,
    missing,
    hint:
      "Eksik dosyalar volume yedeğinden kopyalanmalı veya haber görseli hâlâ harici URL ise POST /api/media/repair-external-images kullanın.",
  });
});

/**
 * Mevcut haber, logo, köşe yazarı, banner ve RSS görsellerini site diskine taşır.
 * Eksik `/api/media/uploads/…` dosyalarını legacy Railway'den kopyalar.
 */
router.post("/media/migrate-to-disk", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;

  const body = (req.body ?? {}) as {
    limit?: number;
    dryRun?: boolean;
    includeExternal?: boolean;
    scopes?: MediaMigrateScope[];
  };
  const limit = Math.min(500, Math.max(1, Number(body.limit) || 100));
  const dryRun = body.dryRun === true;
  const includeExternal = body.includeExternal !== false;
  const scopes = Array.isArray(body.scopes) ? body.scopes : (["all"] as MediaMigrateScope[]);

  try {
    const result = await migrateMediaToDisk({ limit, dryRun, includeExternal, scopes });
    res.json({
      ok: true,
      storage: getMediaStorageMode(),
      mediaRoot: process.env.MEDIA_UPLOAD_ROOT ?? "(varsayılan)",
      ...result,
      hint: dryRun
        ? "dryRun=true — gerçek taşıma için dryRun:false ile tekrar çağırın."
        : "Toplu taşıma tamamlandı. Kalan kayıtlar için limit artırıp tekrar çalıştırın.",
    });
  } catch (e: unknown) {
    logger.error({ err: e }, "[media-migrate] failed");
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "Taşıma başarısız",
    });
  }
});

/** Yerel `/api/media/uploads/*.(jpg|png|…)` haber görsellerini WebP'ye çevirir ve eski dosyayı siler. */
router.post("/media/reoptimize-news-images", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;

  const limit = Math.min(200, Math.max(1, Number((req.body as { limit?: number })?.limit) || 50));
  const dryRun = (req.body as { dryRun?: boolean })?.dryRun === true;

  const rows = await db
    .select({ id: newsTable.id, imageUrl: newsTable.imageUrl })
    .from(newsTable)
    .where(ilike(newsTable.imageUrl, "/api/media/uploads/%"))
    .limit(limit);

  const results: Array<{ id: number; from: string; to?: string; ok: boolean; error?: string }> = [];

  for (const row of rows) {
    const from = String(row.imageUrl ?? "").trim();
    const fname = from.replace(/^.*\/api\/media\/uploads\//, "").split("?")[0] ?? "";
    if (!fname || /\.webp$/i.test(fname)) {
      results.push({ id: row.id, from, ok: true });
      continue;
    }
    if (dryRun) {
      results.push({ id: row.id, from, ok: true });
      continue;
    }
    try {
      const to = await reoptimizeLocalUploadToWebp(fname);
      if (!to || to === from) {
        results.push({ id: row.id, from, ok: false, error: "optimize edilemedi" });
        continue;
      }
      await db.update(newsTable).set({ imageUrl: to }).where(eq(newsTable.id, row.id));
      results.push({ id: row.id, from, to, ok: true });
    } catch (e: unknown) {
      results.push({
        id: row.id,
        from,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  res.json({ ok: true, dryRun, scanned: rows.length, results });
});

export default router;
