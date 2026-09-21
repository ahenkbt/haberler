/**
 * API k├Âkeni ÔÇö yaln─▒zca Cloudflare Container veya (test i├ğin) harici origin.
 * Render / onrender.com asla kullan─▒lmaz.
 */
export const FRONTEND_TAG = "cloudflare-worker";
export const CANONICAL_API_ORIGIN = "https://ahenk.net.tr";
export const API_CONTAINER_INSTANCES = 3;

const FORBIDDEN_ORIGIN_RE = /onrender\.com/i;

export function isForbiddenLegacyOrigin(origin) {
  return FORBIDDEN_ORIGIN_RE.test(String(origin || ""));
}

/** wrangler [vars] / secret: bo┼ş veya onrender ÔåÆ yok say. */
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
 * URL in┼şas─▒ i├ğin k├Âk. Ger├ğek HTTP Container ├╝zerinden gider.
 * incomingOrigin verilirse ayn─▒-origin (turk.eco, HM alanlar─▒).
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

/** Warm DO `api` eski imaj─▒ tutar; CONTAINER_ROLL de─şi┼şince yeni instance a├ğ. */
export function apiContainerInstanceName(env) {
  const roll = String(env?.CONTAINER_ROLL || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return roll || "api";
}

export async function getApiStub(env) {
  if (!env?.GOALGO_API) return null;
  try {
    const { getRandom } = await import("@cloudflare/containers");
    return await getRandom(env.GOALGO_API, API_CONTAINER_INSTANCES);
  } catch {
    const instance = apiContainerInstanceName(env);
    if (typeof env.GOALGO_API.getByName === "function") {
      return env.GOALGO_API.getByName(instance);
    }
    if (typeof env.GOALGO_API.idFromName === "function") {
      return env.GOALGO_API.get(env.GOALGO_API.idFromName(instance));
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
 * /api istekleri: Container varsa oraya; yoksa (ve origin yasakl─▒ de─şilse) harici fetch.
 * RenderÔÇÖa d├╝┼şmez.
 */
export async function fetchApi(env, url, init = {}) {
  // Explicit API_ORIGIN wins (yektube Worker can proxy to haberler container while
  // its own Container binding is still provisioning / failing to start).
  const configured = configuredApiOrigin(env);
  if (configured) {
    const parsed = new URL(String(url), `${configured}/`);
    return fetch(`${configured}${parsed.pathname}${parsed.search}`, init);
  }

  const stub = await getApiStub(env);
  if (stub) {
    const reqInit = requestInitWithoutCf(init);
    delete reqInit.signal;
    const method = String(reqInit.method || "GET").toUpperCase();
    if (reqInit.body && method !== "GET" && method !== "HEAD") {
      reqInit.duplex = reqInit.duplex || "half";
    }
    return stub.fetch(new Request(String(url), reqInit));
  }

  throw new Error("api_unavailable");
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