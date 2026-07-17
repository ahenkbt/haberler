import type { Logger } from "pino";
import {
  isHybridRssEnabledInLayout,
  loadPortalHybridRssFeeds,
  type PortalHybridRssFeedConfig,
} from "./portal-hybrid-config.js";
import {
  getPortalRssCacheStatus,
  isBoxScopeFeedId,
  refreshPortalRssFeedSafe,
} from "./portal-rss-cache.js";
import { backfillPortalRssNewsFromCache } from "./portal-rss-auto-import.js";
import { importPortalRssNewsByCategoryBatch } from "./portal-rss-category-import.js";
import { PG_ADVISORY_LOCKS, withPgAdvisoryLock } from "./pg-advisory-lock.js";
import {
  msUntilNextRssScheduledSlot,
  shouldRunRssAutomationTick,
} from "./rss-automation-control.js";
import { listActiveHmNewsSitesByUpdatedCompat } from "./hm-site-compat.js";
import { parseHmLayoutRecord } from "./hm-layout-json.js";

/**
 * Yekpare merkez (portal) + Site içi RSS açık editör sitelerinin hibrit RSS
 * beslemelerini ARKA PLANDA periyodik yeniler ve kalıcı DB havuzuna
 * (portal_rss_items) UPSERT eder. Böylece:
 *  - yekpare.net/haberler ve editör siteleri sayfa açılışında CANLI RSS BEKLEMEZ,
 *  - kategori kutuları / manşet / SON HABERLER DB'den hızlı okur.
 *
 * Site içi RSS (`hybridRssEnabled`): zamanlayıcı o sitenin `hm-*-site-*` feed’lerini
 * de tarar. "Kutu içi RSS" (box scope) DB'ye yazılmaz — o widget canlı kalır.
 *
 * Otomatik çalışma: admin «RSS otomasyonu» (günde 3× — 01:00, 09:00, 18:00 TR) veya RSS_AUTOMATION=1.
 * Manuel: POST /api/admin/portal-rss/refresh.
 */
const PER_FEED_CONCURRENCY = Math.min(
  10,
  Math.max(1, Number(process.env.PORTAL_RSS_REFRESH_CONCURRENCY ?? 8) || 8),
);

function dedupeFeeds(feeds: PortalHybridRssFeedConfig[]): PortalHybridRssFeedConfig[] {
  const byId = new Map<string, PortalHybridRssFeedConfig>();
  for (const feed of feeds) {
    if (!feed.enabled || !feed.url) continue;
    if (isBoxScopeFeedId(feed.id)) continue; // box = canlı, dokunma
    if (!byId.has(feed.id)) byId.set(feed.id, feed);
  }
  return [...byId.values()];
}

async function mapWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  if (items.length === 0) return;
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const idx = next;
      next += 1;
      if (idx >= items.length) return;
      await fn(items[idx]!);
    }
  });
  await Promise.all(workers);
}

/** Asılı kalan tick döngüyü kalıcı öldürmesin — sert üst sınır. */
const TICK_HARD_TIMEOUT_MS = 10 * 60_000;

function withHardTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} sert zaman aşımı (${ms}ms)`)), ms);
    timer.unref?.();
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

export function startPortalRssScheduler(log: Logger, intervalMs = 60 * 60_000): () => void {
  let stopped = false;
  let running = false;
  let slotTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Fencepost düzeltmesi: tick aralığı ile tazeleme yaşı eşiği eşit olduğunda,
   * lastFetchedAt fetch BİTİŞİNDE yazıldığı için her tick anında besleme eşiğin
   * hemen altında kalıp atlanabiliyordu. Tick anında vadesine 90 sn'den az kalmış
   * beslemeleri de vadesi gelmiş say.
   */
  const DUE_SLACK_MS = 90_000;
  const dueAgeMs = Math.max(60_000, intervalMs - DUE_SLACK_MS);

  const tick = async (reason: "startup" | "interval" | "slot") => {
    if (stopped || running) return;
    if (!(await shouldRunRssAutomationTick())) {
      if (reason !== "startup") {
        log.debug("[portal-rss] otomasyon kapalı veya planlı slot dışında — tick atlandı");
      }
      return;
    }
    running = true;
    try {
      await withHardTimeout(
        withPgAdvisoryLock(PG_ADVISORY_LOCKS.PORTAL_RSS, async () => {
          const portalFeeds = await loadPortalHybridRssFeeds();
          const siteFeeds: PortalHybridRssFeedConfig[] = [];
          try {
            const sites = await listActiveHmNewsSitesByUpdatedCompat();
            for (const site of sites) {
              const layout = parseHmLayoutRecord(site.layoutJson != null ? String(site.layoutJson) : null);
              if (!isHybridRssEnabledInLayout(layout)) continue;
              const feedsForSite = await loadPortalHybridRssFeeds(site.id, "site");
              for (const feed of feedsForSite) {
                if (!isBoxScopeFeedId(feed.id)) siteFeeds.push(feed);
              }
            }
          } catch (e) {
            log.debug({ err: e }, "[portal-rss] editör site feed listesi atlandı");
          }
          const feeds = dedupeFeeds([...portalFeeds, ...siteFeeds]);
          if (!feeds.length) return;

          // Yalnızca eksik/eski/vadesi gelmiş beslemeleri yenile — DB doluysa gereksiz istek yok.
          const now = Date.now();
          const status = await getPortalRssCacheStatus(feeds);
          const statusById = new Map(status.map((row) => [row.feedId, row]));
          const due = feeds.filter((feed) => {
            const row = statusById.get(feed.id);
            if (!row?.cached || row.expired || row.refreshDue || row.reason === "cache_miss") return true;
            const lastFetchedAtMs = row.lastFetchedAt ? new Date(row.lastFetchedAt).getTime() : NaN;
            return !Number.isFinite(lastFetchedAtMs) || now - lastFetchedAtMs >= dueAgeMs;
          });
          if (!due.length && reason !== "startup") {
            log.debug({ reason, feeds: feeds.length }, "[portal-rss] tüm beslemeler taze — tick atlandı");
            return;
          }

          const target = due.length ? due : feeds;
          let stored = 0;
          let failed = 0;
          await mapWithConcurrency(target, PER_FEED_CONCURRENCY, async (feed) => {
            const res = await refreshPortalRssFeedSafe(feed);
            if (res.error) failed += 1;
            else stored += res.stored;
          });

          try {
            const batch = await importPortalRssNewsByCategoryBatch();
            if (batch.inserted > 0) {
              log.info(batch, "[portal-rss] kategori batch news import tamamlandı");
            }
          } catch (e) {
            log.debug({ err: e }, "[portal-rss] kategori batch news import atlandı");
          }

          if (reason === "startup") {
            try {
              const backfill = await backfillPortalRssNewsFromCache(50);
              if (backfill.inserted > 0) {
                log.info(backfill, "[portal-rss] mevcut RSS önbelleği news tablosuna aktarıldı");
              }
            } catch (e) {
              log.debug({ err: e }, "[portal-rss] news geri doldurma atlandı");
            }
          }

          log.info(
            {
              reason,
              portalFeeds: portalFeeds.length,
              siteFeeds: siteFeeds.length,
              refreshed: target.length,
              stored,
              failed,
            },
            "Portal + site hibrit RSS DB havuzu yenilendi",
          );
        }),
        TICK_HARD_TIMEOUT_MS,
        "Portal RSS tick",
      );
    } catch (e) {
      log.error({ err: e }, "Portal RSS zamanlayıcı tick hatası");
    } finally {
      running = false;
    }
  };

  const scheduleNextSlot = () => {
    if (stopped) return;
    const delay = msUntilNextRssScheduledSlot(new Date(), intervalMs);
    slotTimer = setTimeout(() => {
      void tick("slot").finally(scheduleNextSlot);
    }, Math.max(1_000, delay));
    slotTimer.unref?.();
  };

  const startupDelay = setTimeout(() => {
    void tick("startup");
  }, 8_000);
  startupDelay.unref?.();

  scheduleNextSlot();

  return () => {
    stopped = true;
    clearTimeout(startupDelay);
    clearTimeout(slotTimer);
  };
}
