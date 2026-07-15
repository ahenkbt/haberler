/**
 * Error 1016 / Netlify 404 / 522: Worker route rebind + originless DNS + script upload.
 *
 * CLOUDFLARE_API_TOKEN=... node scripts/cf-fix-originless-dns.mjs
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "16f5b996194174624e7969a3658bd2bb";
const API = "https://api.cloudflare.com/client/v4";
const SCRIPT = "haberler";

const ZONES = [
  "yekpare.net",
  "ankarasehirgazetesi.com",
  "ankarahabergundemi.com",
  "vatankahramanlari.org",
  "vatanhaber.net",
];

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

function isNetlifyOrigin(content) {
  const c = String(content || "").toLowerCase();
  return c.includes("netlify") || c.includes("ntl.") || c.includes("netlifyglobalcdn");
}

function isWorkerDnsRecord(rec) {
  const content = String(rec.content || "").trim().toLowerCase();
  const type = String(rec.type || "").toLowerCase();
  return type === "worker" || content === SCRIPT || content === `${SCRIPT}.workers.dev`;
}

async function purgeNetlifyDns(zoneId, fqdn) {
  const list = await cf(
    `/zones/${zoneId}/dns_records?name=${encodeURIComponent(fqdn)}&per_page=100`,
  );
  for (const rec of list.json?.result || []) {
    if (isNetlifyOrigin(rec.content)) {
      await cf(`/zones/${zoneId}/dns_records/${rec.id}`, { method: "DELETE" });
      console.log(`[fix] deleted netlify ${rec.type} ${rec.name} → ${rec.content}`);
    }
  }
}

async function ensureOriginlessDns(zoneId, zoneName, name, fqdn) {
  await purgeNetlifyDns(zoneId, fqdn);

  const list = await cf(
    `/zones/${zoneId}/dns_records?name=${encodeURIComponent(fqdn)}&per_page=100`,
  );
  const records = list.json?.result || [];

  if (records.some(isWorkerDnsRecord)) {
    console.log(`[fix] worker dns record ok ${fqdn}`);
    return;
  }

  for (const rec of records) {
    if (!["A", "AAAA", "CNAME"].includes(rec.type)) continue;
    if (rec.type === "AAAA" && String(rec.content).toLowerCase() === "100::") {
      if (!rec.proxied) {
        await cf(`/zones/${zoneId}/dns_records/${rec.id}`, {
          method: "PATCH",
          body: { proxied: true },
        });
      }
      console.log(`[fix] already AAAA 100:: ${fqdn}`);
      return;
    }
    if (rec.type === "A" && String(rec.content) === "192.0.2.1" && rec.proxied) {
      console.log(`[fix] already A 192.0.2.1 proxied ${fqdn}`);
      return;
    }
    if (rec.proxied && !isNetlifyOrigin(rec.content)) {
      console.log(`[fix] keep ${rec.type} ${fqdn} → ${rec.content}`);
      return;
    }
  }

  const aaaa = await cf(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: { type: "AAAA", name, content: "100::", proxied: true, ttl: 1 },
  });
  if (aaaa.ok) {
    console.log(`[fix] create AAAA 100:: ${fqdn}`);
    return;
  }
  const a = await cf(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: { type: "A", name, content: "192.0.2.1", proxied: true, ttl: 1 },
  });
  console.log(
    `[fix] create A 192.0.2.1 ${fqdn} ok=${a.ok}`,
    JSON.stringify(a.json?.errors || aaaa.json?.errors || {}),
  );
}

async function ensureRoutes(zoneId, zoneName) {
  const list = await cf(`/zones/${zoneId}/workers/routes`);
  const existing = list.json?.result || [];
  const byPattern = new Map(existing.map((r) => [r.pattern, r]));
  for (const pattern of [`${zoneName}/*`, zoneName, `www.${zoneName}/*`, `www.${zoneName}`]) {
    const row = byPattern.get(pattern);
    if (row?.id) {
      const r = await cf(`/zones/${zoneId}/workers/routes/${row.id}`, {
        method: "PUT",
        body: { pattern, script: SCRIPT },
      });
      if (r.ok) {
        console.log(
          `[fix] rebind ${pattern} → ${SCRIPT} (was:${row.script || "∅"}) ok=true`,
        );
        continue;
      }
      console.log(
        `[fix] rebind ${pattern} failed, recreate`,
        JSON.stringify(r.json?.errors || {}),
      );
      await cf(`/zones/${zoneId}/workers/routes/${row.id}`, { method: "DELETE" });
    }
    const r = await cf(`/zones/${zoneId}/workers/routes`, {
      method: "POST",
      body: { pattern, script: SCRIPT },
    });
    console.log(`[fix] route ${pattern} ok=${r.ok}`, JSON.stringify(r.json?.errors || {}));
  }
}

async function attachCustomDomain(hostname) {
  const r = await cf(`/accounts/${ACCOUNT_ID}/workers/domains`, {
    method: "PUT",
    body: { hostname, service: SCRIPT, environment: "production" },
  });
  const err = r.json?.errors?.[0];
  if (!r.ok && err?.code === 100117) {
    console.log(`[fix] workers/domains ${hostname} skip (external DNS; zone routes)`);
    return true;
  }
  console.log(
    `[fix] workers/domains ${hostname} ok=${r.ok}`,
    JSON.stringify(r.json?.errors || r.json?.result || {}),
  );
  return r.ok;
}

async function createZoneIfMissing(name) {
  const existing = await getZone(name);
  if (existing) return existing;
  const r = await cf(`/zones`, {
    method: "POST",
    body: { name, account: { id: ACCOUNT_ID }, jump_start: true, type: "full" },
  });
  console.log(
    `[fix] create zone ${name} ok=${r.ok}`,
    JSON.stringify({ errors: r.json?.errors, ns: r.json?.result?.name_servers, id: r.json?.result?.id }),
  );
  return r.json?.result || null;
}

async function publicDnsProbe(fqdn) {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(fqdn)}&type=A`,
      { headers: { accept: "application/dns-json" } },
    );
    const json = await res.json().catch(() => ({}));
    const answers = (json.Answer || []).map((a) => a.data).filter(Boolean);
    return answers;
  } catch (e) {
    return { err: String(e?.message || e) };
  }
}

async function probeWorkerLive(hostname) {
  try {
    const res = await fetch(`https://${hostname}/`, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const viaWorker =
      res.headers.get("x-yekpare-frontend") === "cloudflare-render-proxy" ||
      res.headers.get("x-yekpare-upstream") != null;
    const viaNetlify = res.headers.get("x-nf-request-id") != null;
    const cfChallenge =
      res.status === 403 &&
      (res.headers.get("cf-mitigated") === "challenge" ||
        String(res.headers.get("content-security-policy") || "").includes("challenges.cloudflare.com"));
    return {
      status: res.status,
      viaWorker,
      viaNetlify,
      cfChallenge,
      cfMitigated: res.headers.get("cf-mitigated") || null,
    };
  } catch (e) {
    return { status: 0, err: String(e?.message || e) };
  }
}

/** yekpare.net "Just a moment..." — Bot Fight / under_attack Worker'a hiç ulaşmıyor. */
async function relaxZoneSecurity(zoneId, zoneName) {
  const settings = [
    ["bot_fight_mode", "off"],
    ["security_level", "essentially_off"],
    ["browser_check", "off"],
    ["challenge_ttl", 1800],
    // Bozuk IPv6 / QUIC → Chrome ERR_FAILED; AAAA reklamını kapatmayı dene
    ["ipv6", "off"],
    ["http3", "off"],
    ["0rtt_enabled", "off"],
  ];
  for (const [setting, value] of settings) {
    const r = await cf(`/zones/${zoneId}/settings/${setting}`, {
      method: "PATCH",
      body: { value },
    });
    console.log(
      `[fix] ${zoneName} setting ${setting}=${JSON.stringify(value)} ok=${r.ok}`,
      JSON.stringify(r.json?.errors || r.json?.result?.value || {}),
    );
  }

  // Super Bot Fight Mode (ücretli hesaplarda) — varsa kapat
  const sbm = await cf(`/zones/${zoneId}/bot_management`, {
    method: "PUT",
    body: {
      fight_mode: false,
      sbfm_definitely_automated: "allow",
      sbfm_likely_automated: "allow",
      sbfm_verified_bots: "allow",
      optimize_wordpress: false,
      suppress_session_score: false,
    },
  });
  console.log(
    `[fix] ${zoneName} bot_management ok=${sbm.ok}`,
    JSON.stringify(sbm.json?.errors || sbm.json?.success || {}),
  );
}

