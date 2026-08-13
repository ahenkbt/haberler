/**
 * API kökeni — yalnızca Cloudflare Container veya (test için) harici origin.
 * Render / onrender.com asla kullanılmaz.
 */
export const FRONTEND_TAG = "cloudflare-worker";
export const CANONICAL_API_ORIGIN = "https://turk.eco";
export const API_CONTAINER_INSTANCES = 3;

const FORBIDDEN_ORIGIN_RE = /onrender\.com/i;

export function isForbiddenLegacyOrigin(origin) {
  return FORBIDDEN_ORIGIN_RE.test(String(origin || ""));
}

/** wrangler [vars] / secret: boş veya onrender → yok say. */
export function configuredApiOrigin(env) {
  const raw = String(env?.API_ORIGIN || env?.RENDER_API_ORIGIN || "")
    .trim()
    .replace(/\/+$/, "");
  if (!raw || isForbiddenLegacyOrigin(raw)) return "";
  return raw;
}

export function hasApiContainer(env) {
  return Boolean(env?.GOALGO_API);
}

/**
 * URL inşası için kök. Gerçek HTTP Container üzerinden gider.
 * incomingOrigin verilirse aynı-origin (turk.eco, HM alanları).
 */
export function resolveApiOrigin(env, incomingOrigin) {
  const configured = configuredApiOrigin(env);
  if (configured) return configured;
  const incoming = String(incomingOrigin || "")
    .trim()
    .replace(/\/+$/, "");
  if (incoming && !isForbiddenLegacyOrigin(incoming)) return incoming;
  return CANONICAL_API_ORIGIN;
}

export async function getApiStub(env) {
  if (!env?.GOALGO_API) return null;
  try {
    const { getRandom } = await import("@cloudflare/containers");
    return await getRandom(env.GOALGO_API, API_CONTAINER_INSTANCES);
  } catch {
    if (typeof env.GOALGO_API.getByName === "function") {
      return env.GOALGO_API.getByName("api");
    }
    return null;
  }
}

function requestInitWithoutCf(init) {
  if (!init || typeof init !== "object") return {};
  const { cf: _cf, ...rest } = init;
  return rest;
}

/**
 * /api istekleri: Container varsa oraya; yoksa (ve origin yasaklı değilse) harici fetch.
 * Render’a düşmez.
 */
export async function fetchApi(env, url, init = {}) {
  const stub = await getApiStub(env);
  if (stub) {
    const reqInit = requestInitWithoutCf(init);
    const method = String(reqInit.method || "GET").toUpperCase();
    if (reqInit.body && method !== "GET" && method !== "HEAD") {
      reqInit.duplex = reqInit.duplex || "half";
    }
    return stub.fetch(new Request(String(url), reqInit));
  }

  const configured = configuredApiOrigin(env);
  if (!configured) {
    throw new Error("api_unavailable");
  }
  const parsed = new URL(String(url), `${configured}/`);
  return fetch(`${configured}${parsed.pathname}${parsed.search}`, init);
}

export async function fetchApiWithRetry(env, url, init = {}, retries = 2) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetchApi(env, url, init);
      if ([502, 503, 504].includes(res.status) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }
  }
  throw lastErr || new Error("api_unavailable");
}
