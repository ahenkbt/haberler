/**
 * Worker Neon layout_json → PHP Neon (NEWS_DATABASE_URL) aynası.
 * Canlı PHP tema twilight-pine'dan okur; kenar yalnızca DATABASE_URL'e yazarsa vitrin güncellenmez.
 */
import { neonNewsSqlClient, shouldEdgeDualWriteNewsDb } from "./neon-edge-db.js";
import { resolvePhpSiteId } from "./hm-php-editor-sync.js";
import { buildPartialLayoutForMirror } from "./hm-layout-merge-guard.js";

const HM_LIVE_MANSET_PRESETS = new Set(["odatv", "sabah", "takvim", "mynet", "nefes"]);

function normalizeMansetPreset(value) {
  if (value == null) return null;
  const preset = String(value).trim().toLowerCase();
  return HM_LIVE_MANSET_PRESETS.has(preset) ? preset : null;
}

/** PHP App.php önce hmYsMansetPreset, sonra hmNewsYsMansetLayout okur — ikisini eşitle. */
export function normalizeLayoutJsonMansetKeysForPhp(layoutJsonRaw) {
  const raw = String(layoutJsonRaw ?? "").trim();
  if (!raw) return raw;
  try {
    const layout = JSON.parse(raw);
    if (!layout || typeof layout !== "object" || Array.isArray(layout)) return raw;
    const fromEditor = normalizeMansetPreset(layout.hmYsMansetPreset);
    const fromLive = normalizeMansetPreset(layout.hmNewsYsMansetLayout);
    const chosen = fromEditor ?? fromLive;
    if (chosen) {
      layout.hmYsMansetPreset = chosen;
      layout.hmNewsYsMansetLayout = chosen;
    }
    return JSON.stringify(layout);
  } catch {
    return raw;
  }
}

/**
 * @param {import("@neondatabase/serverless").NeonQueryFunction} workerSql
 * @param {string} layoutJsonRaw stringified layout JSON
 * @returns {Promise<{ mirrored: boolean; phpSiteId?: number; reason?: string }>}
 *
 * 2026-10-08: TP'ye tam üzerine yazma yok. `opts.changedKeys` verilirse yalnızca o anahtarlar
 * jsonb ile birleştirilir (silinenler `-` ile kaldırılır); verilmezse tam layout mevcut TP
 * layout'u ile birleştirilir — tema tarafına özel anahtarlar (TP-only) her iki durumda korunur.
 */
export async function mirrorHmSiteLayoutJsonToPhpNeon(env, workerSql, workerSiteId, layoutJsonRaw, opts = {}) {
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
  const raw = normalizeLayoutJsonMansetKeysForPhp(layoutJsonRaw);
  if (!raw) {
    return { mirrored: false, reason: "layout boş" };
  }

  let setObj;
  let removeKeys = [];
  const changedKeys = Array.isArray(opts?.changedKeys) ? opts.changedKeys.map(String) : null;
  try {
    const full = JSON.parse(raw);
    if (!full || typeof full !== "object" || Array.isArray(full)) throw new Error("layout nesne değil");
    if (changedKeys) {
      const keys = new Set(changedKeys);
      if (keys.has("hmYsMansetPreset") || keys.has("hmNewsYsMansetLayout")) {
        keys.add("hmYsMansetPreset");
        keys.add("hmNewsYsMansetLayout");
      }
      const part = buildPartialLayoutForMirror(full, [...keys]);
      setObj = part.set;
      removeKeys = part.remove;
      const meaningful = Object.keys(setObj).filter((k) => k !== "_hmUserSavedAt").length + removeKeys.length;
      if (meaningful === 0) return { mirrored: true, skipped: "değişiklik yok", changedKeys: [] };
    } else {
      setObj = full;
    }
  } catch {
    return { mirrored: false, reason: "layout JSON çözülemedi" };
  }
  const setJson = JSON.stringify(setObj);

  const phpSiteId = await resolvePhpSiteId(newsSql, workerSql, siteId);
  if (!phpSiteId) {
    return { mirrored: false, reason: "PHP site id çözülemedi" };
  }

  try {
    await newsSql`
      UPDATE hm_news_sites
      SET layout_json = (
            COALESCE(NULLIF(btrim(layout_json::text), ''), '{}')::jsonb - ${removeKeys}::text[]
          ) || ${setJson}::jsonb,
          updated_at = now()
      WHERE id = ${phpSiteId}
    `;
  } catch (err) {
    try {
      await newsSql`
        UPDATE hm_news_sites
        SET layout_json = ((
              COALESCE(NULLIF(btrim(layout_json::text), ''), '{}')::jsonb - ${removeKeys}::text[]
            ) || ${setJson}::jsonb)::text,
            updated_at = now()
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

  if (changedKeys) {
    return { mirrored: true, phpSiteId, merged: "changed-keys", changedKeys: Object.keys(setObj).concat(removeKeys) };
  }

  return { mirrored: true, phpSiteId, merged: "full-merge" };
}
