/**
 * gundemi.org — Proxied A → Hostinger PHP origin (187.77.84.201).
 *
 * Fixes DNS_PROBE_FINISHED_NXDOMAIN for regional subdomains + apex/www.
 * Attaches apex Traefik-gap bridge routes (gundemi.org/*, www.gundemi.org/*)
 * → turkatahaber PHP. Does NOT attach `*.gundemi.org/*` (that forced SPA).
 * Regionals: orange cloud → origin Yenişafak PHP (Traefik HostRegexp required).
 * Removes leftover `*.gundemi.org/*` SPA catch-all if present.
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... node scripts/cf-ensure-gundemi-php-dns.mjs
 *   DRY_RUN=1 CLOUDFLARE_API_TOKEN=... node scripts/cf-ensure-gundemi-php-dns.mjs
 *
 * Catalog: hostinger/gundemi-bolge/config/sites.json
 * Docs:    hostinger/gundemi-bolge/DEPLOY.md
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "16f5b996194174624e7969a3658bd2bb";
const API = "https://api.cloudflare.com/client/v4";
const SCRIPT = "haberler";
const DRY_RUN = String(process.env.DRY_RUN || "").trim() === "1";

function loadCatalog() {
  const raw = JSON.parse(readFileSync(join(ROOT, "hostinger/gundemi-bolge/config/sites.json"), "utf8"));
  const zone = String(raw.zone || "gundemi.org").toLowerCase();
  const ip = String(raw.phpOriginIp || "187.77.84.201").trim();
  const regional = (raw.sites || []).map((s) => {
    const domain = String(s.domain || "").toLowerCase();
    const name = domain.endsWith(`.${zone}`) ? domain.slice(0, -(zone.length + 1)) : domain.split(".")[0];
    return { name, fqdn: domain || `${name}.${zone}`, serves: s.displayName || name };
  });
  return {
    zone,
    ip,
    records: [
      { name: "@", fqdn: zone, serves: "turkatahaber (apex alias / #391)" },
      { name: "www", fqdn: `www.${zone}`, serves: "turkatahaber → apex" },
      ...regional,
    ],
  };
}

function token() {
  return process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || "";
}

async function cf(path, { method = "GET", body } = {}) {
  const t = token();
  if (!t) throw new Error("CLOUDFLARE_API_TOKEN missing");
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${t}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.success !== false, status: res.status, json };
}

async function getZone(name) {
  const r = await cf(`/zones?name=${encodeURIComponent(name)}&account.id=${ACCOUNT_ID}`);
  return r.json?.result?.[0] || null;
}

async function listDns(zoneId, fqdn) {
  const r = await cf(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(fqdn)}&per_page=100`);
  return r.json?.result || [];
}

/**
 * Ensure a single Proxied A record. Removes conflicting A/AAAA/CNAME on the same name
 * when content/proxy differs (keeps unrelated TXT/MX/etc.).
 */
async function ensureProxiedA(zoneId, { name, fqdn, ip, serves }) {
  const records = await listDns(zoneId, fqdn);
  const addressRecords = records.filter((rec) => ["A", "AAAA", "CNAME"].includes(rec.type));
  const good = addressRecords.find(
    (rec) => rec.type === "A" && String(rec.content) === ip && rec.proxied === true,
  );
  if (good && addressRecords.length === 1) {
    console.log(`[gundemi-dns] ok A ${name} → ${ip} (proxied) — ${serves}`);
    return { action: "ok", fqdn, name, ip };
  }

  for (const rec of addressRecords) {
    if (good && rec.id === good.id) continue;
    const msg = `[gundemi-dns] delete conflicting ${rec.type} ${rec.name} → ${rec.content} proxied=${rec.proxied}`;
    if (DRY_RUN) {
      console.log(`[dry-run] ${msg}`);
    } else {
      const del = await cf(`/zones/${zoneId}/dns_records/${rec.id}`, { method: "DELETE" });
      console.log(msg, `ok=${del.ok}`, JSON.stringify(del.json?.errors || {}));
    }
  }

  if (good) {
    console.log(`[gundemi-dns] kept A ${name} → ${ip} (proxied) — ${serves}`);
    return { action: "kept", fqdn, name, ip };
  }

  const body = { type: "A", name, content: ip, proxied: true, ttl: 1 };
  if (DRY_RUN) {
    console.log(`[dry-run] create A ${name} → ${ip} (proxied) — ${serves}`);
    return { action: "would-create", fqdn, name, ip };
  }
  const created = await cf(`/zones/${zoneId}/dns_records`, { method: "POST", body });
  console.log(
    `[gundemi-dns] create A ${name} → ${ip} (proxied) ok=${created.ok} — ${serves}`,
    JSON.stringify(created.json?.errors || created.json?.result?.id || {}),
  );
  if (!created.ok) {
    const err = created.json?.errors?.[0] || {};
    return {
      action: "error",
      fqdn,
      name,
      ip,
      code: err.code,
      message: err.message || `HTTP ${created.status}`,
    };
  }
  return { action: "created", fqdn, name, ip };
}

