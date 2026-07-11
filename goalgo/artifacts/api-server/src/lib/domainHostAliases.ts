import { normalizePortalHostKey } from "./portalBrand.js";

/**
 * TR sitelerinde sık görülen .com ↔ .com.tr kardeş alan adları.
 * Örn. ankarasehirgazetesi.com kayıtlıyken .com.tr üzerinden gelen istekler de eşleşir.
 */
export function turkishComDomainSiblingHosts(host: string | null | undefined): string[] {
  const h = normalizePortalHostKey(host);
  if (!h) return [];
  const out = new Set<string>();
  if (h.endsWith(".com.tr")) {
    const base = h.slice(0, -".com.tr".length);
    if (base && !base.includes(".")) {
      out.add(`${base}.com`);
    }
  } else if (h.endsWith(".com") && !h.endsWith(".com.tr")) {
    const base = h.slice(0, -".com".length);
    if (base && !base.includes(".")) {
      out.add(`${base}.com.tr`);
    }
  }
  return Array.from(out);
}

/** CORS / meta lookup için www varyantları dahil genişletilmiş host listesi. */
export function expandDomainHostKeys(raw: string | null | undefined): string[] {
  const host = normalizePortalHostKey(raw);
  if (!host) return [];
  const keys = new Set<string>([host, `www.${host}`]);
  for (const sibling of turkishComDomainSiblingHosts(host)) {
    keys.add(sibling);
    keys.add(`www.${sibling}`);
  }
  return Array.from(keys);
}
