/** Netlify / Cloudflare build — backend kök URL (Render öncelikli). */
export function resolveApiOrigin() {
  return String(
    process.env.API_ORIGIN ??
      process.env.RENDER_API_ORIGIN ??
      process.env.RAILWAY_API_ORIGIN ??
      "https://goalgo-y7ze.onrender.com",
  ).replace(/\/+$/, "");
}
