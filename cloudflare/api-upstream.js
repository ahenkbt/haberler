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

/** Warm DO `api` eski imajı tutar; CONTAINER_ROLL değişince yeni instance aç. */
export function apiContainerInstanceName(env) {
  const roll = String(env?.CONTAINER_ROLL || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return roll || "api";
}

/** getRandom() sabit "0".."n" isimlerine gider ve CONTAINER_ROLL'u yok sayar; sıcak instance eski imajda kalır. */
export function apiContainerInstanceNames(env, count = API_CONTAINER_INSTANCES) {
  const roll = apiContainerInstanceName(env);
  const n = Math.max(1, Math.min(20, Number(count) || 1));
  return Array.from({ length: n }, (_, i) => `${roll}-${i}`.slice(0, 63));
}

export async function getApiStub(env, preferredName) {
  if (!env?.GOALGO_API) return null;
  const names = apiContainerInstanceNames(env);
  const name = preferredName || names[Math.floor(Math.random() * names.length)];
  if (typeof env.GOALGO_API.getByName === "function") {
    return env.GOALGO_API.getByName(name);
  }
  if (typeof env.GOALGO_API.idFromName === "function") {
    return env.GOALGO_API.get(env.GOALGO_API.idFromName(name));
  }
  try {
    const { getRandom } = await import("@cloudflare/containers");
    return await getRandom(env.GOALGO_API, API_CONTAINER_INSTANCES);
  } catch {
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

  if (!env?.GOALGO_API) throw new Error("api_unavailable");
  const reqInit = requestInitWithoutCf(init);
  delete reqInit.signal;
  const method = String(reqInit.method || "GET").toUpperCase();
  if (reqInit.body && method !== "GET" && method !== "HEAD") {
    reqInit.duplex = reqInit.duplex || "half";
  }
  const idempotent = (method === "GET" || method === "HEAD") && !reqInit.body;
  if (!idempotent) {
    const stub = await getApiStub(env);
    if (!stub) throw new Error("api_unavailable");
    return stub.fetch(new Request(String(url), reqInit));
  }
  return fetchIdempotentWithFailover(env, String(url), reqInit);
}

/**
 * GET/HEAD: one container can hang (busy pool / stuck boot) while the others answer.
 * Give each attempt a deadline and move to a different instance name instead of
 * letting the browser wait 40 s+ (2026-10-09: ~1 in 4 GETs hung or 500'd).
 */
export const GET_ATTEMPT_TIMEOUT_MS = 8_000;
const RETRYABLE_GET_STATUS = new Set([500, 502, 503, 504]);

function shuffledNames(env) {
  const names = apiContainerInstanceNames(env);
  for (let i = names.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  return names;
}

function tagInstance(res, name, attempt) {
  if (!res || res.status === 101 || res.webSocket) return res;
  try {
    const out = new Response(res.body, res);
    out.headers.set("x-yk-api-instance", `${String(name).split("-").pop()}/${attempt + 1}`);
    return out;
  } catch {
    return res;
  }
}

/** Diagnostics: /api/healthz/pool?instance=N hits one named instance (no failover). */
export async function fetchApiInstancePool(env, index) {
  const names = apiContainerInstanceNames(env);
  const i = Math.max(0, Math.min(names.length - 1, Number(index) || 0));
  const stub = await getApiStub(env, names[i]);
  if (!stub) return new Response("no container", { status: 503 });
  const t0 = Date.now();
  const res = await Promise.race([
    stub.fetch(new Request("http://container/api/healthz/pool")),
    new Promise((r) => setTimeout(() => r(null), 12_000)),
  ]);
  const body = res ? await res.text().catch(() => "") : "";
  return new Response(
    JSON.stringify({ instance: i, name: names[i], ms: Date.now() - t0, status: res?.status ?? "timeout", body: body.slice(0, 600) }),
    { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } },
  );
}

async function fetchIdempotentWithFailover(env, url, reqInit) {
  const names = shuffledNames(env);
  let lastRes = null;
  let lastErr = null;
  for (let i = 0; i < names.length; i += 1) {
    const isLast = i === names.length - 1;
    const stub = await getApiStub(env, names[i]);
    if (!stub) break;
    const pending = stub.fetch(new Request(url, reqInit));
    try {
      const res = isLast
        ? await pending
        : await Promise.race([
            pending,
            new Promise((resolve) => setTimeout(() => resolve(null), GET_ATTEMPT_TIMEOUT_MS)),
          ]);
      if (!res) {
        pending.then((r) => r?.body?.cancel?.()).catch(() => {});
        // Ask the slow instance to check itself; it destroys its container only when
        // /api/healthz/live does not answer either (see GoalgoApiContainer.probeAndRecycle).
        stub.fetch(new Request("http://container/__yk_internal/probe-recycle")).catch(() => {});
        continue;
      }
      if (!isLast && RETRYABLE_GET_STATUS.has(res.status)) {
        lastRes = res;
        res.body?.cancel?.().catch?.(() => {});
        continue;
      }
      return tagInstance(res, names[i], i);
    } catch (err) {
      lastErr = err;
      if (isLast) break;
    }
  }
  if (lastRes) return lastRes;
  throw lastErr || new Error("api_unavailable");
}

export async function fetchApiWithRetry(env, url, init = {}, retries = 2, delayMs = 250) {
  const baseDelay = Math.max(50, Number(delayMs) || 250);
  let lastErr = null;
  // A streamed request body (POST/PUT/PATCH proxied from the browser) can be sent once.
  // Retrying it threw "body used" and the real API answer (e.g. 502 from an LLM test)
  // was replaced by a generic "Sunucu meşgul" 503.
  const method = String(init?.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD" && init?.body && typeof init.body !== "string") {
    retries = 0;
  }
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetchApi(env, url, init);
      if ([502, 503, 504].includes(res.status) && attempt < retries) {
        await new Promise((r) => setTimeout(r, Math.min(12_000, baseDelay * (attempt + 1))));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, Math.min(12_000, baseDelay * (attempt + 1))));
      }
    }
  }
  throw lastErr || new Error("api_unavailable");
}