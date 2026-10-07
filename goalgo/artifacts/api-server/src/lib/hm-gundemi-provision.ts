/**
 * *.gundemi.org HM siteleri — panel create/PATCH sonrası otomatik DNS + Worker catch-all.
 *
 * - layout phpTheme: ensurePhpThemeLayoutDefaults (çağıran taraf)
 * - Cloudflare Proxied A → 187.77.84.201 (CLOUDFLARE_API_TOKEN gerekir)
 * - Worker route `*.gundemi.org/*` (Traefik Host() yokken SPA/bridge)
 *
 * Token yoksa soft-fail (site kaydı yine başarılı).
 * Gerekli CF yetkileri: Zone DNS Edit (+ Workers Routes Edit), zone gundemi.org.
 */

import {
  GUNDEMI_PHP_ORIGIN_IP,
  GUNDEMI_ZONE,
} from "./hm-gundemi-regional-sites.js";

const CF_API = "https://api.cloudflare.com/client/v4";
const WORKER_SCRIPT = "haberler";

/** Geçici Traefik-gap catch-all — yeni alt alanlar wrangler.toml düzenlemeden açılır. */
export const GUNDEMI_CATCHALL_ROUTE_PATTERNS = Object.freeze([
  "*.gundemi.org/*",
  "gundemi.org/*",
  "www.gundemi.org/*",
]);

export type GundemiDnsAction =
  | "ok"
  | "created"
  | "kept"
  | "skipped"
  | "error"
  | "no_token"
  | "no_zone";

export type GundemiDnsEnsureResult = {
  action: GundemiDnsAction;
  fqdn: string;
  name?: string;
  ip?: string;
  message?: string;
  code?: number;
};

export type GundemiRouteEnsureResult = {
  action: "ok" | "created" | "rebound" | "skipped" | "error" | "no_token" | "no_zone";
  pattern: string;
  message?: string;
};

export type GundemiProvisionReport = {
  zone: string;
  originIp: string;
  hosts: string[];
  dns: GundemiDnsEnsureResult[];
  routes: GundemiRouteEnsureResult[];
  tokenPresent: boolean;
};

function cfToken(): string {
  return String(process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || "").trim();
}

function cfAccountId(): string {
  return String(process.env.CLOUDFLARE_ACCOUNT_ID || "16f5b996194174624e7969a3658bd2bb").trim();
}

/** Host normalize — protokol/path/port/www temizliği. */
export function normalizeGundemiHostname(raw: string | null | undefined): string | null {
  const h = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .split("/")[0]
    ?.split(":")[0]
    ?.replace(/\.$/, "");
  if (!h) return null;
  return h.replace(/^www\./, "");
}

/**
 * gundemi.org zone altında yönetilen host mu?
 * Apex (gundemi.org) + herhangi bir alt alan (yeni.gundemi.org).
 */
export function isGundemiOrgManagedHost(hostname: string | null | undefined): boolean {
  const host = normalizeGundemiHostname(hostname);
  if (!host) return false;
  if (host === GUNDEMI_ZONE) return true;
  return host.endsWith(`.${GUNDEMI_ZONE}`);
}