/** Panel/API + temporary Traefik-gap catch-alls (see gundemi-origin-bridge.js). */
const PANEL_ROUTE_PATTERNS = [
  "*.gundemi.org/editor*",
  "*.gundemi.org/api/*",
  "*.gundemi.org/admin*",
  "*.gundemi.org/panel*",
  "*.gundemi.org/haber-merkezi*",
  // KEEP broad assets/* — editor lazy chunks are not only index-*/vendor-*.
  // theme.css/js on this route are bridged in gundemi-origin-bridge.js (not 503 gap).
  "*.gundemi.org/assets/*",
  "*.gundemi.org/gundemi/logos/*",
  "*.gundemi.org/sw.js",
  "*.gundemi.org/llms.txt",
  "*.gundemi.org/ai.txt",
  "*.gundemi.org/manifest.json",
  "*.gundemi.org/yazar/giris*",
  "*.gundemi.org/koseyazari/giris*",
  "*.gundemi.org/yazar/sifre*",
  "*.gundemi.org/koseyazari/sifre*",
  "*.gundemi.org/yazar/haber*",
  "*.gundemi.org/koseyazari/haber*",
  "*.gundemi.org/tr/*",
  "*.gundemi.org/hm/*",
  "gundemi.org/editor*",
  "gundemi.org/api/*",
  "gundemi.org/admin*",
  "gundemi.org/panel*",
  "gundemi.org/haber-merkezi*",
  "gundemi.org/assets/*",
  "gundemi.org/tr/*",
  "gundemi.org/hm/*",
  "www.gundemi.org/editor*",
  "www.gundemi.org/api/*",
  "www.gundemi.org/tr/*",
  "www.gundemi.org/hm/*",
  // Apex Traefik-gap bridge only — never *.gundemi.org/* (SPA)
  "gundemi.org/*",
  "www.gundemi.org/*",
];

/** Legacy SPA catch-all — delete so regionals hit origin PHP. */
const REMOVE_SPA_CATCHALL_PATTERNS = Object.freeze(["*.gundemi.org/*"]);

async function ensurePanelRoutes(zoneId) {
  const list = await cf(`/zones/${zoneId}/workers/routes`);
  const existing = list.json?.result || [];
  const byPattern = new Map(existing.map((r) => [r.pattern, r]));

  for (const pattern of REMOVE_SPA_CATCHALL_PATTERNS) {
    const row = byPattern.get(pattern);
    if (!row?.id) continue;
    if (DRY_RUN) {
      console.log(`[dry-run] DELETE workers route ${pattern}`);
      continue;
    }
    const del = await cf(`/zones/${zoneId}/workers/routes/${row.id}`, { method: "DELETE" });
    if (del.ok) {
      console.log(`removed SPA catch-all ${pattern}`);
      byPattern.delete(pattern);
    } else {
      console.warn(`failed to remove ${pattern}:`, del.json?.errors?.[0]?.message || del.status);
    }
  }

  let created = 0;
  let ok = 0;
  for (const pattern of PANEL_ROUTE_PATTERNS) {
    const row = byPattern.get(pattern);
    if (row?.script === SCRIPT) {
      ok += 1;
      continue;
    }
    if (row?.id) {
      if (DRY_RUN) {
        console.log(`[dry-run] rebind ${pattern} → ${SCRIPT}`);
        continue;
      }
      const r = await cf(`/zones/${zoneId}/workers/routes/${row.id}`, {
        method: "PUT",
        body: { pattern, script: SCRIPT },
      });
      console.log(`[gundemi-dns] rebind ${pattern} ok=${r.ok}`, JSON.stringify(r.json?.errors || {}));
      if (r.ok) created += 1;
      continue;
    }
    if (DRY_RUN) {
      console.log(`[dry-run] create route ${pattern} → ${SCRIPT}`);
      continue;
    }
    const r = await cf(`/zones/${zoneId}/workers/routes`, {
      method: "POST",
      body: { pattern, script: SCRIPT },
    });
    console.log(`[gundemi-dns] route ${pattern} ok=${r.ok}`, JSON.stringify(r.json?.errors || {}));
    if (r.ok) created += 1;
  }
  console.log(`[gundemi-dns] panel routes: ${ok} already bound, ${created} created/rebound`);
}

