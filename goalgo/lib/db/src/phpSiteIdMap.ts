/**
 * Panel/Worker hm_news_sites.id → PHP twilight-pine id.
 * Keep in sync with cloudflare/hm-php-news-dual-write.js WORKER_TO_PHP_SITE_ID.
 */
export const WORKER_TO_PHP_SITE_ID: Readonly<Record<number, number>> = Object.freeze({
  1: 1,
  2: 2,
  3: 3,
  8: 8,
  1087: 231,
  1088: 232,
  1089: 233,
  1090: 236,
  1091: 237,
  1132: 230,
});

export function phpSiteIdFromWorker(workerSiteId: number | null | undefined): number | null {
  const id = Number(workerSiteId);
  if (!Number.isFinite(id) || id <= 0) return null;
  return WORKER_TO_PHP_SITE_ID[id] ?? Math.trunc(id);
}
