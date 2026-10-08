/**
 * Worker Neon layout_json → PHP Neon (NEWS_DATABASE_URL) aynası.
 * Canlı PHP tema twilight-pine'dan okur; kenar yalnızca DATABASE_URL'e yazarsa vitrin güncellenmez.
 */
import { neonNewsSqlClient, shouldEdgeDualWriteNewsDb } from "./neon-edge-db.js";
import { resolvePhpSiteId } from "./hm-php-editor-sync.js";

/**
 * @param {import("@neondatabase/serverless").NeonQueryFunction} workerSql
 * @param {string} layoutJsonRaw stringified layout JSON
 * @returns {Promise<{ mirrored: boolean; phpSiteId?: number; reason?: string }>}
 */
export async function mirrorHmSiteLayoutJsonToPhpNeon(env, workerSql, workerSiteId, layoutJsonRaw) {
  if (!shouldEdgeDualWriteNewsDb(env)) {
    return { mirrored: false, reason: "NEWS_DB_WRITE=main veya NEWS_DATABASE_URL yok" };
  }
  const newsSql = neonNewsSqlClient(env);
  if (!newsSql || !workerSql) {
    return { mirrored: false, reason: "PHP Neon bağlantısı yok" };
  }
  const siteId = Number(workerSiteId);
  if (!Number.isFinite(siteId) || siteId <= 0) {
    return { mirrored: false, reason: "siteId geçersiz" };
  }
  const raw = String(layoutJsonRaw ?? "").trim();
  if (!raw) {
    return { mirrored: false, reason: "layout boş" };
  }

  const phpSiteId = await resolvePhpSiteId(newsSql, workerSql, siteId);
  if (!phpSiteId) {
    return { mirrored: false, reason: "PHP site id çözülemedi" };
  }

  try {
    await newsSql`
      UPDATE hm_news_sites
      SET layout_json = ${raw}::jsonb, updated_at = now()
      WHERE id = ${phpSiteId}
    `;
  } catch (err) {
    try {
      await newsSql`
        UPDATE hm_news_sites
        SET layout_json = ${raw}, updated_at = now()
        WHERE id = ${phpSiteId}
      `;
    } catch (err2) {
      console.error(
        "[php-layout-sync]",
        String(err2?.message || err?.message || err2).slice(0, 160),
      );
      return { mirrored: false, phpSiteId, reason: "PHP layout_json yazılamadı" };
    }
  }

  return { mirrored: true, phpSiteId };
}
