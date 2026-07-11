/** Render.com — dar bellek / tek instance; ağır arka plan işleri varsayılan kapalı. */
export function isRenderHosting(): boolean {
  return Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID);
}

/**
 * Ortam bayrağı: `0` kapalı, `1` açık, yoksa `defaultWhenUnset`.
 * Render'da RSS / kazıyıcı gibi işler açıkça `=1` verilmedikçe çalışmaz.
 */
export function envJobFlag(name: string, defaultWhenUnset: boolean): boolean {
  const v = process.env[name]?.trim();
  if (v === "0") return false;
  if (v === "1") return true;
  return defaultWhenUnset;
}
