import { describe, expect, it } from "vitest";

/**
 * Regresyon: HM site yazar listesi yalnızca o siteye ait yazarları döndürmeli;
 * başka sitelerden otomatik backfill yapılmamalı.
 */
export function shouldIncludeHmAuthorOnSite(opts: {
  authorHmSiteId: number | null;
  requestHmSiteId: number;
}): boolean {
  return opts.authorHmSiteId === opts.requestHmSiteId;
}

/** Otomatik dağıtım çağrıları explicitAdminAction olmadan reddedilmeli. */
export function assertExplicitAdminAuthorDistribute(opts: { explicitAdminAction?: boolean } | undefined): void {
  if (opts?.explicitAdminAction !== true) {
    throw new Error("distributeAuthorArticlesToHmSites: explicitAdminAction gerekli (otomatik dağıtım kapalı)");
  }
}

describe("hm site author scope", () => {
  it("includes only authors owned by the requested site", () => {
    expect(shouldIncludeHmAuthorOnSite({ authorHmSiteId: 10, requestHmSiteId: 10 })).toBe(true);
    expect(shouldIncludeHmAuthorOnSite({ authorHmSiteId: 7, requestHmSiteId: 10 })).toBe(false);
    expect(shouldIncludeHmAuthorOnSite({ authorHmSiteId: null, requestHmSiteId: 10 })).toBe(false);
  });

  it("rejects automatic cross-site author distribute without explicit admin flag", () => {
    expect(() => assertExplicitAdminAuthorDistribute(undefined)).toThrow(/explicitAdminAction/);
    expect(() => assertExplicitAdminAuthorDistribute({})).toThrow(/explicitAdminAction/);
    expect(() => assertExplicitAdminAuthorDistribute({ explicitAdminAction: true })).not.toThrow();
  });
});
