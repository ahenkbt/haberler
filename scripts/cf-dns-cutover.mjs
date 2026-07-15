/**
 * Workers Builds deploy sonrası: yekpare DNS'ten Netlify izlerini temizle, www ekle,
 * mümkünse Netlify NS'li domainler için Cloudflare zone oluştur.
 * Token: CLOUDFLARE_API_TOKEN (Workers Builds inject) veya wrangler config.
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "16f5b996194174624e7969a3658bd2bb";
const API = "https://api.cloudflare.com/client/v4";

function loadToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  if (process.env.CF_API_TOKEN) return process.env.CF_API_TOKEN;
  const candidates = [
    join(homedir(), ".wrangler", "config", "default.toml"),
    join(homedir(), ".config", ".wrangler", "config", "default.toml"),
    "/opt/buildhome/.config/.wrangler/config/default.toml",
    "/opt/buildhome/.wrangler/config/default.toml",
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    const m =
      text.match(/oauth_token\s*=\s*"([^"]+)"/) ||
      text.match(/api_token\s*=\s*"([^"]+)"/) ||
      text.match(/CLOUDFLARE_API_TOKEN\s*=\s*"([^"]+)"/);
    if (m?.[1]) return m[1];
  }
  return "";
}

async function cf(path, { method = "GET", body } = {}, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.success !== false, status: res.status, json };
}

async function getZoneId(token, name) {
  const r = await cf(`/zones?name=${encodeURIComponent(name)}&account.id=${ACCOUNT_ID}`, {}, token);
  return r.json?.result?.[0]?.id || null;
}

async function purgeNetlifyRecords(token, zoneId, zoneName) {
  const r = await cf(`/zones/${zoneId}/dns_records?per_page=100`, {}, token);
  const records = r.json?.result || [];
  let deleted = 0;
  for (const rec of records) {
    const content = String(rec.content || "").toLowerCase();
    const name = String(rec.name || "").toLowerCase();
    const isNetlify =
      content.includes("netlify") ||
      content.includes("nsone.net") ||
      name.includes("netlify") ||
      (rec.type === "CNAME" && content.includes("ntl."));
    if (!isNetlify) continue;
    // Keep MX/TXT mail; only kill host / www / alias pointing at Netlify
    if (!["A", "AAAA", "CNAME"].includes(rec.type)) continue;
    console.log(`[cutover] delete ${rec.type} ${rec.name} → ${rec.content}`);
    await cf(`/zones/${zoneId}/dns_records/${rec.id}`, { method: "DELETE" }, token);
    deleted++;
  }
  console.log(`[cutover] ${zoneName}: removed ${deleted} Netlify DNS record(s)`);
}

async function ensureWww(token, zoneId, zoneName) {
  // Proxied CNAME www → apex (Worker routes catch it) OR AAAA 100::
  const list = await cf(`/zones/${zoneId}/dns_records?name=www.${zoneName}`, {}, token);
  const existing = list.json?.result || [];
  if (existing.length) {
    console.log(`[cutover] www.${zoneName} already has DNS`);
    return;
  }
  const body = {
    type: "CNAME",
    name: "www",
    content: zoneName,
    proxied: true,
    ttl: 1,
  };
  const created = await cf(`/zones/${zoneId}/dns_records`, { method: "POST", body }, token);
  if (created.ok) {
    console.log(`[cutover] created proxied CNAME www.${zoneName} → ${zoneName}`);
  } else {
    // fallback originless A record for Worker/custom domain
    const a = await cf(
      `/zones/${zoneId}/dns_records`,
      { method: "POST", body: { type: "AAAA", name: "www", content: "100::", proxied: true, ttl: 1 } },
      token,
    );
    console.log(`[cutover] www AAAA fallback ok=${a.ok}`, JSON.stringify(a.json?.errors || []));
  }
}

async function ensureWorkerRoute(token, zoneId, pattern, script = "haberler") {
  const list = await cf(`/zones/${zoneId}/workers/routes`, {}, token);
  const routes = list.json?.result || [];
  if (routes.some((r) => r.pattern === pattern)) {
    console.log(`[cutover] route exists ${pattern}`);
    return;
  }
  const r = await cf(
    `/zones/${zoneId}/workers/routes`,
    { method: "POST", body: { pattern, script } },
    token,
  );
  console.log(`[cutover] route ${pattern} ok=${r.ok}`, JSON.stringify(r.json?.errors || r.json?.result || {}));
}

async function tryCreateZone(token, name) {
  const existing = await getZoneId(token, name);
  if (existing) {
    console.log(`[cutover] zone already exists ${name} ${existing}`);
    return existing;
  }
  const r = await cf(
    `/zones`,
    {
      method: "POST",
      body: { name, account: { id: ACCOUNT_ID }, type: "full", jump_start: true },
    },
    token,
  );
  if (r.ok) {
    const id = r.json.result?.id;
    const ns = r.json.result?.name_servers || [];
    console.log(`[cutover] created zone ${name} id=${id} ns=${ns.join(",")}`);
    return id;
  }
  console.log(`[cutover] zone create ${name} failed`, JSON.stringify(r.json?.errors || r.json));
  return null;
}

async function main() {
  const token = loadToken();
  if (!token) {
    console.warn("[cutover] no Cloudflare API token in env/config — skip DNS cutover");
    return;
  }
  console.log("[cutover] token found, running DNS cutover…");

  for (const zoneName of ["yekpare.net", "goalgo.org", "aiaddin.net"]) {
    const zoneId = await getZoneId(token, zoneName);
    if (!zoneId) {
      console.log(`[cutover] zone not in account: ${zoneName}`);
      continue;
    }
    await purgeNetlifyRecords(token, zoneId, zoneName);
    if (zoneName === "yekpare.net") {
      await ensureWww(token, zoneId, zoneName);
      await ensureWorkerRoute(token, zoneId, "yekpare.net/*");
      await ensureWorkerRoute(token, zoneId, "www.yekpare.net/*");
      await ensureWorkerRoute(token, zoneId, "yekpare.net");
      await ensureWorkerRoute(token, zoneId, "www.yekpare.net");
    }
  }

  // Netlify NS domains — zone create (pending until NS update at registrar)
  for (const pending of ["ankarasehirgazetesi.com", "turknet.app"]) {
    await tryCreateZone(token, pending);
  }
}

main().catch((e) => {
  console.warn("[cutover] error", e);
  process.exit(0);
});