async function publicDnsProbe(fqdn) {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(fqdn)}&type=A`,
      { headers: { accept: "application/dns-json" } },
    );
    const json = await res.json().catch(() => ({}));
    return (json.Answer || []).map((a) => a.data).filter(Boolean);
  } catch (e) {
    return [`err:${e?.message || e}`];
  }
}

async function main() {
  const catalog = loadCatalog();
  console.log(`[gundemi-dns] zone=${catalog.zone} origin=${catalog.ip} records=${catalog.records.length} dryRun=${DRY_RUN}`);

  if (!token()) {
    console.error("[gundemi-dns] CLOUDFLARE_API_TOKEN missing — cannot create DNS via API.");
    console.error("[gundemi-dns] Dashboard steps: hostinger/gundemi-bolge/DEPLOY.md");
    process.exitCode = 2;
    return;
  }

  const zone = await getZone(catalog.zone);
  if (!zone?.id) {
    console.error(`[gundemi-dns] zone ${catalog.zone} not found in account ${ACCOUNT_ID}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[gundemi-dns] zone id=${zone.id} status=${zone.status}`);

  const results = [];
  for (const rec of catalog.records) {
    results.push(await ensureProxiedA(zone.id, { ...rec, ip: catalog.ip }));
  }

  try {
    await ensurePanelRoutes(zone.id);
  } catch (e) {
    console.warn("[gundemi-dns] panel routes skipped:", e?.message || e);
  }

  console.log("\n[gundemi-dns] DoH probe (may lag a few minutes after create):");
  for (const rec of catalog.records) {
    const answers = await publicDnsProbe(rec.fqdn);
    console.log(`  ${rec.fqdn}: ${answers.join(" ") || "(empty / NXDOMAIN)"}`);
  }

  const created = results.filter((r) => r.action === "created" || r.action === "would-create").length;
  const ok = results.filter((r) => r.action === "ok" || r.action === "kept").length;
  const errors = results.filter((r) => r.action === "error");
  console.log(`\n[gundemi-dns] done: ${ok} ok, ${created} created/planned, ${errors.length} errors, total ${results.length}`);

  if (errors.length) {
    const auth = errors.some((e) => e.code === 10000 || /Authentication/i.test(String(e.message)));
    if (auth) {
      console.error(
        "[gundemi-dns] CLOUDFLARE_API_TOKEN can read the zone but cannot create DNS (code 10000).",
      );
      console.error(
        "[gundemi-dns] Fix: Cloudflare → My Profile → API Tokens → edit token →",
      );
      console.error(
        "  Permissions: Zone → DNS → Edit (+ Zone → Workers Routes → Edit).",
      );
      console.error(
        "  Zone Resources: Include → Specific zone → gundemi.org (or All zones).",
      );
      console.error(
        "[gundemi-dns] Or add the 10 Proxied A records in Dashboard — see hostinger/gundemi-bolge/DEPLOY.md",
      );
    }
    for (const e of errors) {
      console.error(`  FAIL ${e.name}: ${e.code || ""} ${e.message}`);
    }
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("[gundemi-dns] fatal", e);
  process.exitCode = 1;
});
