import type { Logger } from "pino";
import { processHmAiJobQueue, resetStaleHmAiJobsProcessing } from "./hmPoolAiJobs";

/**
 * İçerik havuzu kuyruğunu periyodik işler (`POST /api/hm/pool/process` ile aynı mantık).
 * Açık değilse yalnızca admin panelindeki düğme ile işlenir.
 *
 * Railway / sunucuda: `HM_POOL_AUTO_PROCESS=1` — AI modundaki işler OpenAI/Gemini anahtarı tüketir.
 */
export function startHmPoolAutoScheduler(log: Logger, intervalMs = 90_000): () => void {
  if (process.env["HM_POOL_AUTO_PROCESS"] !== "1") {
    log.info(
      "[hm-pool-auto] Kapalı. Kuyruk otomatik işlensin istiyorsanız ortam değişkeni: HM_POOL_AUTO_PROCESS=1",
    );
    return () => {};
  }

  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    try {
      await resetStaleHmAiJobsProcessing();
      const out = await processHmAiJobQueue(8);
      if (out.attempted > 0) {
        log.info(
          { attempted: out.attempted, completed: out.completed, failed: out.failed },
          "[hm-pool-auto] kuyruk tick",
        );
      }
    } catch (e) {
      log.error({ err: e }, "[hm-pool-auto] tick hatası");
    }
  };

  const id = setInterval(() => {
    void tick();
  }, intervalMs);
  void tick();

  log.info({ intervalMs }, "[hm-pool-auto] zamanlayıcı açık (HM_POOL_AUTO_PROCESS=1)");
  return () => {
    stopped = true;
    clearInterval(id);
  };
}
