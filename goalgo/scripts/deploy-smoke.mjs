#!/usr/bin/env node
const DEFAULT_TIMEOUT_MS = 15_000;

function usage() {
  console.log(`Usage:
  WEB_ORIGIN=https://yekpare.net API_ORIGIN=https://api.up.railway.app pnpm run deploy:smoke
  pnpm run deploy:smoke -- --web https://yekpare.net --api https://api.up.railway.app --call https://call.yekpare.net

Checks:
  - web origin loads /
  - web origin loads /admin/giris
  - web origin /api/healthz proxy reaches API
  - api origin /api/healthz responds when API_ORIGIN is provided
  - call center origin /api/health responds when CALL_ORIGIN is provided`);
}

function argValue(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  usage();
  process.exit(0);
}

const webOrigin = (argValue("--web") || process.env.WEB_ORIGIN || process.env.VERCEL_ORIGIN || "").replace(/\/+$/, "");
const apiOrigin = (argValue("--api") || process.env.API_ORIGIN || process.env.RAILWAY_API_ORIGIN || "").replace(/\/+$/, "");
const callOrigin = (argValue("--call") || process.env.CALL_ORIGIN || process.env.AGENTLABS_URL || "").replace(/\/+$/, "");
const MAP_PLACE_SMOKE_PATH = "/maps/place/%C4%B0stanbul/@41.013611,28.955,13z";

if (!webOrigin) {
  usage();
  console.error("\n[deploy-smoke] WEB_ORIGIN is required.");
  process.exit(2);
}

function joinUrl(origin, path) {
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

async function check(label, url, opts = {}) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      redirect: "manual",
      signal: ctrl.signal,
      headers: opts.headers,
    });
    const body = await res.text().catch(() => "");
    const ok = opts.ok ? opts.ok(res, body) : res.status >= 200 && res.status < 400;
    console.log(`${ok ? "PASS" : "FAIL"} ${label}: HTTP ${res.status} ${url}`);
    if (!ok && body) console.log(body.slice(0, 500));
    return ok;
  } catch (err) {
    console.log(`FAIL ${label}: ${err instanceof Error ? err.message : String(err)} ${url}`);
    return false;
  } finally {
    clearTimeout(tid);
  }
}

const checks = [
  check("web /", joinUrl(webOrigin, "/"), {
    ok: (res, body) => res.status >= 200 && res.status < 400 && /<html/i.test(body),
  }),
  check("web /admin/giris", joinUrl(webOrigin, "/admin/giris"), {
    ok: (res, body) => res.status >= 200 && res.status < 400 && /html|Yönetim|Yonetim|Giriş|Giris/i.test(body),
  }),
  check("web /map", joinUrl(webOrigin, "/map"), {
    ok: (res, body) => res.status >= 200 && res.status < 400 && /<html/i.test(body),
  }),
  check("web map place route", joinUrl(webOrigin, MAP_PLACE_SMOKE_PATH), {
    ok: (res, body) => res.status >= 200 && res.status < 400 && /<html/i.test(body),
  }),
  check("web /api/healthz proxy", joinUrl(webOrigin, "/api/healthz"), {
    ok: (res, body) => res.status === 200 && /"status"\s*:\s*"ok"/i.test(body),
  }),
];

if (apiOrigin) {
  checks.push(
    check("api /api/healthz direct", joinUrl(apiOrigin, "/api/healthz"), {
      ok: (res, body) => res.status === 200 && /"status"\s*:\s*"ok"/i.test(body),
    }),
  );
}

if (callOrigin) {
  checks.push(
    check("call center /api/health direct", joinUrl(callOrigin, "/api/health"), {
      ok: (res, body) => res.status === 200 && /ok|healthy|status|success/i.test(body),
    }),
  );
}

const results = await Promise.all(checks);
if (results.every(Boolean)) {
  console.log("[deploy-smoke] OK");
} else {
  console.error("[deploy-smoke] One or more checks failed.");
  process.exit(1);
}
