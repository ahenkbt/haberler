const EDITOR_PANEL_ROOT = "/editor";

/** Ziyaretçiye gösterilecek editör giriş URL'si (asla `/editor/` değil). */
export function resolveHmEditorLoginPublicHref(siteOrigin?: string | null): string {
  const origin = String(siteOrigin ?? "").trim().replace(/\/+$/, "");
  return origin ? `${origin}/editor/giris` : "/editor/giris";
}

/**
 * Menü/footer'da kayıtlı `…/editor` veya `…/editor/` → `…/editor/giris`
 * (HmEditorRoute `?next=/editor` üretmesin).
 */
export function normalizeHmEditorLoginMenuHref(href: string): string {
  const raw = String(href ?? "").trim();
  if (!raw) return raw;

  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      const p = u.pathname.replace(/\/+$/, "") || "/";
      if (p === EDITOR_PANEL_ROOT) {
        u.pathname = "/editor/giris";
        u.search = "";
        return u.toString();
      }
      return raw;
    }
  } catch {
    /* göreli yol */
  }

  const pathOnly = raw.split("?")[0]?.split("#")[0] ?? raw;
  const path = pathOnly.replace(/\/+$/, "") || "/";
  if (path === EDITOR_PANEL_ROOT) {
    const hash = raw.includes("#") ? raw.slice(raw.indexOf("#")) : "";
    return `/editor/giris${hash}`;
  }
  return raw;
}

/** Giriş sayfası adres çubuğundan gereksiz `?next=/editor` kaldırır. */
export function stripRedundantEditorLoginNextFromBrowserUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.pathname.startsWith("/editor/giris")) return;
  const next = (url.searchParams.get("next") ?? "").trim();
  const nextPath = next.split("?")[0]?.replace(/\/+$/, "") || "/";
  if (nextPath !== EDITOR_PANEL_ROOT) return;
  url.searchParams.delete("next");
  const clean = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (clean !== current) {
    window.history.replaceState(window.history.state, "", clean);
  }
}
