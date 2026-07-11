import { apiUrl, adminAuthHeaders, ensureAdminPanelBootstrap } from "./apiBase";
import { fetchPublicJson } from "./fetchPublicJson";
import { sanitizeApiDisplayJson } from "./sanitizeApiDisplayJson";

/** Kamu haber listesi — Railway yavaş yanıtında sonsuz skeleton önlemek için üst sınır. */
export const HM_PUBLIC_NEWS_FETCH_TIMEOUT_MS = 15_000;

/** HM anasayfa bootstrap — hibrit + DB paralel; tek kaynak takılı kalmasın diye kısa süre.
 * DB yanıtı gelir gelmez skeleton kalkar; bu yalnız DB de boş dönerse devreye giren güvenlik ağı.
 * Kategori kutuları artık t=0'da paralel çekildiği için bu yalnız güvenlik ağıdır; kısa tutulur
 * ki hiçbir bölüm "birkaç saniye"den fazla "Haberler yükleniyor"da kalmasın. */
export const HM_HOME_NEWS_BOOTSTRAP_MAX_MS = 3_500;

/** useQuery `data: x = []` yalnızca `undefined` için geçerli; API bazen `null` veya nesne döndürebilir. */
export function asArray<T = any>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

function resolveFetchUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return apiUrl(url.startsWith("/") ? url : `/${url}`);
}

function buildApiRequestHeaders(options?: RequestInit): Headers {
  const headers = new Headers({ "Content-Type": "application/json" });
  const optH = options?.headers;
  if (optH instanceof Headers) {
    optH.forEach((v, k) => headers.set(k, v));
  } else if (optH && typeof optH === "object") {
    for (const [k, v] of Object.entries(optH as Record<string, string>)) {
      if (typeof v === "string") headers.set(k, v);
    }
  }
  for (const [k, v] of Object.entries(adminAuthHeaders())) {
    if (v && !headers.has(k)) headers.set(k, v);
  }
  return headers;
}

/** Vitrin haber GET — zaman aşımı ve sınırlı yeniden deneme. */
export async function fetchPublicNewsJson<T = unknown>(
  url: string,
  timeoutMs: number = HM_PUBLIC_NEWS_FETCH_TIMEOUT_MS,
): Promise<T> {
  const { ok, data, status, timedOut } = await fetchPublicJson<T>(resolveFetchUrl(url), {
    timeoutMs,
    retries: 1,
  });
  if (!ok) {
    const reason = timedOut ? "timed out" : status ? `HTTP ${status}` : "failed";
    throw new Error(`News fetch ${reason}`);
  }
  return sanitizeApiDisplayJson(data as T);
}

/** GET isteklerinde varsayılan zaman aşımı — soğuk API'de anasayfa sorguları sonsuza asılmasın. */
export const API_REQUEST_DEFAULT_TIMEOUT_MS = 15_000;

export async function apiRequest(url: string, options?: RequestInit): Promise<any> {
  const method = String(options?.method ?? "GET").toUpperCase();
  // Yalnız GET/HEAD (idempotent) isteklere otomatik zaman aşımı uygula; POST/PUT/DELETE gibi
  // mutasyonları (ör. uzun RSS kampanyası) kesmeyelim. Çağıran kendi signal'ını verirse ona saygı duy.
  const applyTimeout = (method === "GET" || method === "HEAD") && !options?.signal;
  const doFetch = async () => {
    const timeoutController = applyTimeout ? new AbortController() : null;
    const timeoutId = timeoutController
      ? setTimeout(() => timeoutController.abort(), API_REQUEST_DEFAULT_TIMEOUT_MS)
      : undefined;
    try {
      return await fetch(resolveFetchUrl(url), {
        credentials: "include",
        ...options,
        signal: timeoutController?.signal ?? options?.signal,
        headers: buildApiRequestHeaders(options),
      });
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };
  let res = await doFetch();
  if (res.status === 401) {
    await ensureAdminPanelBootstrap();
    res = await doFetch();
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const text = await res.text();
  if (!text) return null;
  try {
    return sanitizeApiDisplayJson(JSON.parse(text));
  } catch {
    return text;
  }
}
