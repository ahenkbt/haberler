import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { expandDomainHostKeys } from "./domainHostAliases.js";
import { normalizePortalHostKey } from "./portalBrand.js";
import {
  ensureHmNewsSiteDomain2Column,
  ensureHmNewsSiteDomain3Column,
} from "./hm-site-compat.js";
import { ensureVendorCustomDomainsTable } from "./vendor-storefront.js";

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedHosts: Set<string> | null = null;
let cacheExpiresAt = 0;
let loadPromise: Promise<Set<string>> | null = null;

function hostFromOrigin(origin: string): string | null {
  try {
    const u = new URL(origin);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return normalizePortalHostKey(u.hostname);
  } catch {
    return null;
  }
}

async function loadRegisteredCustomDomainHosts(): Promise<Set<string>> {
  const hosts = new Set<string>();
  await ensureHmNewsSiteDomain2Column().catch(() => undefined);
  await ensureHmNewsSiteDomain3Column().catch(() => undefined);
  await ensureVendorCustomDomainsTable().catch(() => undefined);

  try {
    const hmRows = await db.execute(sql`
      SELECT domain, domain2, domain3
      FROM hm_news_sites
      WHERE active = true
    `);
    for (const row of hmRows.rows ?? []) {
      const rec = row as Record<string, unknown>;
      for (const key of ["domain", "domain2", "domain3"] as const) {
        const raw = String(rec[key] ?? "").trim();
        if (raw) hosts.add(normalizePortalHostKey(raw));
      }
    }
  } catch {
    /* schema / DB geçici hatası — statik portal listesi yeterli kalır */
  }

  try {
    const vendorRows = await db.execute(sql`
      SELECT lower(trim(domain)) AS d
      FROM vendor_custom_domains
      WHERE verified_at IS NOT NULL
         OR lower(trim(COALESCE(status, ''))) IN ('approved', 'active')
    `);
    for (const row of vendorRows.rows ?? []) {
      const d = String((row as Record<string, unknown>).d ?? "").trim();
      if (d) hosts.add(normalizePortalHostKey(d));
    }
  } catch {
    /* tablo henüz yok */
  }

  return hosts;
}

async function getRegisteredCustomDomainHosts(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedHosts && now < cacheExpiresAt) return cachedHosts;
  if (!loadPromise) {
    loadPromise = loadRegisteredCustomDomainHosts()
      .then((set) => {
        cachedHosts = set;
        cacheExpiresAt = Date.now() + CACHE_TTL_MS;
        loadPromise = null;
        return set;
      })
      .catch((err) => {
        loadPromise = null;
        throw err;
      });
  }
  return loadPromise;
}

/** HM editör + mağaza onaylı özel alan kökenleri (CORS dinamik izin listesi). */
export async function isRegisteredCustomDomainOrigin(origin: string): Promise<boolean> {
  const host = hostFromOrigin(origin);
  if (!host) return false;
  const set = await getRegisteredCustomDomainHosts();
  for (const key of expandDomainHostKeys(host)) {
    if (set.has(normalizePortalHostKey(key))) return true;
  }
  return set.has(host);
}

export function invalidateCustomDomainCorsCache(): void {
  cachedHosts = null;
  cacheExpiresAt = 0;
  loadPromise = null;
}
