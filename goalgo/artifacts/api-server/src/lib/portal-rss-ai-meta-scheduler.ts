import type { Logger } from "pino";
import { PG_ADVISORY_LOCKS, withPgAdvisoryLock } from "./pg-advisory-lock.js";
import { getPortalRssAiMetaConfig, processPortalRssMetaRewriteQueue } from "./portal-rss-ai-meta.js";
import { shouldRunRssAutomationTick } from "./rss-automation-control.js";

/**
 * Portal RSS başlık+spot AI kuyruğu — RSS zamanlayıcısından ayrı.
 * Otomatik tick yok; yalnızca admin panelinden «Şimdi 1 haber işle» (process-one) ile manuel çalışır.
 * Kuyruk kaydı: RSS import + admin «Aktif» açıkken enqueuePortalRssMetaRewriteJob.
 */
export function startPortalRssAiMetaScheduler(
  log: Logger,
  intervalMs = Number(process.env.PORTAL_RSS_AI_META_TICK_MS) || 3 * 60_000,
): () => void {
  let stopped = false;
  let running = false;

  const jobsPerTick = Math.min(
    5,
    Math.max(1, Number(process.env.PORTAL_RSS_AI_META_JOBS_PER_TICK ?? 1) || 1),
  );

  const tick = async (reason: "startup" | "interval") => {
    if (stopped || running) return;
    if (!(await shouldRunRssAutomationTick())) return;
    running = true;
    try {
      const config = await getPortalRssAiMetaConfig();
      if (!config.enabled) return;

      await withPgAdvisoryLock(PG_ADVISORY_LOCKS.PORTAL_RSS_AI_META, async () => {
        const { processed, quotaReached } = await processPortalRssMetaRewriteQueue(jobsPerTick);
        if (processed > 0 || (reason === "startup" && quotaReached)) {
          log.info(
            { reason, processed, quotaReached, jobsPerTick },
            "[portal-rss-ai-meta] kuyruk işlendi",
          );
        }
      });
    } catch (e) {
      log.error({ err: e }, "[portal-rss-ai-meta] zamanlayıcı tick hatası");
    } finally {
      running = false;
    }
  };

  const startupDelay = setTimeout(() => {
    void tick("startup");
  }, 25_000);
  startupDelay.unref?.();

  const id = setInterval(() => {
    void tick("interval");
  }, intervalMs);
  id.unref?.();

  return () => {
    stopped = true;
    clearTimeout(startupDelay);
    clearInterval(id);
  };
}
