import path from "node:path";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const entryDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(entryDir, "../../../.env") });
dotenv.config({ path: path.resolve(entryDir, "../.env") });

import { logYektubeDbStartupHint, pool } from "@workspace/db";
import { logger } from "./lib/logger";
import { ensureSessionStoreTable } from "./lib/sessionStore.js";
import {
  seedVideoDataIfNeeded,
  seedShopDataIfNeeded,
  seedPopularLocationsIfNeeded,
  ensureExtraTables,
  ensureMapVendorColumnPatches,
  ensureDeliveryExtensions,
  ensureVendorServiceExtensions,
  seedMapDemoDataIfNeeded,
  syncMapCategoryDefaults,
  seedDemoVendorsIfNeeded,
  seedGeliverDemoVendorIfNeeded,
  seedImeceMarketplaceIfNeeded,
} from "./data/seed";
import { seedTourismBcDemoIfNeeded } from "./data/tourism-bc-seed.js";
import { seedKesfetDiscoverCategoriesIfNeeded } from "./lib/kesfet-discover-seed.js";
import { seedOtomotivServiceCategoriesIfNeeded } from "./data/otomotiv-service-categories-seed.js";
import { resyncAllVendorsToMap } from "./lib/vendor-map-sync";
import { resyncAllOtomotivToMap } from "./lib/otomotiv-map-sync";
import { resyncAllEtkinlikVenuesToMap } from "./lib/etkinlik-venue-map-sync";
import { ensurePortalRssItemViewsSchema } from "./lib/portal-rss-store.js";
import { bootstrapRssAutomationFromSettings } from "./lib/rss-automation-control.js";
import { startHmPoolAutoScheduler } from "./lib/hmPoolAutoScheduler";
import { bootstrapKesfetNightScraperFromSettings } from "./routes/map";
import { scheduleInsaatfirmalarimAutoImport, startInsaatfirmalarimQueueWatchdog } from "./lib/insaatfirmalarim-jobs.js";
import { repairAllCorruptedRssImportTitles } from "./lib/rssTitleRepair.js";
import { seedEcommerceProductCategoriesIfNeeded } from "./lib/ecommerce-product-categories.js";
import { seedGeliverMerchantCatalogIfNeeded } from "./lib/merchant-rss-import.js";
import { ensureRssCampaignSchema } from "./lib/ensure-rss-campaign-schema.js";
import { scheduleHmYekpareNewsStartupSync } from "./lib/hm-yekpare-news-sync.js";
import { scheduleYektubeStartupRefresh } from "./routes/video.js";
import { bootstrapSiteMailboxFromEnv, startSiteMailboxAutoSync } from "./lib/siteMailbox.js";
import { ensureGlobalMapNewsFeedsSeeded } from "./lib/global-map-news-feeds.js";
import { getMediaUploadRoot } from "./lib/mediaUploadRoot";
import {
  assertProductionMediaStorage,
  getMediaStorageMode,
  getMediaStoragePreference,
  getS3Endpoint,
  isS3MediaConfigured,
  logS3EndpointStartupHint,
  noteS3RuntimeFailure,
  s3EndpointHostPrefix4,
} from "./lib/mediaStorageConfig";
import { s3ObjectExists } from "./lib/mediaObjectStorage";
import { logEtkinlikIoStartupHint } from "./lib/etkinlik-io.js";
import { envJobFlag, isRenderHosting } from "./lib/hostingProfile.js";
import { migrateMediaToDisk } from "./lib/mediaBulkMigrate.js";

await logYektubeDbStartupHint();

const { default: app } = await import("./app");

logS3EndpointStartupHint();
logEtkinlikIoStartupHint();
assertProductionMediaStorage();

