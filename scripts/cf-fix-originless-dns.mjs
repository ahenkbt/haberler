/**
 * Error 1016 / ERR_FAILED: Cloudflare zone var, origin DNS yok.
 * Proxied AAAA 100:: + Worker route/custom domain.
 *
 * CLOUDFLARE_API_TOKEN=... node scripts/cf-fix-originless-dns.mjs
 * trigger: edge RSS fill + public dig DNS probe 2026-07-15T19:30Z
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

async function ensureAaaa100(zoneId, zoneName, name, fqdn) {
  const list = await cf(
    `/zones/${zoneId}/dns_records?name=${encodeURIComponent(fqdn)}&per_page=100`,
  );
  const records = list.json?.result || [];
  for (const rec of records) {
    if (!["A", "AAAA", "CNAME"].includes(rec.type)) continue;
    const content = String(rec.content || "").toLowerCase();
    if (content.includes("netlify") || content.includes("ntl.")) {
      await cf(`/zones/${zoneId}/dns_records/${rec.id}`, { method: "DELETE" });
      console.log(`[fix] deleted ${rec.type} ${rec.name}`);
      continue;
    }
    if (rec.type === "AAAA" && content === "100::") {
      if (!rec.proxied) {
        await cf(`/zones/${zoneId}/dns_records/${rec.id}`, {
          method: "PATCH",
          body: { proxied: true },
        });
      }
      console.log(`[fix] already AAAA 100:: ${fqdn}`);
      return;
    }
    if (rec.proxied) {
      console.log(`[fix] keep ${rec.type} ${fqdn} → ${rec.content}`);
      return;
    }
  }
  const created = await cf(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: { type: "AAAA", name, content: "100::", proxied: true, ttl: 1 },
  });
  console.log(`[fix] create AAAA 100:: ${fqdn} ok=${created.ok}`, JSON.stringify(created.json?.errors || {}));
}

async function ensureRoutes(zoneId, zoneName) {
  const list = await cf(`/zones/${zoneId}/workers/routes`);
  const existing = list.json?.result || [];
  const byPattern = new Map(existing.map((r) => [r.pattern, r]));
  for (const pattern of [`${zoneName}/*`, zoneName, `www.${zoneName}/*`, `www.${zoneName}`]) {
    const row = byPattern.get(pattern);
    if (row?.id) {
      // Her zaman PUT — script “haberler” görünse bile binding flake’i 522/Netlify404 yapıyor
      const r = await cf(`/zones/${zoneId}/workers/routes/${row.id}`, {
        method: "PUT",
        body: { pattern, script: SCRIPT },
      });
      console.log(
        `[fix] rebind ${pattern} → ${SCRIPT} (was:${row.script || "∅"}) ok=${r.ok}`,
        JSON.stringify(r.json?.errors || {}),
      );
      continue;
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
  // 100117: elle A/AAAA var — zone Workers Route yeterli, custom_domain şart değil
  if (!r.ok && err?.code === 100117) {
    console.log(`[fix] workers/domains ${hostname} skip (external DNS; use zone routes)`);
    return true;
  }
  console.log(`[fix] workers/domains ${hostname} ok=${r.ok}`, JSON.stringify(r.json?.errors || r.json?.result || {}));
  return r.ok;
}

/** Proxied A 192.0.2.1 — Worker originless IPv4 (522 = Worker route yokken bu IP'ye gidilir). */
async function ensureProxiedOriginlessA(zoneId, zoneName, name, fqdn) {
  const list = await cf(
    `/zones/${zoneId}/dns_records?name=${encodeURIComponent(fqdn)}&per_page=100`,
  );
  const records = list.json?.result || [];
  for (const rec of records) {
    if (!["A", "AAAA", "CNAME"].includes(rec.type)) continue;
    if (rec.type === "A" && String(rec.content) === "192.0.2.1") {
      if (!rec.proxied) {
        await cf(`/zones/${zoneId}/dns_records/${rec.id}`, {
          method: "PATCH",
          body: { proxied: true },
        });
        console.log(`[fix] proxied A 192.0.2.1 ${fqdn}`);
      } else {
        console.log(`[fix] already A 192.0.2.1 proxied ${fqdn}`);
      }
      return;
    }
  }
  const created = await cf(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: { type: "A", name, content: "192.0.2.1", proxied: true, ttl: 1 },
  });
  console.log(
    `[fix] create A 192.0.2.1 ${fqdn} ok=${created.ok}`,
    JSON.stringify(created.json?.errors || {}),
  );
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
    const { Resolver } = await import("node:dns/promises");
    const r = new Resolver();
    r.setServers(["1.1.1.1", "8.8.8.8"]);
    const [a, aaaa] = await Promise.all([
      r.resolve4(fqdn).catch(() => []),
      r.resolve6(fqdn).catch(() => []),
    ]);
    return { a, aaaa };
  } catch (e) {
    return { a: [], aaaa: [], err: String(e?.message || e) };
  }
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
  await ensureAaaa100(zone.id, name, "@", name);
  await ensureAaaa100(zone.id, name, "www", `www.${name}`);
  await ensureProxiedOriginlessA(zone.id, name, "@", name);
  await ensureProxiedOriginlessA(zone.id, name, "www", `www.${name}`);
  const dnsList = await cf(`/zones/${zone.id}/dns_records?per_page=100`);
  if (!dnsList.ok) {
    console.log(
      `[fix] DNS LIST FAIL (token Zone DNS Edit yok) status=${dnsList.status}`,
      JSON.stringify(dnsList.json?.errors || {}),
    );
  }
  const dnsRows = (dnsList.json?.result || []).filter((r) => ["A", "AAAA", "CNAME"].includes(r.type));
  console.log(
    `[fix] dns api summary`,
    dnsRows.map((r) => `${r.type} ${r.name}→${r.content} proxied=${r.proxied}`).join(" | ") || "(empty/unreadable)",
  );
  for (const fqdn of [name, `www.${name}`]) {
    const dig = await publicDnsProbe(fqdn);
    const answers = [...(dig.a || []), ...(dig.aaaa || [])];
    console.log(
      `[fix] public dig ${fqdn}:`,
      answers.length ? answers.join(", ") : "NO A/AAAA (zone boş veya yanlış hesap)",
    );
    if (!answers.length) {
      console.warn(
        `[fix] ACTION: Cloudflare DNS’te ${fqdn} için Proxied A → 192.0.2.1 (veya AAAA 100::) kaydı YOK.`,
      );
      console.warn(
        `[fix] Dashboard’da kayıt görürseniz farklı Cloudflare hesabındasınız — NS: becky/keanu.ns.cloudflare.com olan zone’u kontrol edin (zone id=${zone.id}).`,
      );
    }
  }
  await ensureRoutes(zone.id, name);
  await attachCustomDomain(name);
  await attachCustomDomain(`www.${name}`);
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
  form.set(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  form.set(
    "worker.js",
    new Blob([source], { type: "application/javascript+module" }),
    "worker.js",
  );

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
  // Prefer API upload — no wrangler resolution / shim recursion issues.
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
  // pnpm may hoist under .pnpm
  const pnpmStore = join(root, "node_modules", ".pnpm");
  if (existsSync(pnpmStore)) {
    try {
      const { readdirSync } = await import("node:fs");
      for (const name of readdirSync(pnpmStore)) {
        if (!name.startsWith("wrangler@")) continue;
        const bin = join(pnpmStore, name, "node_modules", "wrangler", "bin", "wrangler.js");
        if (existsSync(bin)) candidates.push(bin);
      }
    } catch {
      /* ignore */
    }
  }
  const resolved = candidates.find((p) => existsSync(p));
  if (!resolved) {
    console.log("[fix] wrangler deploy skip — binary not found", candidates);
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
    console.warn("[fix] NO CLOUDFLARE_API_TOKEN — cannot create zones/DNS via API.");
    console.warn("[fix] Dashboard (zorunlu adımlar):");
    console.warn("  1) Cloudflare → Add site: vatankahramanlari.org");
    console.warn("  2) DNS → AAAA @ / www → 100:: (Proxied)");
    console.warn("  3) Workers → haberler → Custom domains → add hostnames");
    console.warn("  4) vatanhaber.net: Squarespace Domains'te clientHold kaldır");
    console.warn("     sonra aynı 1–3 adımları");
    console.warn("  GitHub secret: CLOUDFLARE_API_TOKEN (Zone DNS Edit + Workers Routes)");
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
    console.error("[fix] FATAL: Worker script deploy failed — Chrome ERR_FAILED fix not live");
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("[fix] fatal", e);
  process.exitCode = 1;
});
