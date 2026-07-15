/**
 * Post-deploy: Netlify temizliği + www + Worker domains API
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

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

async function ensureWwwDns(auth, zoneId, zoneName) {
  const list = await cf(`/zones/${zoneId}/dns_records?name=www.${zoneName}&per_page=50`, auth);
  const existing = list.json?.result || [];
  if (existing.length) {
    for (const rec of existing) {
      if (!rec.proxied && ["A", "AAAA", "CNAME"].includes(rec.type)) {
        await cf(
          `/zones/${zoneId}/dns_records/${rec.id}`,
          { method: "PATCH", body: { proxied: true }, ...auth },
        );
        console.log(`[cutover] proxied existing ${rec.type} ${rec.name}`);
      }
    }
    return;
  }
  const created = await cf(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: { type: "CNAME", name: "www", content: zoneName, proxied: true, ttl: 1 },
    ...auth,
  });
  if (created.ok) {
    console.log(`[cutover] created www CNAME`);
    return;
  }
  const aaaa = await cf(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: { type: "AAAA", name: "www", content: "100::", proxied: true, ttl: 1 },
    ...auth,
  });
  console.log(`[cutover] www AAAA ok=${aaaa.ok}`, JSON.stringify(aaaa.json?.errors || {}));
}

async function purgeNetlify(auth, zoneId, zoneName) {
  const r = await cf(`/zones/${zoneId}/dns_records?per_page=100`, auth);
  let n = 0;
  for (const rec of r.json?.result || []) {
    const content = String(rec.content || "").toLowerCase();
    if (!["A", "AAAA", "CNAME"].includes(rec.type)) continue;
    if (!(content.includes("netlify") || content.includes("ntl.") || content.includes("netlify.app"))) continue;
    await cf(`/zones/${zoneId}/dns_records/${rec.id}`, { method: "DELETE", ...auth });
    console.log(`[cutover] deleted Netlify ${rec.type} ${rec.name}`);
    n++;
  }
  console.log(`[cutover] ${zoneName}: purged ${n} Netlify records`);
}

async function ensureRoutes(auth, zoneId) {
  const patterns = ["yekpare.net/*", "yekpare.net", "www.yekpare.net/*", "www.yekpare.net"];
  const list = await cf(`/zones/${zoneId}/workers/routes`, auth);
  const have = new Set((list.json?.result || []).map((r) => r.pattern));
  for (const pattern of patterns) {
    if (have.has(pattern)) continue;
    const r = await cf(
      `/zones/${zoneId}/workers/routes`,
      { method: "POST", body: { pattern, script: SCRIPT }, ...auth },
    );
    console.log(`[cutover] route ${pattern} ok=${r.ok}`, JSON.stringify(r.json?.errors || {}));
  }
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

  const yekpare = await getZoneId(auth, "yekpare.net");
  if (yekpare) {
    await purgeNetlify(auth, yekpare, "yekpare.net");
    await ensureWwwDns(auth, yekpare, "yekpare.net");
    await ensureRoutes(auth, yekpare);
  } else {
    console.log("[cutover] yekpare.net zone not found");
  }

  // Custom hostnames on Worker (requires zone ownership)
  for (const host of ["www.yekpare.net", "yekpare.net", "ankarasehirgazetesi.com", "www.ankarasehirgazetesi.com", "turknet.app", "www.turknet.app"]) {
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
