/**
 * Post-deploy: Worker domains API + bekleyen zone oluşturma
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { detachRemovedDomains } from "./cf-detached-domains.mjs";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "16f5b996194174624e7969a3658bd2bb";
const API = "https://api.cloudflare.com/client/v4";
const SCRIPT = "haberler";

function findTokenFiles(dir, depth = 0, out = []) {
  if (depth > 4 || !existsSync(dir)) return out;
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) findTokenFiles(p, depth + 1, out);
    else if (/\.(toml|json|jsonc)$/i.test(e.name) || e.name === "config") out.push(p);
  }
  return out;
}

function loadToken() {
  for (const key of ["CLOUDFLARE_API_TOKEN", "CF_API_TOKEN", "CLOUDFLARE_API_KEY"]) {
    if (process.env[key]) {
      console.log(`[cutover] token from env ${key}`);
      return { token: process.env[key], email: process.env.CLOUDFLARE_EMAIL || "" };
    }
  }
  const roots = [
    join(homedir(), ".wrangler"),
    join(homedir(), ".config", ".wrangler"),
    join(homedir(), ".config", "wrangler"),
    "/opt/buildhome/.config/.wrangler",
    "/opt/buildhome/.wrangler",
    "/opt/buildhome/.config/wrangler",
  ];
  for (const root of roots) {
    for (const p of findTokenFiles(root)) {
      try {
        const text = readFileSync(p, "utf8");
        const oauth = text.match(/oauth_token\s*=\s*"([^"]+)"/);
        const api = text.match(/api_token\s*=\s*"([^"]+)"/);
        const email = text.match(/email\s*=\s*"([^"]+)"/);
        if (oauth?.[1] || api?.[1]) {
          console.log(`[cutover] token from file ${p}`);
          return { token: (oauth || api)[1], email: email?.[1] || "" };
        }
      } catch {
        /* ignore */
      }
    }
  }
  return { token: "", email: "" };
}

async function cf(path, { method = "GET", body, token, email } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (email && process.env.CLOUDFLARE_API_KEY) {
    headers["X-Auth-Email"] = email;
    headers["X-Auth-Key"] = process.env.CLOUDFLARE_API_KEY;
  } else {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.success !== false, status: res.status, json };
}

async function getZoneId(auth, name) {
  const r = await cf(`/zones?name=${encodeURIComponent(name)}&account.id=${ACCOUNT_ID}`, auth);
  return r.json?.result?.[0]?.id || null;
}

async function attachWorkerHostname(auth, hostname) {
  // Workers Domains (custom domains) API
  const r = await cf(
    `/accounts/${ACCOUNT_ID}/workers/domains`,
    {
      method: "PUT",
      body: {
        hostname,
        service: SCRIPT,
        environment: "production",
      },
      ...auth,
    },
  );
  console.log(
    `[cutover] workers/domains ${hostname} status=${r.status} ok=${r.ok}`,
    JSON.stringify(r.json?.errors || r.json?.result || r.json?.messages || {}),
  );
  return r.ok;
}

async function main() {
  console.log(
    "[cutover] auth-related env keys:",
    Object.keys(process.env)
      .filter((k) => /CLOUD|CF_|WRANGLER|TOKEN|API_KEY|AUTH/i.test(k))
      .join(", ") || "(none)",
  );

  // Confirm wrangler auth works in this process
  try {
    const require = createRequire(import.meta.url);
    const upstreamPkg = join(require.resolve("wrangler-upstream/package.json"), "..");
    const bin = join(upstreamPkg, "bin", "wrangler.js");
    const who = spawnSync(process.execPath, [bin, "whoami"], { encoding: "utf8", env: process.env });
    console.log("[cutover] wrangler whoami status", who.status, (who.stdout || who.stderr || "").slice(0, 300));
  } catch (e) {
    console.log("[cutover] whoami skip", e.message);
  }

  const auth = loadToken();
  if (!auth.token) {
    console.warn("[cutover] NO TOKEN — cannot edit DNS. Worker deploy already done.");
    return;
  }

  await detachRemovedDomains((path, init) => cf(path, { ...init, ...auth }), {
    accountId: ACCOUNT_ID,
    script: SCRIPT,
    log: (...args) => console.log(...args),
  });

  // Custom hostnames on Worker (requires zone ownership)
  for (const host of ["ankarasehirgazetesi.com", "www.ankarasehirgazetesi.com", "turknet.app", "www.turknet.app"]) {
    await attachWorkerHostname(auth, host);
  }

  // Try create pending zones for Netlify NS domains
  for (const name of ["ankarasehirgazetesi.com", "turknet.app"]) {
    const id = await getZoneId(auth, name);
    if (id) {
      console.log(`[cutover] zone exists ${name}=${id}`);
      continue;
    }
    const r = await cf(
      `/zones`,
      {
        method: "POST",
        body: { name, account: { id: ACCOUNT_ID }, jump_start: true, type: "full" },
        ...auth,
      },
    );
    console.log(
      `[cutover] create zone ${name} ok=${r.ok}`,
      JSON.stringify({
        errors: r.json?.errors,
        ns: r.json?.result?.name_servers,
        id: r.json?.result?.id,
      }),
    );
  }
}

main().catch((e) => {
  console.warn("[cutover] fatal", e);
});
