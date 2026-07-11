const KEY = "yekpare:vendor-domain-meta:v1";

export type VendorDomainMetaCache = {
  slug: string;
  storefrontPath: string;
  shortPath?: string;
  themeKey?: string;
  ts: number;
};

export function readVendorDomainMetaCache(host: string): VendorDomainMetaCache | undefined {
  if (typeof window === "undefined" || !host) return undefined;
  try {
    const raw = localStorage.getItem(`${KEY}:${host.toLowerCase()}`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as VendorDomainMetaCache;
    if (!parsed?.slug || !parsed?.storefrontPath) return undefined;
    if (Date.now() - (parsed.ts ?? 0) > 7 * 24 * 60 * 60 * 1000) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export function writeVendorDomainMetaCache(host: string, meta: Omit<VendorDomainMetaCache, "ts">): void {
  if (typeof window === "undefined" || !host) return;
  try {
    localStorage.setItem(
      `${KEY}:${host.toLowerCase()}`,
      JSON.stringify({ ...meta, ts: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}