async function fixZone(name) {
  console.log(`\n===== ${name} =====`);
  let zone = await getZone(name);
  if (!zone) zone = await createZoneIfMissing(name);
  if (!zone?.id) {
    console.log(`[fix] SKIP — zone not in account ${ACCOUNT_ID}`);
    return false;
  }
  console.log(`[fix] zone id=${zone.id} status=${zone.status}`);
  await ensureOriginlessDns(zone.id, name, "@", name);
  await ensureOriginlessDns(zone.id, name, "www", `www.${name}`);
  await ensureRoutes(zone.id, name);
  await attachCustomDomain(name);
  await attachCustomDomain(`www.${name}`);
  // Önce güvenlik gevşet — Challenge açıkken Worker probe hep 403 döner.
  await relaxZoneSecurity(zone.id, name);

  const dnsList = await cf(`/zones/${zone.id}/dns_records?per_page=100`);
  const dnsRows = (dnsList.json?.result || []).filter((r) =>
    ["A", "AAAA", "CNAME", "Worker"].includes(r.type),
  );
  console.log(
    `[fix] dns summary`,
    dnsRows.map((r) => `${r.type} ${r.name}→${r.content} proxied=${r.proxied}`).join(" | ") || "(empty)",
  );

  for (const fqdn of [name, `www.${name}`]) {
    const answers = await publicDnsProbe(fqdn);
    console.log(`[fix] public dig ${fqdn}:`, Array.isArray(answers) && answers.length ? answers.join(", ") : "NO A");
  }

  const live = await probeWorkerLive(name);
  console.log(`[fix] live probe ${name}:`, JSON.stringify(live));
  if (live.cfChallenge) {
    console.warn(
      `[fix] WARN ${name} Cloudflare Challenge — GitHub token Zone Settings yetkisi yoksa Dashboard'dan kapatın:\n` +
        `  Security → Settings → Bot Fight Mode = Off\n` +
        `  Security → Settings → Security Level = Essentially Off / Medium\n` +
        `  Under Attack Mode = Off\n` +
        `Token'a ekleyin: Zone Settings Write, Zone WAF Write, Zone DNS Edit`,
    );
  }
  if (live.viaNetlify) {
    console.warn(`[fix] WARN ${name} still hitting Netlify — route/DNS rebind may need 1–2 min`);
  }

  const purge = await cf(`/zones/${zone.id}/purge_cache`, {
    method: "POST",
    body: { purge_everything: true },
  });
  console.log(`[fix] purge ok=${purge.ok}`);
  return true;
}

