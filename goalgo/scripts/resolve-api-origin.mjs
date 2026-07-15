/**
 * Build-time API kök URL.
 * Cloudflare aynı-origin (`/api` → Container): boş bırakın.
 * Harici API kullanılıyorsa API_ORIGIN verin (legacy Render/Railway yok).
 */
export function resolveApiOrigin() {
  return String(process.env.API_ORIGIN ?? process.env.VITE_PUBLIC_API_ORIGIN ?? "")
    .trim()
    .replace(/\/+$/, "");
}
