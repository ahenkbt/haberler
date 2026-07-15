import { isConfiguredPortalHost, isDefaultPortalHost, isEffectivePortalHost } from "./hmPortalHosts";
import { PORTAL_ORIGIN } from "./portalBrand";

function parseConfiguredApiOrigin(): string | null {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";
  if (!raw) return null;
  const base = raw.replace(/\/+$/, "");
  try {
    const abs = /^https?:\/\//i.test(base) ? base : `https://${base}`;
    return new URL(abs).origin;
  } catch {
    return null;
  }
}

/** Üretimde build env ile verilir; boş = aynı origin `/api` (Cloudflare Worker + Container). */
const PRODUCTION_API_ORIGIN_FALLBACK = (import.meta.env.VITE_PUBLIC_API_ORIGIN?.trim() || "").replace(
  /\/+$/,
  "",
);

/**
 * HM / mağaza özel alanında doğrudan Railway çağrısı için API kökü.
 * CORS: `hm_news_sites.domain*` + `vendor_custom_domains` kayıtlı hostlar izinlidir.
 */
export function resolveExternalApiOrigin(): string | null {
  const fromVite = parseConfiguredApiOrigin();
  if (fromVite) return fromVite.replace(/\/+$/, "");
  const pub = import.meta.env.VITE_PUBLIC_API_ORIGIN?.trim();
  if (pub) {
    try {
      const abs = /^https?:\/\//i.test(pub) ? pub : `https://${pub}`;
      return new URL(abs).origin.replace(/\/+$/, "");
    } catch {
      /* ignore */
    }
  }
  if (import.meta.env.PROD) {
    const fallback = PRODUCTION_API_ORIGIN_FALLBACK.replace(/\/+$/, "");
    return fallback || null;
  }
  return null;
}

/** Kanonik portal dışındaki tüm hostlar (HM/mağaza özel alanı, önbellek gerekmez). */
function isCustomNonPortalHost(host: string): boolean {
  const h = host.toLowerCase().split(":")[0]?.replace(/^www\./, "") ?? "";
  return Boolean(h && !isConfiguredPortalHost(h));
}