if (isS3MediaConfigured() && getMediaStoragePreference() === "s3") {
  void s3ObjectExists("startup-probe")
    .then(() => {
      logger.info("[goalgo] S3/R2 startup probe: ok");
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      noteS3RuntimeFailure(msg.slice(0, 120));
      logger.warn({ err }, "[goalgo] S3/R2 startup probe failed — volume moduna geçildi");
    });
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const listenHost = process.env["LISTEN_HOST"] ?? "0.0.0.0";

/** TR adres içe aktarma uzun sürebilir; healthcheck için dinleyiciden sonra çalıştırılır. */
function scheduleTrAddressAutoImport(): void {
  if (process.env["SKIP_TR_ADDRESS_IMPORT"] === "1") {
    logger.info("[tr-address-auto-import] SKIP_TR_ADDRESS_IMPORT=1 — atlandı");
    return;
  }
  if (isRenderHosting() && process.env["SKIP_TR_ADDRESS_IMPORT"] !== "0") {
    logger.info("[tr-address-auto-import] Render — varsayılan atlandı (açmak için SKIP_TR_ADDRESS_IMPORT=0)");
    return;
  }
  const script = path.resolve(entryDir, "../scripts/tr-address-auto-import.mjs");
  logger.info({ script }, "[tr-address-auto-import] arka planda başlatılıyor");
  const child = spawn(process.execPath, [script], {
    stdio: "inherit",
    env: { ...process.env },
    cwd: path.resolve(entryDir, ".."),
  });
  child.on("error", (err) => {
    logger.error({ err }, "[tr-address-auto-import] spawn hatası");
  });
  child.on("exit", (code, signal) => {
    if (code === 0) {
      logger.info("[tr-address-auto-import] arka plan tamam");
    } else {
      logger.error({ code, signal }, "[tr-address-auto-import] arka plan hata");
    }
  });
}

const server = app.listen(port, listenHost, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port, host: listenHost }, "Server listening");

  void ensureSessionStoreTable().catch((err) =>
    logger.error({ err }, "express_sessions tablosu hazırlanamadı — admin oturumu çalışmayabilir"),
  );

  void bootstrapSiteMailboxFromEnv()
    .then((r) => {
      if (r.updated) logger.info(r, "[site-mailbox] bootstrap tamamlandı");
    })
    .catch((err) => logger.warn({ err }, "[site-mailbox] bootstrap atlandı"));

  void ensureGlobalMapNewsFeedsSeeded()
    .then((r) => {
      if (r.inserted > 0 || r.regionalInserted > 0) {
        logger.info(r, "[global-map-news] RSS kaynakları yüklendi (küresel + bölgesel)");
      }
    })
    .catch((err) => logger.warn({ err }, "[global-map-news] otomatik seed atlandı"));

  if (process.env.SKIP_VKD_SYNC !== "1" && process.env.VKD_SYNC_ON_START === "1") {
    setTimeout(() => {
      void import("./lib/vkd-page-restore.js")
        .then(({ syncVkdPagesFromData }) => syncVkdPagesFromData())
        .then(() => logger.info("[vkd-sync] startup sync tamamlandı"))
        .catch((err) => logger.warn({ err }, "[vkd-sync] startup sync atlandı veya başarısız"));
    }, 8_000).unref();
  } else {
    logger.info("[vkd-sync] VKD_SYNC_ON_START≠1 — startup sync atlandı");
  }

  startSiteMailboxAutoSync(logger);

  const schedulerStops: Array<() => void> = [];

  let draining = false;
  const shutdown = (signal: string) => {
    if (draining) return;
    draining = true;
    logger.info({ signal }, "Kapatılıyor (bağlantılar süzülüyor)");
    for (const stop of schedulerStops) {
      try {
        stop();
      } catch (e) {
        logger.warn({ err: e }, "Zamanlayıcı durdurulamadı");
      }
    }
    server.close((closeErr) => {
      void pool.end().then(
        () => {
          if (closeErr) logger.error({ err: closeErr }, "server.close hatası");
          process.exit(closeErr ? 1 : 0);
        },
        (poolErr) => {
          logger.error({ err: poolErr }, "pool.end hatası");
          process.exit(1);
        },
      );
    });
    setTimeout(() => {
      logger.warn("Drain süresi aşıldı, zorla çıkılıyor");
      process.exit(1);
    }, 25_000).unref();
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  const mediaRoot = getMediaUploadRoot();
  void mkdir(mediaRoot, { recursive: true }).catch((err) => {
    logger.error({ err, mediaRoot }, "Medya dizini oluşturulamadı");
  });
  logger.info(
    {
      mediaRoot,
      mediaStorage: getMediaStorageMode(),
      mediaStoragePreference: getMediaStoragePreference(),
      S3_BUCKET: process.env.S3_BUCKET ? "(tanımlı)" : "(yok)",
      S3_ENDPOINT: getS3Endpoint() ? "(tanımlı)" : "(yok)",
      s3EndpointHostPrefix: s3EndpointHostPrefix4() ?? "(yok)",
      MEDIA_UPLOAD_ROOT: process.env.MEDIA_UPLOAD_ROOT ?? "(yok)",
      RAILWAY_VOLUME_MOUNT_PATH: process.env.RAILWAY_VOLUME_MOUNT_PATH ?? "(yok)",
      RENDER_DISK_MOUNT_PATH: process.env.RENDER_DISK_MOUNT_PATH ?? "(yok)",
    },
    "Medya yükleme dizini",
  );
  const mOpt = process.env.MEDIA_UPLOAD_ROOT?.trim().replace(/\/+$/, "");
  const rMount = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim().replace(/\/+$/, "");
  if (mOpt && rMount && mOpt !== rMount) {
    logger.warn(
      { MEDIA_UPLOAD_ROOT: mOpt, RAILWAY_VOLUME_MOUNT_PATH: rMount },
      "MEDIA_UPLOAD_ROOT ile Railway volume mount yolu farklı — dosyalar kalıcı diskte olmayabilir; ikisini aynı yapın veya MEDIA_UPLOAD_ROOT'u silin.",
    );
  }

  if (process.env.MEDIA_MIGRATE_ON_BOOT === "1") {
    void (async () => {
      logger.info("[media-migrate] MEDIA_MIGRATE_ON_BOOT=1 — arka planda toplu taşıma başlıyor");
      for (let batch = 1; batch <= 40; batch += 1) {
        try {
          const r = await migrateMediaToDisk({ limit: 150, includeExternal: true, scopes: ["all"] });
          logger.info({ batch, ...r }, "[media-migrate] batch tamam");
          if (r.updatedRows + r.importedFiles + r.failed === 0) break;
        } catch (err) {
          logger.error({ err, batch }, "[media-migrate] batch hatası");
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      logger.info("[media-migrate] boot taşıması bitti — MEDIA_MIGRATE_ON_BOOT değişkenini kaldırın");
    })();
  }

  void ensureMapVendorColumnPatches(logger).catch((e) =>
    logger.error({ err: e }, "ensureMapVendorColumnPatches başarısız — DB şeması uyumsuz olabilir"),
  );

  void ensureRssCampaignSchema().catch((e) =>
    logger.error({ err: e }, "ensureRssCampaignSchema başarısız — RSS kampanya listesi/kaydı çalışmayabilir"),
  );

  void ensurePortalRssItemViewsSchema().catch((e) =>
    logger.error({ err: e }, "ensurePortalRssItemViewsSchema başarısız — RSS okunma sayacı çalışmayabilir"),
  );

  if (envJobFlag("HM_YEKPARE_STARTUP_SYNC", !isRenderHosting())) {
    setTimeout(() => {
      void scheduleHmYekpareNewsStartupSync()
        .then((r) => {
          if (r) {
            logger.info(
              {
                sites: r.sitesProcessed,
                newsIn: r.newsInserted,
                newsUp: r.newsUpdated,
                makaleIn: r.makaleInserted,
                makaleUp: r.makaleUpdated,
                authors: r.authorsUpserted,
              },
              "HM→Yekpare haber backfill tamamlandı",
            );
          }
        })
        .catch((e) =>
          logger.warn({ err: e }, "HM→Yekpare startup backfill atlandı veya başarısız"),
        );
    }, 12_000);
  } else {
    logger.info("[hm-yekpare-sync] HM_YEKPARE_STARTUP_SYNC=0 veya Render — startup backfill atlandı");
  }

  if (envJobFlag("YEKTUBE_STARTUP_REFRESH", !isRenderHosting())) {
    setTimeout(() => {
      try {
        scheduleYektubeStartupRefresh("api-startup");
      } catch (e) {
        logger.warn({ err: e }, "Yektube startup refresh atlandı veya başarısız");
      }
    }, Number(process.env.YEKTUBE_STARTUP_REFRESH_DELAY_MS) || 25_000).unref();
  } else {
    logger.info("[yektube] YEKTUBE_STARTUP_REFRESH=0 veya Render — startup refresh atlandı");
  }

  scheduleTrAddressAutoImport();

  void bootstrapRssAutomationFromSettings(logger)
    .then((stop) => {
      if (stop) schedulerStops.push(stop);
    })
    .catch((err) => logger.warn({ err }, "[rss-automation] bootstrap atlandı"));

  schedulerStops.push(startHmPoolAutoScheduler(logger, 90_000));

  scheduleInsaatfirmalarimAutoImport(logger);
  if (envJobFlag("INSAATFIRMALARIM_WATCHDOG", !isRenderHosting())) {
    startInsaatfirmalarimQueueWatchdog(logger);
    logger.info(
      { intervalMs: Number(process.env.INSAATFIRMALARIM_WATCHDOG_MS) || 20_000 },
      "İnşaat kazıyıcı kuyruk watchdog aktif (bekleyen işler otomatik devam eder)",
    );
  } else {
    logger.info("[insaatfirmalarim-watchdog] INSAATFIRMALARIM_WATCHDOG=0 veya Render — devre dışı");
  }

  void bootstrapKesfetNightScraperFromSettings(logger)
    .then((stop) => {
      if (stop) schedulerStops.push(stop);
    })
    .catch((err) => logger.warn({ err }, "[kesfet-night-scraper] bootstrap atlandı"));

  if (!envJobFlag("SKIP_RSS_TITLE_REPAIR", isRenderHosting())) {
    setTimeout(() => {
      void repairAllCorruptedRssImportTitles({ maxBatches: 30, batchSize: 200 })
        .then(({ totalFixed, batches }) => {
          if (totalFixed > 0) {
            logger.info({ totalFixed, batches }, "[rss-title-repair] bozuk RSS başlıkları düzeltildi");
          }
        })
        .catch((err) => logger.error({ err }, "[rss-title-repair] başarısız"));
    }, 10_000).unref();
  } else {
    logger.info("[rss-title-repair] SKIP_RSS_TITLE_REPAIR=1 — atlandı");
  }

  seedVideoDataIfNeeded(logger).catch((e) =>
    logger.error({ err: e }, "Video seed failed")
  );
  seedShopDataIfNeeded(logger).catch((e) =>
    logger.error({ err: e }, "Shop seed failed")
  );
  seedPopularLocationsIfNeeded(logger).catch((e) =>
    logger.error({ err: e }, "Popular locations seed failed")
  );
  ensureExtraTables(logger)
    .then(() => ensureDeliveryExtensions(logger))
    .then(() => ensureVendorServiceExtensions(logger))
    .then(() => seedEcommerceProductCategoriesIfNeeded())
    .then(async () => {
      if (process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO_SEED === "1") {
        await seedDemoVendorsIfNeeded(logger);
        await seedGeliverDemoVendorIfNeeded(logger);
      }
      await seedImeceMarketplaceIfNeeded(logger);
    })
    .then(() => resyncAllVendorsToMap(logger))
    .then(() => resyncAllOtomotivToMap(logger))
    .catch((e) => logger.error({ err: e }, "ensureExtraTables / vendor seed / map resync failed"));
  setTimeout(() => {
    void resyncAllEtkinlikVenuesToMap(logger)
      .then((stats) => logger.info(stats, "etkinlik→map venue resync (deferred boot)"))
      .catch((e) => logger.error({ err: e }, "etkinlik venue map resync failed"));
  }, 15_000).unref();
  setTimeout(() => {
    seedGeliverMerchantCatalogIfNeeded(logger).catch((e) =>
      logger.error({ err: e }, "geliver merchant XML import failed"),
    );
  }, 20_000).unref();
  seedMapDemoDataIfNeeded(logger)
    .then(() => syncMapCategoryDefaults(logger))
    .catch((e) => logger.error({ err: e }, "Map demo seed / category sync failed"));
  seedKesfetDiscoverCategoriesIfNeeded(logger).catch((e) =>
    logger.error({ err: e }, "Kesfet discover categories seed failed"),
  );
  seedOtomotivServiceCategoriesIfNeeded(logger).catch((e) =>
    logger.error({ err: e }, "Otomotiv service categories seed failed"),
  );
  seedTourismBcDemoIfNeeded(logger).catch((e) =>
    logger.error({ err: e }, "Tourism BC demo seed failed"),
  );
});
