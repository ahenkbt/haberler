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

/**
 * Originless Worker DNS — proxied AAAA 100:: (IPv6 discard).
 * Error 1016 = Cloudflare zone var ama çözümleyen A/AAAA/CNAME yok.
 */
async function ensureOriginlessDns(auth, zoneId, zoneName) {
  const targets = [
    { name: "@", fqdn: zoneName },
    { name: "www", fqdn: `www.${zoneName}` },
  ];
  for (const { name, fqdn } of targets) {
    const list = await cf(
      `/zones/${zoneId}/dns_records?name=${encodeURIComponent(fqdn)}&per_page=100`,
      auth,
    );
    const records = list.json?.result || [];
    let hasProxied = false;
    for (const rec of records) {
      if (!["A", "AAAA", "CNAME"].includes(rec.type)) continue;
      const content = String(rec.content || "").toLowerCase();
      const broken =
        content.includes("netlify") ||
        content.includes("ntl.") ||
        content.includes("invalid") ||
        content.includes("park");
      if (broken) {
        await cf(`/zones/${zoneId}/dns_records/${rec.id}`, { method: "DELETE", ...auth });
        console.log(`[cutover] deleted broken ${rec.type} ${rec.name} → ${rec.content}`);
        continue;
      }
      if (!rec.proxied) {
        await cf(
          `/zones/${zoneId}/dns_records/${rec.id}`,
          { method: "PATCH", body: { proxied: true }, ...auth },
        );
        console.log(`[cutover] proxied ${rec.type} ${rec.name}`);
      }
      hasProxied = true;
    }
    if (hasProxied) {
      console.log(`[cutover] DNS ok ${fqdn}`);
      continue;
    }
    const created = await cf(`/zones/${zoneId}/dns_records`, {
      method: "POST",
      body: { type: "AAAA", name, content: "100::", proxied: true, ttl: 1 },
      ...auth,
    });
    console.log(
      `[cutover] AAAA 100:: ${fqdn} ok=${created.ok}`,
      JSON.stringify(created.json?.errors || { id: created.json?.result?.id }),
    );
  }
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

async function ensureRoutes(auth, zoneId, zoneName) {
  const patterns = [`${zoneName}/*`, zoneName, `www.${zoneName}/*`, `www.${zoneName}`];
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

async function purgeZoneCache(auth, zoneId, zoneName) {
  const everything = await cf(`/zones/${zoneId}/purge_cache`, {
    method: "POST",
    body: { purge_everything: true },
    ...auth,
  });
  console.log(
    `[cutover] purge_everything ${zoneName} ok=${everything.ok}`,
    JSON.stringify(everything.json?.errors || everything.json?.result || {}),
  );

  const urls = [];
  for (const host of [zoneName, `www.${zoneName}`]) {
    for (const path of ["/", "/sw.js", "/index.html", "/tr"]) {
      urls.push(`https://${host}${path}`);
    }
  }
  const r = await cf(`/zones/${zoneId}/purge_cache`, {
    method: "POST",
    body: { files: urls },
    ...auth,
  });
  console.log(
    `[cutover] purge_files ${zoneName} count=${urls.length} ok=${r.ok}`,
    JSON.stringify(r.json?.errors || r.json?.result || {}),
  );
}

async function cutoverZone(auth, zoneName) {
  const zoneId = await getZoneId(auth, zoneName);
  if (!zoneId) {
    console.log(`[cutover] zone not found: ${zoneName}`);
    return false;
  }
  console.log(`[cutover] zone ${zoneName}=${zoneId}`);
  await purgeNetlify(auth, zoneId, zoneName);
  await ensureOriginlessDns(auth, zoneId, zoneName);
  await ensureRoutes(auth, zoneId, zoneName);
  await attachWorkerHostname(auth, zoneName);
  await attachWorkerHostname(auth, `www.${zoneName}`);
  await purgeZoneCache(auth, zoneId, zoneName);
  return true;
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

  // Portal + Cloudflare zone'u olan HM editör siteleri
  const zones = [
    "yekpare.net",
    "ankarahabergundemi.com",
    "turk.eco",
    // Önbellek temizliği talep edilen HM alanları (zone varsa purge)
    "vatanhaber.net",
    "vatankahramanlari.org",
    "ankarasehirgazetesi.com",
  ];
  for (const name of zones) {
    await cutoverZone(auth, name);
  }

  // Extra hostnames (Netlify NS / pending)
  for (const host of [
    "ankarasehirgazetesi.com",
    "www.ankarasehirgazetesi.com",
    "turknet.app",
    "www.turknet.app",
    "vatankahramanlari.org",
    "www.vatankahramanlari.org",
    "tukav.org",
    "www.tukav.org",
    "suhaberajansi.com",
    "www.suhaberajansi.com",
    "vatanhaber.net",
    "www.vatanhaber.net",
    "ankarahabergundemi.com",
    "www.ankarahabergundemi.com",
  ]) {
    await attachWorkerHostname(auth, host);
  }

  // Try create pending zones for Netlify NS / broken DNS domains
  for (const name of [
    "ankarasehirgazetesi.com",
    "turknet.app",
    "vatankahramanlari.org",
    "tukav.org",
    "suhaberajansi.com",
    "vatanhaber.net",
  ]) {
    const id = await getZoneId(auth, name);
    if (id) {
      console.log(`[cutover] zone exists ${name}=${id}`);
      await cutoverZone(auth, name);
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
