import { Router, type IRouter, type Request, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pingDatabase } from "@workspace/db";
import {
  getMediaStorageMode,
  getMediaStoragePreference,
  hasPartialS3Config,
  hasPersistentVolumeMount,
  isRuntimeS3Disabled,
  isS3MediaConfigured,
  noteS3RuntimeFailure,
  s3EnvHealthDetails,
  s3PublicBaseUrl,
} from "../lib/mediaStorageConfig";
import { etkinlikIoEnvHealthDetails } from "../lib/etkinlik-io.js";
import { isNativeAiCallEnabled } from "../lib/ai-call/config.js";
import { s3ObjectExists } from "../lib/mediaObjectStorage";

const router: IRouter = Router();

/**
 * S3/R2 canlı bağlantı testi — upload "Yükleme başarısız" hatalarının kök nedenini
 * (TLS/endpoint/anahtar) prod üzerinde gizli değer sızdırmadan gösterir.
 */
const mediaProbe = async (_req: Request, res: Response) => {
  const base = {
    mode: getMediaStorageMode(),
    preference: getMediaStoragePreference(),
    runtimeS3Disabled: isRuntimeS3Disabled(),
    s3Configured: isS3MediaConfigured(),
    volumeMount: hasPersistentVolumeMount() ? "set" : "missing",
  };
  if (!isS3MediaConfigured()) {
    res.json({ ...base, s3Probe: "skipped (s3 yapılandırılmamış)" });
    return;
  }
  try {
    await s3ObjectExists("healthz-probe-object");
    res.json({ ...base, s3Probe: "ok" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(503).json({
      ...base,
      s3Probe: "failed",
      s3Error: msg.slice(0, 300),
      hint:
        "S3/R2 erişimi başarısız — S3_ENDPOINT (https://<account_id>.r2.cloudflarestorage.com biçiminde, bucket adı OLMADAN), S3_BUCKET ve anahtarları kontrol edin.",
    });
  }
};

/** DB beklemeden anında yanıt — Netlify vekili / banner için (havuz doluyken healthz yavaşlar). */
const live = (_req: Request, res: Response) => {
  res.json({ status: "ok", live: true });
};

const ok = async (_req: Request, res: Response) => {
  const dbOk = await pingDatabase();
  if (!dbOk) {
    res.status(503).json({ status: "degraded", db: "unreachable" });
    return;
  }
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json({
    ...data,
    media: {
      mode: getMediaStorageMode(),
      preference: getMediaStoragePreference(),
      runtimeS3Disabled: isRuntimeS3Disabled(),
      s3Configured: isS3MediaConfigured(),
      s3Partial: hasPartialS3Config(),
      s3Env: s3EnvHealthDetails(),
      s3PublicBaseUrl: s3PublicBaseUrl() ? "set" : "missing",
      volumeMount: hasPersistentVolumeMount() ? "set" : "missing",
    },
    deploy: {
      railwayGitSha: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
    },
    integrations: {
      etkinlikIo: etkinlikIoEnvHealthDetails(),
      aiCall: {
        native: isNativeAiCallEnabled(),
        envSet: Boolean(process.env.USE_NATIVE_AI_CALL?.trim()),
      },
    },
  });
};

/** Railway / Render / ters vekil bazen `/api/health` kullanır; yalnızca `healthz` olunca 404 ile yeniden başlatma döngüsü oluşabilir. */
router.get("/healthz/live", live);
router.get("/healthz/media", mediaProbe);
router.get("/healthz", ok);
router.get("/health", ok);

export default router;
