/**
 * brand-shift 2026-10-11: pure panel-row → PHP-row matcher (no DB). See phpSiteResolve.ts.
 * Panel ids ≠ PHP ids; match only by canonical domain (then domain2/3), by slug only when the panel row has no domain.
 */
export type PanelSiteKeys = {
  id?: number | null;
  slug?: string | null;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
};

export type PhpSiteCandidate = PanelSiteKeys & { id: number; active?: boolean | null };

export type PhpSiteResolution =
  | { ok: true; phpSiteId: number; matchedBy: "domain" | "slug" }
  | { ok: false; reason: string };

export function normalizeSiteHost(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .replace(/^www\./, "")
    .replace(/\.$/, "");
}

export function hostsOf(row: PanelSiteKeys): string[] {
  return [row.domain, row.domain2, row.domain3].map(normalizeSiteHost).filter((h) => h.length > 0);
}

/** Pure matcher (also used for batch reads): panel row → unique PHP candidate by domain, else by slug when domainless. */
export function matchPhpSiteRow(panel: PanelSiteKeys, candidates: readonly PhpSiteCandidate[]): PhpSiteResolution {
  const hosts = hostsOf(panel);
  if (hosts.length > 0) {
    const canonical = hosts[0];
    const hits = candidates.filter((c) => hostsOf(c).some((h) => hosts.includes(h)));
    const ids = [...new Set(hits.map((c) => c.id))];
    if (ids.length === 1) return { ok: true, phpSiteId: ids[0], matchedBy: "domain" };
    if (ids.length > 1) {
      const byCanonical = [...new Set(hits.filter((c) => normalizeSiteHost(c.domain) === canonical).map((c) => c.id))];
      if (byCanonical.length === 1) return { ok: true, phpSiteId: byCanonical[0], matchedBy: "domain" };
      const activeCanonical = [
        ...new Set(hits.filter((c) => c.active !== false && normalizeSiteHost(c.domain) === canonical).map((c) => c.id)),
      ];
      if (activeCanonical.length === 1) return { ok: true, phpSiteId: activeCanonical[0], matchedBy: "domain" };
      return { ok: false, reason: `PHP satırı belirsiz: ${canonical} birden çok PHP sitesinde (${ids.join(", ")})` };
    }
    return { ok: false, reason: `PHP satırı bulunamadı: ${canonical} alan adı PHP veritabanında yok` };
  }
  const slug = String(panel.slug ?? "").trim().toLowerCase();
  if (!slug) return { ok: false, reason: "PHP satırı eşlenemedi: alan adı ve slug yok" };
  const bySlug = [...new Set(candidates.filter((c) => String(c.slug ?? "").trim().toLowerCase() === slug).map((c) => c.id))];
  if (bySlug.length === 1) return { ok: true, phpSiteId: bySlug[0], matchedBy: "slug" };
  return { ok: false, reason: bySlug.length ? `PHP satırı belirsiz: slug ${slug}` : `PHP satırı bulunamadı: slug ${slug}` };
}

