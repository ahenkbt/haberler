/**
 * Yekpare gömülü deploy: VITE_API_BASE=/call-center-api
 * Bağımsız deploy: varsayılan /api
 */
export function resolveApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const raw = String(import.meta.env.VITE_API_BASE ?? "").trim().replace(/\/+$/, "");
  if (!raw) return p;
  return `${raw}${p}`;
}

export const APP_DISPLAY_NAME =
  String(import.meta.env.VITE_APP_NAME ?? "").trim() || "Yekpare AI Call";
