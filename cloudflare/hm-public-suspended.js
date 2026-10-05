/** Kırşehir haber alanları. Ön yüz VPS PHP’dedir; Worker yalnızca askı kapısı için araya girer. */
import { HM_PUBLIC_SUSPENDED_PAGE_HTML } from "../goalgo/artifacts/ahenkpress/src/lib/hmPublicSuspendedPage.js";

const KH_PUBLIC_HOSTS = new Set([
  "kirsehirhaber.org",
  "kirsehri.com",
  "kirsehir.net",
]);

const FLAG_CACHE_MS = 30_000;
let flagCache = { at: 0, flag: /** @type {boolean | null} */ (null) };

/** Admin kenar yazısı aynı isolate içinde eski bayrağı tutmasın. */
export function clearKhSuspendedFlagCache() {
  flagCache = { at: 0, flag: null };
}

export function normalizeKhHost(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .split(":")[0]
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

/** Bu yollar zaten Worker’da (panel, API, tema dosyası). Askı sayfası onların yerine geçmez. */
export function isKhWorkerPassthroughPath(pathname) {
  const p = String(pathname || "");
  return (
    p === "/api" ||
    p.startsWith("/api/") ||
    p.startsWith("/editor") ||
    p.startsWith("/admin") ||
    p.startsWith("/panel") ||
    p.startsWith("/haber-merkezi") ||
    p.startsWith("/assets/") ||
    p === "/sw.js" ||
    p === "/llms.txt" ||
    p === "/ai.txt" ||
    p === "/manifest.json"
  );
}

export function isKhPublicHost(hostname) {
  return KH_PUBLIC_HOSTS.has(normalizeKhHost(hostname));
}

function parseLayout(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw || ""));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    /* bozuk satır siteyi açık bırakmasın */
  }
  return {};
}

/** true = askıda, false = yayında, null = bayrak yok. */
export function khSuspendedFlagFromRows(rows) {
  let sawTrue = false;
  let sawFalse = false;
  for (const row of rows || []) {
    const layout = parseLayout(row?.layout_json ?? row?.layoutJson);
    if (layout.hmPublicSuspended === true) sawTrue = true;
    else if (layout.hmPublicSuspended === false) sawFalse = true;
  }
  if (sawTrue) return true;
  if (sawFalse) return false;
  return null;
}

export function khSuspensionHtml() {
  return HM_PUBLIC_SUSPENDED_PAGE_HTML;
}

function suspensionResponse(request) {
  return new Response(request.method === "HEAD" ? null : khSuspensionHtml(), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=30, s-maxage=30",
      "x-content-type-options": "nosniff",
      "x-hm-public-suspended": "1",
      "x-yekpare-frontend": "kh-public-suspended",
    },
  });
}

async function readKhSuspendedFlag(env) {
  const now = Date.now();
  if (flagCache.at && now - flagCache.at < FLAG_CACHE_MS) return flagCache.flag;
  const { neonSqlClient } = await import("./neon-edge-db.js");
  const sql = neonSqlClient(env);
  if (!sql) {
    flagCache = { at: now, flag: null };
    return null;
  }
  try {
    const rows = await Promise.race([
      sql`
        SELECT domain, slug, layout_json
        FROM hm_news_sites
        WHERE lower(coalesce(domain, '')) IN ('kirsehirhaber.org', 'kirsehri.com', 'kirsehir.net')
           OR lower(coalesce(slug, '')) IN ('kirsehirhaber', 'kh', 'kirsehir')
        LIMIT 8
      `,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
    ]);
    const flag = khSuspendedFlagFromRows(rows);
    flagCache = { at: now, flag };
    return flag;
  } catch {
    flagCache = { at: now, flag: null };
    return null;
  }
}

/**
 * Kırşehir kamu sayfası. Askı bayrağı açık, boş veya okunamazsa askı yazısı.
 * Bayrak açıkça false ise istek Worker’ı atlayıp VPS PHP temasına gider.
 * Panel ve API yollarında null döner.
 */
export async function khPublicSuspensionResponse(request, env, incoming) {
  if (!isKhPublicHost(incoming.hostname)) return null;
  if (isKhWorkerPassthroughPath(incoming.pathname)) return null;
  if (request.headers.get("x-hm-php-origin") === "1") {
    return new Response("PHP origin", {
      status: 502,
      headers: { "cache-control": "no-store", "x-hm-php-origin-loop": "1" },
    });
  }
  const flag = await readKhSuspendedFlag(env);
  if (flag === false) {
    const headers = new Headers(request.headers);
    headers.set("x-hm-php-origin", "1");
    return fetch(new Request(request, { headers }));
  }
  return suspensionResponse(request);
}
