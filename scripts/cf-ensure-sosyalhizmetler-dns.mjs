/**
 * sosyalhizmetler.tr (Marmara Gündemi domain2) — Proxied A → Hostinger PHP (187.77.84.201).
 *
 * Fixes DNS_PROBE_FINISHED_NXDOMAIN when apex exists but www (or apex) has no A record.
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... node scripts/cf-ensure-sosyalhizmetler-dns.mjs
 *   CLOUDFLAREDNS_API_TOKEN=... node scripts/cf-ensure-sosyalhizmetler-dns.mjs
 *   HM_APEX_ZONE=ornek.com node scripts/cf-ensure-sosyalhizmetler-dns.mjs
 *   DRY_RUN=1 ... node scripts/cf-ensure-sosyalhizmetler-dns.mjs
 *
 * Docs: hostinger/gundemi-bolge/DEPLOY.md (custom domain2)
 */
const ZONE = String(process.env.HM_APEX_ZONE || "sosyalhizmetler.tr").trim().toLowerCase();
const ORIGIN_IP = process.env.HM_PHP_ORIGIN_IP || "187.77.84.201";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "16f5b996194174624e7969a3658bd2bb";
const API = "https://api.cloudflare.com/client/v4";
const DRY_RUN = String(process.env.DRY_RUN || "").trim() === "1";

const RECORDS = [
  { name: "@", fqdn: ZONE, serves: "HM PHP apex (by-domain → site slug)" },
  { name: "www", fqdn: `www.${ZONE}`, serves: "HM PHP www → same origin" },
];

function tokens() {
  const raw = [
    process.env.CLOUDFLAREDNS_API_TOKEN,
    process.env.CLOUDFLARE_API_TOKEN,
    process.env.CF_API_TOKEN,
  ].map((s) => String(s || "").trim());
  return [...new Set(raw.filter(Boolean))];
}

function token() {
  return tokens()[0] || "";
}

async function cf(path, { method = "GET", body, bearer } = {}) {
  const t = bearer || token();
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

function isAuthError(result) {
  const err = result?.json?.errors?.[0];
  return err?.code === 10000 || /Authentication/i.test(String(err?.message || ""));
}

async function cfMutate(path, { method, body }) {
  const list = tokens();
  if (!list.length) throw new Error("CLOUDFLARE_API_TOKEN missing");
  let last = null;
  for (let i = 0; i < list.length; i += 1) {
    const bearer = list[i];
    const result = await cf(path, { method, body, bearer });
    if (result.ok || !isAuthError(result)) {
      return { ...result, tokenIndex: i, tokenCount: list.length };
    }
    last = result;
    if (i < list.length - 1) {
      console.warn(
        `[hm-apex-dns] token ${i + 1}/${list.length} lacks DNS write (10000) — trying next secret`,
      );
    }
  }
  return { ...last, tokenIndex: list.length - 1, tokenCount: list.length };
}

async function getZone(name) {
  const r = await cf(`/zones?name=${encodeURIComponent(name)}&account.id=${ACCOUNT_ID}`);
  return r.json?.result?.[0] || null;
}

async function listDns(zoneId, fqdn, bearer) {
  const r = await cf(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(fqdn)}&per_page=100`, {
    bearer,
  });
  return r.json?.result || [];
}

async function ensureProxiedA(zoneId, { name, fqdn, ip, serves }, readBearer) {
  const records = await listDns(zoneId, fqdn, readBearer);
  const addressRecords = records.filter((rec) => ["A", "AAAA", "CNAME"].includes(rec.type));
  const good = addressRecords.find(
    (rec) => rec.type === "A" && String(rec.content) === ip && rec.proxied === true,
  );
  if (good && addressRecords.length === 1) {
    console.log(`[hm-apex-dns] ok A ${name} → ${ip} (proxied) — ${serves}`);
    return { action: "ok", fqdn, name, ip };
  }

  for (const rec of addressRecords) {
    if (good && rec.id === good.id) continue;
    const msg = `[hm-apex-dns] delete conflicting ${rec.type} ${rec.name} → ${rec.content} proxied=${rec.proxied}`;
    if (DRY_RUN) {
      console.log(`[dry-run] ${msg}`);
    } else {
      const del = await cfMutate(`/zones/${zoneId}/dns_records/${rec.id}`, { method: "DELETE" });
      console.log(msg, `ok=${del.ok}`, JSON.stringify(del.json?.errors || {}));
    }
  }

  if (good) {
    console.log(`[hm-apex-dns] kept A ${name} → ${ip} (proxied) — ${serves}`);
    return { action: "kept", fqdn, name, ip };
  }

  const body = { type: "A", name, content: ip, proxied: true, ttl: 1 };
  if (DRY_RUN) {
    console.log(`[dry-run] create A ${name} → ${ip} (proxied) — ${serves}`);
    return { action: "would-create", fqdn, name, ip };
  }
  const created = await cfMutate(`/zones/${zoneId}/dns_records`, { method: "POST", body });
  console.log(
    `[hm-apex-dns] create A ${name} → ${ip} (proxied) ok=${created.ok} — ${serves}`,
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
  console.log(`[hm-apex-dns] zone=${ZONE} origin=${ORIGIN_IP} records=${RECORDS.length} dryRun=${DRY_RUN}`);

  const tokenList = tokens();
  if (!tokenList.length) {
    console.error(
      "[hm-apex-dns] CLOUDFLARE_API_TOKEN / CLOUDFLAREDNS_API_TOKEN missing — cannot create DNS via API.",
    );
    process.exitCode = 2;
    return;
  }

  const zone = await getZone(ZONE);
  if (!zone?.id) {
    console.error(`[hm-apex-dns] zone ${ZONE} not found in account ${ACCOUNT_ID}`);
    console.error(
      "[hm-apex-dns] Add the domain to this Cloudflare account (NS must point here) or create A records in the zone owner account.",
    );
    process.exitCode = 1;
    return;
  }
  console.log(`[hm-apex-dns] zone id=${zone.id} status=${zone.status}`);

  const results = [];
  for (const rec of RECORDS) {
    results.push(await ensureProxiedA(zone.id, { ...rec, ip: ORIGIN_IP }, tokenList[0]));
  }

  console.log("\n[hm-apex-dns] DoH probe (may lag a few minutes after create):");
  for (const rec of RECORDS) {
    const answers = await publicDnsProbe(rec.fqdn);
    console.log(`  ${rec.fqdn}: ${answers.join(" ") || "(empty / NXDOMAIN)"}`);
  }

  const created = results.filter((r) => r.action === "created" || r.action === "would-create").length;
  const ok = results.filter((r) => r.action === "ok" || r.action === "kept").length;
  const errors = results.filter((r) => r.action === "error");
  console.log(
    `\n[hm-apex-dns] done: ${ok} ok, ${created} created/planned, ${errors.length} errors, total ${results.length}`,
  );

  if (errors.length) {
    for (const e of errors) {
      console.error(`  FAIL ${e.name}: ${e.code || ""} ${e.message}`);
    }
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("[hm-apex-dns] fatal", e);
  process.exitCode = 1;
});
