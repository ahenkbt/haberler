/**
 * HM domain → site: primary `domain` wins over another row's `domain2` / `domain3`.
 */

export function normalizeHmDomainHost(raw: string | null | undefined): string {
  return (
    String(raw ?? "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      ?.split(":")[0]
      ?.replace(/^www\./, "")
      ?.replace(/\.$/, "") ?? ""
  );
}

export type HmDomainTriadRow = {
  id?: number | null;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
};

/** Lower rank = stronger binding (0 = primary domain). */
export function hmDomainSlotRank(row: HmDomainTriadRow, lookupHost: string): number | null {
  const h = normalizeHmDomainHost(lookupHost);
  if (!h) return null;
  if (normalizeHmDomainHost(row.domain) === h) return 0;
  if (normalizeHmDomainHost(row.domain2) === h) return 1;
  if (normalizeHmDomainHost(row.domain3) === h) return 2;
  return null;
}

export function pickHmNewsSiteByDomainPriority<T extends HmDomainTriadRow>(
  rows: T[],
  lookupHosts: string[],
): T | undefined {
  if (!rows.length || !lookupHosts.length) return undefined;
  let best: T | undefined;
  let bestRank = 99;
  let bestId = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    for (const host of lookupHosts) {
      const rank = hmDomainSlotRank(row, host);
      if (rank === null) continue;
      const id = Number(row.id);
      const rowId = Number.isFinite(id) ? id : Number.POSITIVE_INFINITY;
      if (rank < bestRank || (rank === bestRank && rowId < bestId)) {
        best = row;
        bestRank = rank;
        bestId = rowId;
      }
    }
  }
  return best;
}

export function hmLayoutLogoUsesInlineDataUrl(layoutJson: string | null | undefined): boolean {
  if (layoutJson == null || !String(layoutJson).trim()) return false;
  try {
    const layout = JSON.parse(String(layoutJson)) as Record<string, unknown>;
    for (const key of ["logoUrl", "logo", "faviconUrl", "favicon"]) {
      const v = layout[key];
      if (typeof v === "string" && v.trim().toLowerCase().startsWith("data:image/")) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
