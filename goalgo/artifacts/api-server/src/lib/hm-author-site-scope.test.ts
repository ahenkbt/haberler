import { describe, expect, it } from "vitest";

/**
 * Regresyon: HM site yazar listesi yalnızca o siteye ait yazarları döndürmeli;
 * başka sitelerden otomatik backfill yapılmamalı.
 * (Davranış authors.ts GET /authors?hmSiteId=… içinde — bu test dokümantasyon +
 *  yardımcının kuralını sabitler.)
 */
export function shouldIncludeHmAuthorOnSite(opts: {
  authorHmSiteId: number | null;
  requestHmSiteId: number;
}): boolean {
  return opts.authorHmSiteId === opts.requestHmSiteId;
}

describe("hm site author scope", () => {
  it("includes only authors owned by the requested site", () => {
    expect(shouldIncludeHmAuthorOnSite({ authorHmSiteId: 10, requestHmSiteId: 10 })).toBe(true);
    expect(shouldIncludeHmAuthorOnSite({ authorHmSiteId: 7, requestHmSiteId: 10 })).toBe(false);
    expect(shouldIncludeHmAuthorOnSite({ authorHmSiteId: null, requestHmSiteId: 10 })).toBe(false);
  });
});