async function uploadWorkerScriptViaApi() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const { readFileSync, existsSync } = await import("node:fs");
  const workerPath = join(root, "cloudflare", "worker.js");
  if (!existsSync(workerPath)) {
    console.log("[fix] worker.js missing", workerPath);
    return false;
  }
  const source = readFileSync(workerPath);
  const metadata = {
    main_module: "worker.js",
    compatibility_date: "2025-07-15",
    compatibility_flags: ["nodejs_compat"],
    bindings: [
      {
        type: "plain_text",
        name: "API_ORIGIN",
        text: process.env.API_ORIGIN || "https://goalgo-y7ze.onrender.com",
      },
    ],
  };
  const form = new FormData();
  form.set("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.set("worker.js", new Blob([source], { type: "application/javascript+module" }), "worker.js");

  const t = token();
  if (!t) {
    console.log("[fix] worker upload skip — no token");
    return false;
  }
  console.log("\n[fix] Workers API upload script", SCRIPT, `(${source.length} bytes)`);
  const res = await fetch(`${API}/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${t}` },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  const ok = res.ok && json.success !== false;
  console.log(`[fix] worker upload ok=${ok} status=${res.status}`, JSON.stringify(json?.errors || json?.result?.id || {}));
  return ok;
}

async function tryWranglerDeploy() {
  if (await uploadWorkerScriptViaApi()) return true;

  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const { existsSync } = await import("node:fs");
  const candidates = [];
  try {
    const require = createRequire(join(root, "tooling/wrangler-shim/package.json"));
    const upstreamPkg = dirname(require.resolve("wrangler-upstream/package.json"));
    candidates.push(join(upstreamPkg, "bin", "wrangler.js"));
  } catch {
    /* ignore */
  }
  const resolved = candidates.find((p) => existsSync(p));
  if (!resolved) {
    console.log("[fix] wrangler deploy skip — binary not found");
    return false;
  }
  console.log("\n[fix] wrangler deploy fallback...", resolved);
  const r = spawnSync(process.execPath, [resolved, "deploy"], {
    stdio: "inherit",
    env: { ...process.env, WRANGLER_SEND_METRICS: "false", CF_SKIP_POST_DEPLOY: "1" },
    cwd: root,
  });
  console.log("[fix] wrangler deploy status", r.status);
  return (r.status ?? 1) === 0;
}

async function main() {
  if (!token()) {
    console.warn("[fix] NO CLOUDFLARE_API_TOKEN — cannot fix DNS/routes via API.");
    await tryWranglerDeploy();
    return;
  }
  let ok = 0;
  for (const z of ZONES) {
    if (await fixZone(z)) ok += 1;
  }
  console.log(`\n[fix] zones fixed: ${ok}/${ZONES.length}`);
  const deployed = await tryWranglerDeploy();
  if (!deployed) {
    console.error("[fix] FATAL: Worker script deploy failed");
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("[fix] fatal", e);
  process.exitCode = 1;
});
