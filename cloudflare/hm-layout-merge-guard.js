/**
 * Editör ayar kaydı → yalnızca gerçekten değişen alanlar (2026-10-08).
 *
 * - Önceki değerle aynı gelen anahtarlar düşer (tam snapshot gönderen eski istemciler zarar veremez).
 * - Modül anahtarları (hm*Enabled) null/undefined ile asla boşaltılmaz: PHP Modules::isOn
 *   "anahtar var + null" = KAPALI sayar; yok = AÇIK.
 * - hmVitrinTheme editör kaydında hiç yazılmaz.
 * - Önceden olmayan bir anahtar null ile "temizlenmez" (gereksiz null anahtar üretmez).
 * - PHP aynası (TP) tam üzerine yazma yerine yalnızca değişen anahtarları jsonb ile birleştirir;
 *   tema tarafına özel anahtarlar (hmNewsRssSources, hmNavOnlyCategorySlugs …) korunur.
 */

export const HM_EDITOR_NEVER_WRITE_KEYS = Object.freeze(["hmVitrinTheme"]);

const MODULE_SWITCH_RE = /^hm[A-Za-z0-9]*Enabled$/;

export function isModuleSwitchKey(key) {
  return MODULE_SWITCH_RE.test(String(key || ""));
}

function stableStringify(value) {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

export function layoutValuesEqual(a, b) {
  return stableStringify(a) === stableStringify(b);
}

/**
 * @param {Record<string, unknown>} prev mevcut layout
 * @param {Record<string, unknown>} incoming istemciden gelen patch
 * @returns {{ inc: Record<string, unknown>, dropped: string[] }}
 */
export function sanitizeEditorLayoutIncoming(prev, incoming) {
  const p = prev && typeof prev === "object" && !Array.isArray(prev) ? prev : {};
  const src = incoming && typeof incoming === "object" && !Array.isArray(incoming) ? incoming : {};
  const inc = {};
  const dropped = [];
  for (const [k, v] of Object.entries(src)) {
    if (HM_EDITOR_NEVER_WRITE_KEYS.includes(k)) {
      dropped.push(k);
      continue;
    }
    if (k.startsWith("_")) {
      dropped.push(k);
      continue;
    }
    if (v === undefined) {
      dropped.push(k);
      continue;
    }
    if (v === null && isModuleSwitchKey(k)) {
      dropped.push(k);
      continue;
    }
    const had = Object.prototype.hasOwnProperty.call(p, k);
    // Yok = AÇIK (PHP varsayılanı); yokken true yazmak davranışı değiştirmez → yazma.
    if (!had && v === true && isModuleSwitchKey(k)) {
      dropped.push(k);
      continue;
    }
    if (!had && v === null) {
      dropped.push(k);
      continue;
    }
    if (had && layoutValuesEqual(p[k], v)) {
      dropped.push(k);
      continue;
    }
    inc[k] = v;
  }
  return { inc, dropped };
}

/** Birleştirme sonrası önceki layout'a göre değişen (eklenen/değişen/silinen) anahtarlar. */
export function changedLayoutKeys(prev, next) {
  const p = prev && typeof prev === "object" ? prev : {};
  const n = next && typeof next === "object" ? next : {};
  const out = [];
  for (const k of new Set([...Object.keys(p), ...Object.keys(n)])) {
    const inP = Object.prototype.hasOwnProperty.call(p, k);
    const inN = Object.prototype.hasOwnProperty.call(n, k);
    if (inP !== inN || !layoutValuesEqual(p[k], n[k])) out.push(k);
  }
  return out;
}

/**
 * PHP aynası için kısmi layout: değişen anahtarların yeni değerleri (+ kullanıcı kaydı damgası)
 * ve silinen anahtarların listesi.
 */
export function buildPartialLayoutForMirror(fullLayout, changedKeys) {
  const set = {};
  const remove = [];
  const full = fullLayout && typeof fullLayout === "object" ? fullLayout : {};
  for (const k of changedKeys || []) {
    if (Object.prototype.hasOwnProperty.call(full, k)) set[k] = full[k];
    else remove.push(k);
  }
  if (Object.prototype.hasOwnProperty.call(full, "_hmUserSavedAt")) set._hmUserSavedAt = full._hmUserSavedAt;
  return { set, remove };
}