/** domain / domain2 / domain3 içinden gundemi.org host’ları (tekilleştirilmiş). */
export function collectGundemiOrgHosts(
  domain?: string | null,
  domain2?: string | null,
  domain3?: string | null,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [domain, domain2, domain3]) {
    const h = normalizeGundemiHostname(raw);
    if (!h || !isGundemiOrgManagedHost(h) || seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out;
}

/**
 * DNS kayıt adı (zone-relative).
 * ege.gundemi.org → ege; gundemi.org → @; www.gundemi.org → www (normalize www düşer → @).
 */
export function gundemiDnsRecordName(hostname: string): string | null {
  const host = normalizeGundemiHostname(hostname);
  if (!host || !isGundemiOrgManagedHost(host)) return null;
  if (host === GUNDEMI_ZONE) return "@";
  const suffix = `.${GUNDEMI_ZONE}`;
  if (!host.endsWith(suffix)) return null;
  const name = host.slice(0, -suffix.length);
  return name || null;
}

type CfJson = {
  success?: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  result?: unknown;
};

async function cfFetch(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<{ ok: boolean; status: number; json: CfJson }> {
  const token = cfToken();
  if (!token) return { ok: false, status: 0, json: { success: false, errors: [{ message: "no_token" }] } };
  const res = await fetch(`${CF_API}${path}`, {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as CfJson;
  return { ok: res.ok && json.success !== false, status: res.status, json };
}

let zoneIdCache: string | null | undefined;

async function resolveGundemiZoneId(): Promise<string | null> {
  if (zoneIdCache !== undefined) return zoneIdCache;
  if (!cfToken()) {
    zoneIdCache = null;
    return null;
  }
  const account = cfAccountId();
  const r = await cfFetch(`/zones?name=${encodeURIComponent(GUNDEMI_ZONE)}&account.id=${encodeURIComponent(account)}`);
  const rows = Array.isArray(r.json.result) ? (r.json.result as Array<{ id?: string }>) : [];
  const id = rows[0]?.id ? String(rows[0].id) : null;
  zoneIdCache = id;
  return id;
}

/** Testlerde zone cache sıfırlama. */
export function resetGundemiProvisionCaches(): void {
  zoneIdCache = undefined;
}

/**
 * Tek host için Proxied A kaydı (idempotent).
 * Token yoksa soft-fail (`no_token`).
 */
export async function ensureGundemiProxiedA(
  hostname: string,
  opts?: { ip?: string },
): Promise<GundemiDnsEnsureResult> {
  const fqdn = normalizeGundemiHostname(hostname);
  const name = fqdn ? gundemiDnsRecordName(fqdn) : null;
  const ip = String(opts?.ip || GUNDEMI_PHP_ORIGIN_IP).trim() || GUNDEMI_PHP_ORIGIN_IP;
  if (!fqdn || !name) {
    return { action: "skipped", fqdn: String(hostname || ""), message: "not_gundemi_host" };
  }

  if (!cfToken()) {
    console.warn(
      `[gundemi-provision] CLOUDFLARE_API_TOKEN yok — DNS atlandı (${fqdn}). Secret: CLOUDFLARE_API_TOKEN (Zone DNS Edit, gundemi.org).`,
    );
    return {
      action: "no_token",
      fqdn,
      name,
      ip,
      message: "CLOUDFLARE_API_TOKEN missing",
    };
  }

  const zoneId = await resolveGundemiZoneId();
  if (!zoneId) {
    console.warn(`[gundemi-provision] zone ${GUNDEMI_ZONE} bulunamadı — DNS atlandı (${fqdn})`);
    return { action: "no_zone", fqdn, name, ip, message: `zone ${GUNDEMI_ZONE} not found` };
  }

  const list = await cfFetch(
    `/zones/${zoneId}/dns_records?name=${encodeURIComponent(fqdn)}&per_page=100`,
  );
  const records = Array.isArray(list.json.result)
    ? (list.json.result as Array<{
        id?: string;
        type?: string;
        name?: string;
        content?: string;
        proxied?: boolean;
      }>)
    : [];
  const addressRecords = records.filter((rec) => ["A", "AAAA", "CNAME"].includes(String(rec.type || "")));
  const good = addressRecords.find(
    (rec) => rec.type === "A" && String(rec.content) === ip && rec.proxied === true,
  );

  if (good && addressRecords.length === 1) {
    return { action: "ok", fqdn, name, ip };
  }

  for (const rec of addressRecords) {
    if (good && rec.id === good.id) continue;
    if (!rec.id) continue;
    const del = await cfFetch(`/zones/${zoneId}/dns_records/${rec.id}`, { method: "DELETE" });
    if (!del.ok) {
      console.warn(
        `[gundemi-provision] conflict delete failed ${rec.type} ${fqdn}`,
        del.json.errors?.[0]?.message || del.status,
      );
    }
  }

  if (good) {
    return { action: "kept", fqdn, name, ip };
  }

  const created = await cfFetch(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: { type: "A", name, content: ip, proxied: true, ttl: 1 },
  });
  if (!created.ok) {
    const err = created.json.errors?.[0] || {};
    console.warn(
      `[gundemi-provision] DNS create failed ${fqdn}`,
      err.code,
      err.message || created.status,
    );
    return {
      action: "error",
      fqdn,
      name,
      ip,
      code: err.code,
      message: err.message || `HTTP ${created.status}`,
    };
  }
  console.warn(`[gundemi-provision] DNS created A ${name} → ${ip} (proxied) — ${fqdn}`);
  return { action: "created", fqdn, name, ip };
}

/** Catch-all Worker route’larını bağla (idempotent). */
export async function ensureGundemiCatchAllWorkerRoutes(): Promise<GundemiRouteEnsureResult[]> {
  const results: GundemiRouteEnsureResult[] = [];
  if (!cfToken()) {
    for (const pattern of GUNDEMI_CATCHALL_ROUTE_PATTERNS) {
      results.push({ action: "no_token", pattern, message: "CLOUDFLARE_API_TOKEN missing" });
    }
    return results;
  }
  const zoneId = await resolveGundemiZoneId();
  if (!zoneId) {
    for (const pattern of GUNDEMI_CATCHALL_ROUTE_PATTERNS) {
      results.push({ action: "no_zone", pattern, message: `zone ${GUNDEMI_ZONE} not found` });
    }
    return results;
  }

  const list = await cfFetch(`/zones/${zoneId}/workers/routes`);
  const existing = Array.isArray(list.json.result)
    ? (list.json.result as Array<{ id?: string; pattern?: string; script?: string }>)
    : [];
  const byPattern = new Map(existing.map((r) => [String(r.pattern || ""), r]));

  for (const pattern of GUNDEMI_CATCHALL_ROUTE_PATTERNS) {
    const row = byPattern.get(pattern);
    if (row?.script === WORKER_SCRIPT) {
      results.push({ action: "ok", pattern });
      continue;
    }
    if (row?.id) {
      const r = await cfFetch(`/zones/${zoneId}/workers/routes/${row.id}`, {
        method: "PUT",
        body: { pattern, script: WORKER_SCRIPT },
      });
      results.push(
        r.ok
          ? { action: "rebound", pattern }
          : {
              action: "error",
              pattern,
              message: r.json.errors?.[0]?.message || `HTTP ${r.status}`,
            },
      );
      continue;
    }
    const r = await cfFetch(`/zones/${zoneId}/workers/routes`, {
      method: "POST",
      body: { pattern, script: WORKER_SCRIPT },
    });
    results.push(
      r.ok
        ? { action: "created", pattern }
        : {
            action: "error",
            pattern,
            message: r.json.errors?.[0]?.message || `HTTP ${r.status}`,
          },
    );
  }
  return results;
}

/**
 * Site domain’leri için gundemi.org DNS + catch-all route provision.
 * Soft-fail: hata fırlatmaz; rapor döner.
 */
export async function provisionGundemiOrgForSiteDomains(input: {
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
}): Promise<GundemiProvisionReport> {
  const hosts = collectGundemiOrgHosts(input.domain, input.domain2, input.domain3);
  const tokenPresent = Boolean(cfToken());
  const report: GundemiProvisionReport = {
    zone: GUNDEMI_ZONE,
    originIp: GUNDEMI_PHP_ORIGIN_IP,
    hosts,
    dns: [],
    routes: [],
    tokenPresent,
  };
  if (hosts.length === 0) return report;

  for (const host of hosts) {
    try {
      report.dns.push(await ensureGundemiProxiedA(host));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn(`[gundemi-provision] DNS exception ${host}:`, message);
      report.dns.push({ action: "error", fqdn: host, message });
    }
  }

  try {
    report.routes = await ensureGundemiCatchAllWorkerRoutes();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn(`[gundemi-provision] routes exception:`, message);
    report.routes = GUNDEMI_CATCHALL_ROUTE_PATTERNS.map((pattern) => ({
      action: "error" as const,
      pattern,
      message,
    }));
  }

  return report;
}
