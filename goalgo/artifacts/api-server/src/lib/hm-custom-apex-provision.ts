/**
 * HM custom apex domains (domain2/domain3) — Proxied A @ + www → PHP origin.
 *
 * gundemi.org alt alanları hm-gundemi-provision.ts ile yönetilir.
 * fix.tc gibi tek-zone siteler wrangler + Actions ile ayrı tutulabilir; bu modül
 * panelden eklenen harici apex’leri (örn. sosyalhizmetler.tr) otomatik dener.
 *
 * Soft-fail: site kaydı başarılı kalır; token yoksa no_token.
 */

import { GUNDEMI_PHP_ORIGIN_IP } from "./hm-gundemi-regional-sites.js";
import { isGundemiOrgManagedHost, normalizeGundemiHostname } from "./hm-gundemi-provision.js";
import { syncTraefikDynamicForCustomApexZone, type TraefikSyncResult } from "./hm-vps-traefik-sync.js";

const CF_API = "https://api.cloudflare.com/client/v4";
const WORKER_SCRIPT = "haberler";

/** Marka statik dosya öneki (Worker ASSETS) — wrangler ile uyumlu. */
const CUSTOM_APEX_BRAND_ASSET_PREFIX: Record<string, string> = {
  "fix.tc": "fix",
  "sosyalhizmetler.tr": "sh",
};

export type CustomApexDnsAction =
  | "ok"
  | "created"
  | "kept"
  | "skipped"
  | "error"
  | "no_token"
  | "no_zone";

export type CustomApexDnsResult = {
  action: CustomApexDnsAction;
  zone: string;
  fqdn: string;
  name?: string;
  ip?: string;
  message?: string;
  code?: number;
};

export type CustomApexRouteAction =
  | "ok"
  | "created"
  | "rebound"
  | "skipped"
  | "error"
  | "no_token"
  | "no_zone";

export type CustomApexRouteResult = {
  action: CustomApexRouteAction;
  zone: string;
  pattern: string;
  message?: string;
};

export type CustomApexWorkerDomainAction =
  | "ok"
  | "skipped"
  | "error"
  | "no_token"
  | "external_dns";

export type CustomApexWorkerDomainResult = {
  action: CustomApexWorkerDomainAction;
  hostname: string;
  message?: string;
};

export type CustomApexProvisionReport = {
  originIp: string;
  zones: string[];
  dns: CustomApexDnsResult[];
  routes: CustomApexRouteResult[];
  workerDomains: CustomApexWorkerDomainResult[];
  traefik: TraefikSyncResult[];
  tokenPresent: boolean;
};

const PANEL_PATH_SUFFIXES = [
  "editor*",
  "api/*",
  "admin*",
  "panel*",
  "haber-merkezi*",
  "assets/*",
  "sw.js",
  "llms.txt",
  "ai.txt",
  "manifest.json",
  "yazar/giris*",
  "koseyazari/giris*",
  "yazar/sifre*",
  "koseyazari/sifre*",
  "yazar/haber*",
  "koseyazari/haber*",
  "tr/*",
  "hm/*",
] as const;

/** Panel/API yolları — public `/` PHP origin (fix.tc modeli). Catch-all YOK. */
export function customApexPanelWorkerRoutePatterns(
  zone: string,
  opts?: { brandAssetPrefix?: string | null },
): string[] {
  const z = String(zone || "")
    .trim()
    .toLowerCase();
  if (!z) return [];
  const prefix = opts?.brandAssetPrefix ?? CUSTOM_APEX_BRAND_ASSET_PREFIX[z] ?? null;
  const suffixes = prefix ? [...PANEL_PATH_SUFFIXES, `${prefix}/*`] : [...PANEL_PATH_SUFFIXES];
  const hosts = [z, `www.${z}`];
  const out: string[] = [];
  for (const host of hosts) {
    for (const suffix of suffixes) {
      out.push(`${host}/${suffix}`);
    }
  }
  return out;
}

function cfTokens(): string[] {
  const raw = [
    process.env.CLOUDFLAREDNS_API_TOKEN,
    process.env.CLOUDFLARE_API_TOKEN,
    process.env.CF_API_TOKEN,
  ].map((s) => String(s || "").trim());
  return [...new Set(raw.filter(Boolean))];
}

function cfAccountId(): string {
  return String(process.env.CLOUDFLARE_ACCOUNT_ID || "16f5b996194174624e7969a3658bd2bb").trim();
}

/** Basit apex çıkarımı (.tr, .com, .org — paneldeki domain2 apex’leri için yeterli). */
export function apexZoneFromHostname(raw: string | null | undefined): string | null {
  const host = normalizeGundemiHostname(raw);
  if (!host) return null;
  const parts = host.split(".").filter(Boolean);
  if (parts.length < 2) return null;
  if (parts.length === 2) return host;
  return parts.slice(-2).join(".");
}

