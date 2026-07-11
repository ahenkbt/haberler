import type { Logger } from "pino";
import { db, aiSettingsTable } from "@workspace/db";
import { lte, and, eq, isNotNull } from "drizzle-orm";
import { executeAiRssRun } from "./aiRssRun";
import { getSiteIntegrationKeys, hasChatApiKeyForProvider, mergeChatKeysFromAiAndSite } from "./aiChatProviders.js";
import { PG_ADVISORY_LOCKS, withPgAdvisoryLock } from "./pg-advisory-lock.js";
import { shouldRunRssAutomationTick } from "./rss-automation-control.js";

/**
 * `ai_settings.autoRunEnabled` ve `nextRunAt <= now` iken arka planda RSS+AI çalıştırır.
 * Manuel `POST /ai/run-rss` ile aynı iş mantığı (`executeAiRssRun`).
 */
export function startAiRssScheduler(log: Logger, intervalMs = 60_000): () => void {
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    if (!(await shouldRunRssAutomationTick())) return;
    await withPgAdvisoryLock(PG_ADVISORY_LOCKS.AI_RSS, async () => {
    try {
      const rows = await db
        .select()
        .from(aiSettingsTable)
        .where(
          and(
            eq(aiSettingsTable.autoRunEnabled, true),
            isNotNull(aiSettingsTable.nextRunAt),
            lte(aiSettingsTable.nextRunAt, new Date()),
          ),
        )
        .limit(1);
      const s = rows[0];
      if (!s?.nextRunAt) return;
      const siteKeys = await getSiteIntegrationKeys();
      const chatKeys = mergeChatKeysFromAiAndSite(s, siteKeys);
      if (!hasChatApiKeyForProvider(chatKeys, chatKeys.preferredProvider)) {
        log.warn(
          { preferredProvider: chatKeys.preferredProvider },
          "AI RSS zamanlayıcı: seçili sağlayıcı için API anahtarı yok, atlanıyor.",
        );
        return;
      }
      log.info({ nextRunAt: s.nextRunAt.toISOString() }, "AI RSS zamanlanmış çalışma başlıyor");
      const r = await executeAiRssRun({ count: 10, siteIds: [] });
      if (r.ok) {
        log.info({ generated: r.generated }, "AI RSS zamanlanmış çalışma bitti");
      } else {
        log.warn({ error: r.error }, "AI RSS zamanlanmış çalışma başarısız");
      }
    } catch (e) {
      log.error({ err: e }, "AI RSS zamanlayıcı tick hatası");
    }
    });
  };

  const id = setInterval(() => {
    void tick();
  }, intervalMs);
  void tick();

  return () => {
    stopped = true;
    clearInterval(id);
  };
}