/** Özel alanda Edge `/api` vekili yokken çapraz köken Railway URL (portal hostları hariç). */
function customDomainDirectApiUrl(path: string): string | null {
  if (typeof window === "undefined") return null;
  if (import.meta.env.VITE_API_CROSS_ORIGIN === "true") return null;
  /**
   * Netlify/Vercel build'de `VITE_PUBLIC_API_ORIGIN` tanımlıdır → aynı hostta `/api` vekili vardır.
   * Özel alan (ankarasehirgazetesi.com vb.) doğrudan Render'a giderse soğuk başlangıçta 30sn+
   * zaman aşımı ve CORS; Netlify vekili ~300ms (test edildi).
   */
  if (import.meta.env.VITE_PUBLIC_API_ORIGIN?.trim()) return null;
  const host = window.location.hostname.toLowerCase().split(":")[0] ?? "";
  if (!host || !isCustomNonPortalHost(host)) return null;
  const ext = resolveExternalApiOrigin();
  if (!ext || ext === window.location.origin) return null;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${ext}${p}`;
}

/** Özel alan + göreli `/api/...` medya; yapılandırma yoksa portal kökü (varsayılan turknet.app). */
const FALLBACK_PORTAL_ORIGIN =
  (typeof import.meta.env.VITE_PUBLIC_PORTAL_ORIGIN === "string" && import.meta.env.VITE_PUBLIC_PORTAL_ORIGIN.trim()) ||
  PORTAL_ORIGIN;

export function publicMediaOriginForPersistence(): string {
  return (parseConfiguredApiOrigin() ?? FALLBACK_PORTAL_ORIGIN.replace(/\/+$/, "")).replace(/\/+$/, "");
}

/**
 * Özel alan (örn. ajans.com) üzerinde `/admin/...` aynı hostta `/api` vekili olmadan çalışmaz; oturum çerezi de
 * kanonik portalda (`turknet.app` veya `VITE_PUBLIC_PORTAL_ORIGIN`) oluşmalıdır.
 * SSR sırasında göreli yol döner; istemcide hosta göre tam URL üretilir.
 */
export function portalCanonicalAdminPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return p;
  const host = window.location.hostname.toLowerCase().split(":")[0] ?? "";
  if (isDefaultPortalHost(host)) return p;
  return `${FALLBACK_PORTAL_ORIGIN.replace(/\/+$/, "")}${p}`;
}

/**
 * Logo / medya URL’sini veritabanında saklamak için: göreli `/api/...` yollarını mutlak köke çevirir.
 * Özel alan vitrininde `<img src>` tarayıcıda doğru hostu kullanır.
 */
/**
 * Yüklenen dosyalar `/api/media/uploads/...` altında API sunucusundadır. Tam adres bazen
 * özel alan veya editör sekmesi köküyle (`https://suhaberajansi.com/api/media/...`) kaydedilir;
 * bu kökte `/api` olmadığı için logo kırılır. Kanonik API köküne taşırız.
 *
 * İstisna: turknet.app / localhost vb. portal geliştirmede sayfa ile aynı kökte kalan ve
 * gerçekten bu kökten serv edilen `/api/media` URL’lerine dokunmayız.
 */
/**
 * Ana portalda (turknet.app) görüntü istekleri sayfa kökündeki `/api` vekiline gitmeli.
 * Mutlak Railway / başka kök adresleri logo ve avatar `<img>` kırılmalarına yol açabiliyor.
 */
/**
 * Her türlü mutlak/göreli string içinden `/api/media/…` yolunu çıkarır (sorgu + hash korunur).
 * Örn. Railway veya eski özel alan köküyle kayıtlı adresler turknet.app vekilinde kırılmayı önler.
 */
export function extractApiMediaPath(url: string): string | null {
  const raw = url.trim();
  if (!raw) return null;
  try {
    if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) {
      const u = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
      if (u.pathname.startsWith("/api/media/")) {
        return `${u.pathname}${u.search}${u.hash}`;
      }
      // Eski kayıtlar: doğrudan R2 public dev URL → vekil yolu (SSL/CORS önlenir)
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
  if (raw.startsWith("/api/media/")) return raw;
  const idx = raw.indexOf("/api/media/");
  if (idx >= 0) {
    try {
      return raw.slice(idx).split(/\s/)[0] ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

function googlePlacePhotoProxyPath(url: string): string | null {
  const raw = url.trim();
  if (!raw) return null;
  if (raw.startsWith("/api/map/places/photo")) return raw;
  if (raw.startsWith("/map/places/photo")) return `/api${raw}`;
  try {
    const u = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
    if (u.hostname === "maps.googleapis.com" && u.pathname === "/maps/api/place/photo") {
      const ref = u.searchParams.get("photo_reference") || u.searchParams.get("photoreference") || "";
      if (!ref) return null;
      const maxwidth = u.searchParams.get("maxwidth") || u.searchParams.get("maxWidth") || "800";
      return `/api/map/places/photo?ref=${encodeURIComponent(ref)}&maxwidth=${encodeURIComponent(maxwidth)}`;
    }
    if (u.hostname === "places.googleapis.com" && u.pathname.startsWith("/v1/") && u.pathname.endsWith("/media")) {
      const resource = u.pathname.slice("/v1/".length, -"/media".length).replace(/^\/+|\/+$/g, "");
      if (!resource) return null;
      const maxWidthPx = u.searchParams.get("maxWidthPx") || "1200";
      return `/api/map/places/photo-media?resource=${encodeURIComponent(resource)}&maxWidthPx=${encodeURIComponent(maxWidthPx)}`;
    }
  } catch {
    return null;
  }
  return null;
}

function portalRelativeApiMediaPathIfNeeded(url: string): string {
  if (typeof window === "undefined") return url;
  const pageHost = window.location.hostname.toLowerCase().split(":")[0] ?? "";
  if (!isEffectivePortalHost(pageHost)) return url;
  try {
    const u = new URL(url, window.location.origin);
    if (u.pathname.startsWith("/api/media/")) {
      return `${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    /* ignore */
  }
  return url;
}

function rewriteAbsoluteMediaApiUrlToCanonical(absUrl: string): string | null {
  try {
    const u = new URL(absUrl);
    if (!u.pathname.startsWith("/api/media/")) return null;
    const target = publicMediaOriginForPersistence();
    if (u.origin === target) return null;

    const onBrowser = typeof window !== "undefined";
    const pageHost = onBrowser ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
    const sameDocOrigin = onBrowser && u.origin === window.location.origin;
    if (sameDocOrigin && isEffectivePortalHost(pageHost)) return null;

    return `${target}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return null;
  }
}

export function toPersistedPublicMediaUrl(pathOrUrl: string): string {
  const raw = pathOrUrl.trim();
  if (!raw) return "";
  let t = raw;
  if (t.startsWith("//")) t = `https:${t}`;
  if (/^https?:\/\//i.test(t)) {
    const rw = rewriteAbsoluteMediaApiUrlToCanonical(t);
    if (rw) return rw;
    return t;
  }
  if (t.startsWith("/")) return `${publicMediaOriginForPersistence()}${t}`;
  return t;
}

/**
 * SPA site kökünde (örn. turknet.app), `VITE_API_BASE_URL` ise başka kökte (Railway) ise:
 * panel oturumu çerezi yalnızca siteye yazılır; doğrudan Railway çağrısında `admin=1` uçları 401 döner,
 * liste boş kalır. Aynı sitede `/api` ters vekil varsa göreli yolu kullan.
 *
 * **HM özel alan:** Edge `/api` vekili yoksa (Vercel middleware 404) tarayıcı doğrudan Railway’e gider;
 * CORS kayıtlı domain listesinde (`hm_news_sites.domain*`) host izinlidir.
 *
 * Çapraz köken + CORS/credentials ile bilinçli çalışıyorsanız: `VITE_API_CROSS_ORIGIN=true` ile
 * yapılandırılmış tam URL korunur.
 */
export function shouldUseRelativeApiInBrowser(): boolean {
  if (import.meta.env.VITE_API_CROSS_ORIGIN === "true") return false;
  if (typeof window === "undefined") return false;
  const apiOrigin = parseConfiguredApiOrigin();
  if (!apiOrigin) return false;
  if (apiOrigin === window.location.origin) return false;
  /** Vercel Edge `/api` vekili: tüm özel alanlar (HM/mağaza + bağsız portal) göreli yol kullanır. */
  return true;
}

/** `@workspace/api-client-react` `setBaseUrl` — çapraz kökte null (göreli `/api`). */
export function getResolvedApiBaseForClient(): string | null {
  if (shouldUseRelativeApiInBrowser()) return null;
  const raw = import.meta.env.VITE_API_BASE_URL?.trim();
  return raw ? raw.replace(/\/+$/, "") : null;
}

/** Ham `fetch` / `apiFetch` için; `main.tsx` içinde `setBaseUrl` ile aynı mantık. */
/**
 * `<img src>` için: `/api/media/...` ve tam URL’deki aynı yol, mümkünse **mevcut sayfa kökündeki** vekil ile
 * yüklenir (Railway’e doğrudan gitmek özel alanda sık sık kırılır). Portal hostları ve `apiUrl` ile aynı
 * “göreli API” koşulunda (`shouldUseRelativeApiInBrowser`) tam köken bağımsız olarak `/api/media/...` döner.
 */
/**
 * Google (Maps/Places/usercontent) görselleri küçük boyut jetonu (`=w86-h86`, `=s100`) ile gelir;
 * kartlarda pikselli görünmesin diye yüksek çözünürlük iste. Jeton soneki (`-k-no`, `-c` vb.) korunur.
 */
export function upgradeGooglePhotoResolution(url: string): string {
  const t = (url ?? "").trim();
  if (!t) return t;
  if (!/(googleusercontent|ggpht|gstatic)\.com\//i.test(t)) return t;
  return t
    .replace(/=w\d+-h\d+/g, "=w1600-h1200")
    .replace(/=s\d+/g, "=s1600");
}

export function resolveClientMediaSrc(url: string | null | undefined): string {
  let t = (url ?? "").trim();
  if (!t) return "";
  if (t.startsWith("//")) t = `https:${t}`;
  t = upgradeGooglePhotoResolution(t);

  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase().split(":")[0] ?? "";
    const placesPhotoPath = googlePlacePhotoProxyPath(t);
    if (placesPhotoPath) {
      if (!isCustomNonPortalHost(host) || shouldUseRelativeApiInBrowser()) return placesPhotoPath;
      return `${publicMediaOriginForPersistence()}${placesPhotoPath}`;
    }
    const mediaPath = extractApiMediaPath(t);
    if (mediaPath && typeof window !== "undefined") {
      return mediaPath;
    }
  }
  /** HTTPS sayfada `http://…` görseller tarayıcı tarafından karışık içerik olarak engellenir. */
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    /^http:\/\//i.test(t) &&
    !/^http:\/\/(?:localhost|127\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.)/i.test(t)
  ) {
    t = `https://${t.slice("http://".length)}`;
  }
  if (/^https?:\/\//i.test(t)) {
    const rw = rewriteAbsoluteMediaApiUrlToCanonical(t);
    if (rw) return portalRelativeApiMediaPathIfNeeded(rw);
    return portalRelativeApiMediaPathIfNeeded(t);
  }
  if (!t.startsWith("/")) return t;
  /** Göreli medya: portal ana sitede mutlak API köküne çevirmeden vekil üzerinden yükle. */
  if (typeof window !== "undefined" && t.startsWith("/api/media/")) {
    const host = window.location.hostname.toLowerCase().split(":")[0] ?? "";
    if (!isCustomNonPortalHost(host)) {
      return t;
    }
  }
  if (typeof window !== "undefined" && t.startsWith("/api/map/places/photo")) {
    const host = window.location.hostname.toLowerCase().split(":")[0] ?? "";
    if (!isCustomNonPortalHost(host) || shouldUseRelativeApiInBrowser()) {
      return t;
    }
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase().split(":")[0] ?? "";
    if (isCustomNonPortalHost(host) && t.startsWith("/api")) {
      const direct = customDomainDirectApiUrl(t);
      return direct ?? t;
    }
  }
  const apiOrigin = parseConfiguredApiOrigin();
  if (apiOrigin && typeof window !== "undefined" && window.location.origin !== apiOrigin) {
    return portalRelativeApiMediaPathIfNeeded(`${apiOrigin}${t}`);
  }
  return portalRelativeApiMediaPathIfNeeded(apiUrl(t));
}

/**
 * Haber gövdesi / panel HTML slotlarındaki `<img src>` adreslerini `resolveClientMediaSrc` ile günceller (portal `/api` vekili, özel alan tam URL).
 * `dangerouslySetInnerHTML` ile basılan içerikte görsellerin vitrindeki `<img>` ile aynı mantıkta çözülmesi için.
 *
 * İçeriği **tek başına** HTML olarak parse eder (üstüne sarıcı `<div>` eklenmez). Aksi halde reklam/HTML’de
 * gelen `</div>` vb. sarıcıyı erken kapatıp tüm sayfa DOM’unu bozabilirdi.
 */
/** Eski AI haberlerinde markdown ** alt başlıklarını gösterimde düzeltir (üretim zamanı normalize tercih edilir). */
export { normalizeAiNewsHtml } from "./normalizeAiNewsHtml";

export function rewriteInlineHtmlImgSrc(html: string): string {
  const raw = html ?? "";
  if (!raw.trim() || typeof window === "undefined") return raw;
  try {
    const doc = new DOMParser().parseFromString(raw, "text/html");
    const body = doc.body;
    if (!body) return raw;
    body.querySelectorAll("img[src]").forEach((el) => {
      const src = el.getAttribute("src");
      if (!src || src.startsWith("data:") || src.startsWith("blob:")) return;
      const resolved = resolveClientMediaSrc(src);
      if (resolved) el.setAttribute("src", resolved);
    });
    return body.innerHTML;
  } catch {
    return raw;
  }
}

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const customDirect = customDomainDirectApiUrl(p);
  if (customDirect) return customDirect;
  /**
   * Portal kökünde ayrı API (`VITE_API_BASE_URL` = Railway): panel oturumu için göreli `/api` vekili.
   * HM / mağaza özel alanları yukarıda doğrudan Railway’e yönlendirildi (Edge vekili opsiyonel).
   */
  if (typeof window !== "undefined" && import.meta.env.VITE_API_CROSS_ORIGIN !== "true") {
    const apiOrigin = parseConfiguredApiOrigin();
    if (apiOrigin && apiOrigin !== window.location.origin) {
      return p;
    }
  }
  if (shouldUseRelativeApiInBrowser()) return p;
  const raw = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";
  if (raw) return `${raw.replace(/\/+$/, "")}${p}`;
  return p;
}

/**
 * Panel oturumu çerezi tarayıcıda **mevcut site kökü** üzerinde oluşmalı (`turknet.app`, `/api` vekil).
 * `VITE_API_BASE_URL` tam Railway adresi olsa bile `VITE_API_CROSS_ORIGIN !== "true"` iken göreli yol kullanılır.
 */
export function adminPanelCookieApiPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.VITE_API_CROSS_ORIGIN === "true") return apiUrl(p);
  return p;
}

/** Panel `/api` → harici API vekilinde 502 / ROUTER_EXTERNAL_TARGET için kısa ipucu. */
export function adminFetchErrorHint(errorMessage: string): string {
  if (/MIDDLEWARE_INVOCATION_TIMEOUT/i.test(errorMessage)) {
    return " Vercel ara katmanı zaman aşımına uğradı; kazıma işlemi arka planda başlatılmalı — sayfayı yenileyip tekrar deneyin veya deploy sonrası doğrudan Railway vekiline yönlendirildiğini kontrol edin.";
  }
  if (/502|504|ROUTER_EXTERNAL_TARGET_ERROR/i.test(errorMessage)) {
    return " Panel ile API arasındaki vekil zaman aşımı veya hedef sunucu kesintisi olabilir; RSS kampanyası «Çalıştır» işlemi arka planda devam edebilir — İşlem Loglarına bakın. Bir süre sonra tekrar deneyin.";
  }
  return "";
}

export function adminAuthHeaders(): Record<string, string> {
  return {};
}

/** localStorage bayrağı — sunucu oturumu geçici olarak doğrulanamazsa yedek. */
export const ADMIN_AUTH_STORAGE_KEY = "ahenkpress_admin_auth";

export function hasLocalAdminAuthFlag(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === "1";
}

/**
 * Panel oturum çerezini doğrular.
 * `transient` = ağ/502/429; oturumu silmeyin, yerel bayrağa güvenin.
 */
export async function verifyAdminPanelSession(): Promise<"ok" | "denied" | "transient"> {
  try {
    const res = await fetch(adminPanelCookieApiPath("/api/members/admin-panel-status"), {
      credentials: "include",
    });
    if (res.status === 401) return "denied";
    if (res.status === 429 || res.status >= 500) return "transient";
    if (!res.ok) return "transient";
    const j = (await res.json().catch(() => ({}))) as { panelBootstrap?: boolean };
    return j.panelBootstrap === true ? "ok" : "denied";
  } catch {
    return "transient";
  }
}

export async function ensureAdminPanelBootstrap(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const st = await fetch(adminPanelCookieApiPath("/api/members/admin-panel-status"), {
      credentials: "include",
    });
    const j = (await st.json().catch(() => ({}))) as { panelBootstrap?: boolean };
    if (j.panelBootstrap === true) return;
  } catch {
    /* ignore */
  }
}

async function fetchWithAdminRetry(input: string | URL, init?: RequestInit): Promise<Response> {
  const mergeHeaders = () => {
    const headers = new Headers(init?.headers);
    for (const [k, v] of Object.entries(adminAuthHeaders())) {
      if (typeof v === "string" && v && !headers.has(k)) headers.set(k, v);
    }
    return headers;
  };
  let res = await fetch(input, { credentials: "include", ...init, headers: mergeHeaders() });
  if (res.status === 401) {
    await ensureAdminPanelBootstrap();
    res = await fetch(input, { credentials: "include", ...init, headers: mergeHeaders() });
  }
  return res;
}

/** Panel oturumu çerezi + isteğe bağlı `X-Yekpare-Admin-Secret`. 401 ise bir kez oturum yenilenip tekrarlanır. */
export function apiFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  return fetchWithAdminRetry(input, init);
}

/**
 * `denyUnlessAdminMaintenance` korumalı POST’lar için: önce panel oturumunu tazeler,
 * sonra `apiFetch` ile gönderir (401 yarışlarını azaltır).
 */
export async function postAdminJson(path: string, body: unknown): Promise<Response> {
  await ensureAdminPanelBootstrap();
  const p = path.startsWith("/") ? path : `/${path}`;
  return apiFetch(apiUrl(p), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}
