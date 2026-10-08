/**
 * Editör ayar kaydı → yalnızca gerçekten değişen alanlar (2026-10-08).
 * Kenar karşılığı: cloudflare/hm-layout-merge-guard.js (aynı kurallar).
 *
 * - Önceki değerle aynı gelen anahtarlar düşer.
 * - Modül anahtarları (hm*Enabled) null ile asla boşaltılmaz (PHP Modules::isOn: var + null = KAPALI).
 * - hmVitrinTheme editör kaydında yazılmaz.
 * - Önceden olmayan bir anahtar null ile "temizlenmez".
 */
type Layout = Record<string, unknown>;

export const HM_EDITOR_NEVER_WRITE_KEYS: readonly string[] = Object.freeze(["hmVitrinTheme"]);

const MODULE_SWITCH_RE = /^hm[A-Za-z0-9]*Enabled$/;

export function isModuleSwitchKey(key: string): boolean {
  return MODULE_SWITCH_RE.test(String(key || ""));
}

function stableStringify(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Layout;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

export function layoutValuesEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

export function sanitizeEditorLayoutIncoming(
  prev: Layout | null | undefined,
  incoming: Layout | null | undefined,
): { inc: Layout; dropped: string[] } {
  const p: Layout = prev && typeof prev === "object" && !Array.isArray(prev) ? prev : {};
  const src: Layout = incoming && typeof incoming === "object" && !Array.isArray(incoming) ? incoming : {};
  const inc: Layout = {};
  const dropped: string[] = [];
  for (const [k, v] of Object.entries(src)) {
    const had = Object.prototype.hasOwnProperty.call(p, k);
    if (
      HM_EDITOR_NEVER_WRITE_KEYS.includes(k) ||
      k.startsWith("_") ||
      v === undefined ||
      (v === null && isModuleSwitchKey(k)) ||
      (!had && v === true && isModuleSwitchKey(k)) || // yok = AÇIK; true yazmak davranışı değiştirmez
      (!had && v === null) ||
      (had && layoutValuesEqual(p[k], v))
    ) {
      dropped.push(k);
      continue;
    }
    inc[k] = v;
  }
  return { inc, dropped };
}

export function changedLayoutKeys(prev: Layout | null | undefined, next: Layout | null | undefined): string[] {
  const p: Layout = prev ?? {};
  const n: Layout = next ?? {};
  const out: string[] = [];
  for (const k of new Set([...Object.keys(p), ...Object.keys(n)])) {
    const inP = Object.prototype.hasOwnProperty.call(p, k);
    const inN = Object.prototype.hasOwnProperty.call(n, k);
    if (inP !== inN || !layoutValuesEqual(p[k], n[k])) out.push(k);
  }
  return out;
}

export function buildPartialLayoutForMirror(
  fullLayout: Layout | null | undefined,
  changedKeys: readonly string[],
): { set: Layout; remove: string[] } {
  const full: Layout = fullLayout ?? {};
  const set: Layout = {};
  const remove: string[] = [];
  for (const k of changedKeys) {
    if (Object.prototype.hasOwnProperty.call(full, k)) set[k] = full[k];
    else remove.push(k);
  }
  if (Object.prototype.hasOwnProperty.call(full, "_hmUserSavedAt")) set._hmUserSavedAt = full._hmUserSavedAt;
  return { set, remove };
}
