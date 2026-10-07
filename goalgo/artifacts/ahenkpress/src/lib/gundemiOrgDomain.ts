/** Admin panel — *.gundemi.org domain tespiti (DNS/PHP auto-provision ipucu). */

const GUNDEMI_ZONE = "gundemi.org";

export function normalizeGundemiOrgHost(raw: string | null | undefined): string | null {
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

export function isGundemiOrgDomain(raw: string | null | undefined): boolean {
  const host = normalizeGundemiOrgHost(raw);
  if (!host) return false;
  if (host === GUNDEMI_ZONE) return true;
  return host.endsWith(`.${GUNDEMI_ZONE}`);
}

export function collectGundemiOrgDomainsFromForm(domains: {
  domain?: string;
  domain2?: string;
  domain3?: string;
}): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [domains.domain, domains.domain2, domains.domain3]) {
    const h = normalizeGundemiOrgHost(raw);
    if (!h || !isGundemiOrgDomain(h) || seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out;
}
