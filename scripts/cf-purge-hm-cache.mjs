/**
 * HM alanları için Cloudflare zone cache purge.
 * Kullanım: CLOUDFLARE_API_TOKEN=... node scripts/cf-purge-hm-cache.mjs
 */
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "16f5b996194174624e7969a3658bd2bb";
const API = "https://api.cloudflare.com/client/v4";

const ZONES = [
  "ankarahabergundemi.com",
  "ankarasehirgazetesi.com",
  "vatankahramanlari.org",
  "vatanhaber.net",
  "yekpare.net",
];

function token() {
  return (
    process.env.CLOUDFLARE_API_TOKEN ||
    process.env.CF_API_TOKEN ||
    process.env.CLOUDFLARE_API_KEY ||
    ""
  );
}

async function cf(path, { method = "GET", body } = {}) {
  const t = token();
  if (!t) throw new Error("CLOUDFLARE_API_TOKEN missing");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${t}`,
  };
  if (process.env.CLOUDFLARE_EMAIL && process.env.CLOUDFLARE_API_KEY) {
    headers["X-Auth-Email"] = process.env.CLOUDFLARE_EMAIL;
    headers["X-Auth-Key"] = process.env.CLOUDFLARE_API_KEY;
    delete headers.Authorization;
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.success !== false, status: res.status, json };
}

async function purgeZone(name) {
  const list = await cf(`/zones?name=${encodeURIComponent(name)}&account.id=${ACCOUNT_ID}`);
  const zone = list.json?.result?.[0];
  if (!zone?.id) {
    console.log(`[purge] zone NOT FOUND: ${name}`);
    return false;
  }
  const r = await cf(`/zones/${zone.id}/purge_cache`, {
    method: "POST",
    body: { purge_everything: true },
  });
  console.log(`[purge] ${name} (${zone.id}) ok=${r.ok}`, JSON.stringify(r.json?.errors || r.json?.result || {}));
  return r.ok;
}

async function main() {
  if (!token()) {
    console.warn("[purge] NO TOKEN — skipping CF API purge (Worker force-purge still deploys).");
    process.exitCode = 0;
    return;
  }
  let ok = 0;
  for (const z of ZONES) {
    if (await purgeZone(z)) ok += 1;
  }
  console.log(`[purge] done ok=${ok}/${ZONES.length}`);
}

main().catch((e) => {
  console.warn("[purge] fatal", e);
  process.exitCode = 1;
});