/**
 * domain triad içinden yönetilecek harici apex zone listesi.
 * gundemi.org alt alanları hariç; zone = host apex’i ile eşleşen kayıtlar.
 */
export function collectCustomPhpApexZones(
  domain?: string | null,
  domain2?: string | null,
  domain3?: string | null,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [domain, domain2, domain3]) {
    const host = normalizeGundemiHostname(raw);
    if (!host || isGundemiOrgManagedHost(host)) continue;
    const zone = apexZoneFromHostname(host);
    if (!zone) continue;
    const isApex = host === zone;
    const isWww = host === `www.${zone}`;
    if (!isApex && !isWww) continue;
    if (seen.has(zone)) continue;
    seen.add(zone);
    out.push(zone);
  }
  return out;
}

type CfJson = {
  success?: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  result?: unknown;
};

async function cfFetch(
  path: string,
  opts: { method?: string; body?: unknown; bearer?: string } = {},
): Promise<{ ok: boolean; status: number; json: CfJson }> {
  const bearer = opts.bearer || cfTokens()[0] || "";
  if (!bearer) return { ok: false, status: 0, json: { success: false, errors: [{ message: "no_token" }] } };
  const res = await fetch(`${CF_API}${path}`, {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as CfJson;
  return { ok: res.ok && json.success !== false, status: res.status, json };
}

function isAuthError(json: CfJson): boolean {
  const err = json.errors?.[0];
  return err?.code === 10000 || /Authentication/i.test(String(err?.message || ""));
}

async function cfMutate(path: string, opts: { method: string; body?: unknown }) {
  const list = cfTokens();
  let last: { ok: boolean; status: number; json: CfJson } = { ok: false, status: 0, json: {} };
  for (const bearer of list) {
    const result = await cfFetch(path, { ...opts, bearer });
    if (result.ok || !isAuthError(result.json)) return result;
    last = result;
  }
  return last;
}

const zoneIdByName = new Map<string, string | null>();

async function resolveZoneId(zone: string): Promise<string | null> {
  if (zoneIdByName.has(zone)) return zoneIdByName.get(zone) ?? null;
  const r = await cfFetch(
    `/zones?name=${encodeURIComponent(zone)}&account.id=${encodeURIComponent(cfAccountId())}`,
  );
  const row = Array.isArray(r.json.result)
    ? (r.json.result as Array<{ id?: string }>)[0]
    : undefined;
  const id = row?.id ? String(row.id) : null;
  zoneIdByName.set(zone, id);
  return id;
}

async function listDns(zoneId: string, fqdn: string, bearer: string) {
  const r = await cfFetch(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(fqdn)}&per_page=100`, {
    bearer,
  });
  return Array.isArray(r.json.result)
    ? (r.json.result as Array<{ id?: string; type?: string; content?: string; proxied?: boolean; name?: string }>)
    : [];
}

async function ensureProxiedAForZone(
  zone: string,
  name: "@" | "www",
  ip: string,
): Promise<CustomApexDnsResult> {
  const fqdn = name === "@" ? zone : `www.${zone}`;
  const tokens = cfTokens();
  if (!tokens.length) {
    return { action: "no_token", zone, fqdn, name, ip, message: "CLOUDFLARE_API_TOKEN missing" };
  }
  const zoneId = await resolveZoneId(zone);
  if (!zoneId) {
    return {
      action: "no_zone",
      zone,
      fqdn,
      name,
      ip,
      message: `zone ${zone} not in Cloudflare account ${cfAccountId()}`,
    };
  }

  const readBearer = tokens[0];
  const records = await listDns(zoneId, fqdn, readBearer);
  const addressRecords = records.filter((rec) => ["A", "AAAA", "CNAME"].includes(String(rec.type || "")));
  const good = addressRecords.find(
    (rec) => rec.type === "A" && String(rec.content) === ip && rec.proxied === true,
  );
  if (good && addressRecords.length === 1) {
    return { action: "ok", zone, fqdn, name, ip };
  }

  for (const rec of addressRecords) {
    if (good && rec.id === good.id) continue;
    if (rec.id) {
      await cfMutate(`/zones/${zoneId}/dns_records/${rec.id}`, { method: "DELETE" });
    }
  }

  if (good) {
    return { action: "kept", zone, fqdn, name, ip };
  }

  const created = await cfMutate(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: { type: "A", name, content: ip, proxied: true, ttl: 1 },
  });
  if (!created.ok) {
    const err = created.json.errors?.[0];
    return {
      action: "error",
      zone,
      fqdn,
      name,
      ip,
      code: err?.code,
      message: err?.message || `HTTP ${created.status}`,
    };
  }
  console.warn(`[custom-apex-provision] DNS created A ${name} → ${ip} (proxied) — ${fqdn}`);
  return { action: "created", zone, fqdn, name, ip };
}

export function resetCustomApexProvisionCaches(): void {
  zoneIdByName.clear();
}

async function ensureCustomApexPanelRoutesForZone(zone: string): Promise<CustomApexRouteResult[]> {
  const results: CustomApexRouteResult[] = [];
  const tokens = cfTokens();
  if (!tokens.length) {
    for (const pattern of customApexPanelWorkerRoutePatterns(zone)) {
      results.push({ action: "no_token", zone, pattern, message: "CLOUDFLARE_API_TOKEN missing" });
    }
    return results;
  }
  const zoneId = await resolveZoneId(zone);
  if (!zoneId) {
    for (const pattern of customApexPanelWorkerRoutePatterns(zone)) {
      results.push({
        action: "no_zone",
        zone,
        pattern,
        message: `zone ${zone} not in Cloudflare account`,
      });
    }
    return results;
  }

  const list = await cfFetch(`/zones/${zoneId}/workers/routes`);
  const existing = Array.isArray(list.json.result)
    ? (list.json.result as Array<{ id?: string; pattern?: string; script?: string }>)
    : [];
  const byPattern = new Map(existing.map((r) => [String(r.pattern || ""), r]));

  for (const pattern of customApexPanelWorkerRoutePatterns(zone)) {
    const row = byPattern.get(pattern);
    if (row?.script === WORKER_SCRIPT) {
      results.push({ action: "ok", zone, pattern });
      continue;
    }
    if (row?.id) {
      const r = await cfMutate(`/zones/${zoneId}/workers/routes/${row.id}`, {
        method: "PUT",
        body: { pattern, script: WORKER_SCRIPT },
      });
      results.push(
        r.ok
          ? { action: "rebound", zone, pattern }
          : {
              action: "error",
              zone,
              pattern,
              message: r.json.errors?.[0]?.message || `HTTP ${r.status}`,
            },
      );
      continue;
    }
    const r = await cfMutate(`/zones/${zoneId}/workers/routes`, {
      method: "POST",
      body: { pattern, script: WORKER_SCRIPT },
    });
    results.push(
      r.ok
        ? { action: "created", zone, pattern }
        : {
            action: "error",
            zone,
            pattern,
            message: r.json.errors?.[0]?.message || `HTTP ${r.status}`,
          },
    );
  }
  return results;
}

async function ensureWorkerCustomDomain(hostname: string): Promise<CustomApexWorkerDomainResult> {
  const host = normalizeGundemiHostname(hostname);
  if (!host) return { action: "skipped", hostname: String(hostname || ""), message: "empty_host" };
  const tokens = cfTokens();
  if (!tokens.length) {
    return { action: "no_token", hostname: host, message: "CLOUDFLARE_API_TOKEN missing" };
  }
  const account = cfAccountId();
  const r = await cfMutate(`/accounts/${account}/workers/domains`, {
    method: "PUT",
    body: { hostname: host, service: WORKER_SCRIPT, environment: "production" },
  });
  const err = r.json.errors?.[0];
  if (!r.ok && err?.code === 100117) {
    return { action: "external_dns", hostname: host, message: String(err.message || "external_dns") };
  }
  if (!r.ok) {
    return {
      action: "error",
      hostname: host,
      message: err?.message || `HTTP ${r.status}`,
    };
  }
  return { action: "ok", hostname: host };
}

export async function provisionCustomPhpApexForSiteDomains(input: {
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
}): Promise<CustomApexProvisionReport> {
  const zones = collectCustomPhpApexZones(input.domain, input.domain2, input.domain3);
  const tokenPresent = cfTokens().length > 0;
  const ip = GUNDEMI_PHP_ORIGIN_IP;
  const report: CustomApexProvisionReport = {
    originIp: ip,
    zones,
    dns: [],
    routes: [],
    workerDomains: [],
    traefik: [],
    tokenPresent,
  };
  if (zones.length === 0) return report;

  for (const zone of zones) {
    for (const name of ["@", "www"] as const) {
      try {
        report.dns.push(await ensureProxiedAForZone(zone, name, ip));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        report.dns.push({
          action: "error",
          zone,
          fqdn: name === "@" ? zone : `www.${zone}`,
          name,
          ip,
          message,
        });
      }
    }
    try {
      report.routes.push(...(await ensureCustomApexPanelRoutesForZone(zone)));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      report.routes.push({
        action: "error",
        zone,
        pattern: `${zone}/*`,
        message,
      });
    }
    for (const hostname of [zone, `www.${zone}`]) {
      try {
        report.workerDomains.push(await ensureWorkerCustomDomain(hostname));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        report.workerDomains.push({ action: "error", hostname, message });
      }
    }
    try {
      report.traefik.push(await syncTraefikDynamicForCustomApexZone(zone));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      report.traefik.push({ action: "error", zone, message });
    }
  }
  return report;
}
