/**
 * API yanıtlarındaki `/api/media/…` adreslerini göreli yola çevirir.
 * Eski Railway / Render kökleriyle kayıtlı mutlak URL'ler özel alan vekilinde kırılmayı önler.
 * Harici RSS / CDN görsellerine dokunulmaz.
 */
export function normalizePublicMediaUrl(url: string | null | undefined): string | null {
  const raw = String(url ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("/api/media/")) return raw;

  const extracted = extractApiMediaPathFromString(raw);
  if (extracted) return extracted;

  return raw;
}

function extractApiMediaPathFromString(raw: string): string | null {
  try {
    if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) {
      const u = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
      if (u.pathname.startsWith("/api/media/")) {
        return `${u.pathname}${u.search}${u.hash}`;
      }
      if (/\.r2\.dev$/i.test(u.hostname)) {
        const name = u.pathname.replace(/^\//, "").split("/")[0] ?? "";
        if (/^[a-zA-Z0-9._-]+$/.test(name)) {
          return `/api/media/uploads/${name}${u.search}${u.hash}`;
        }
      }
      return null;
    }
  } catch {
    /* ignore */
  }
  const idx = raw.indexOf("/api/media/");
  if (idx >= 0) {
    const slice = raw.slice(idx).split(/\s/)[0] ?? "";
    return slice || null;
  }
  return null;
}

/** HM layout JSON içindeki logo / favicon alanlarını normalize eder. */
export function normalizeHmLayoutMediaUrls(layout: unknown): unknown {
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) return layout;
  const out: Record<string, unknown> = { ...(layout as Record<string, unknown>) };
  for (const key of ["logoUrl", "logo", "faviconUrl", "favicon"]) {
    if (typeof out[key] === "string") {
      const n = normalizePublicMediaUrl(out[key]);
      if (n) out[key] = n;
    }
  }
  return out;
}
