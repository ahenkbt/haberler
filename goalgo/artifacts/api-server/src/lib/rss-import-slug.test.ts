import { describe, expect, it } from "vitest";
import { isLegacyRssNumericSlug, stableRssNewsSlug } from "./rss-import-slug.js";

describe("rss-import-slug", () => {
  it("detects legacy rss-{id} slugs", () => {
    expect(isLegacyRssNumericSlug("rss-340170")).toBe(true);
    expect(isLegacyRssNumericSlug("ankara-trafik-duzenlemesi")).toBe(false);
    expect(isLegacyRssNumericSlug("haber-basligi-abc123")).toBe(false);
  });

  it("builds title-based stable slugs", () => {
    const a = stableRssNewsSlug("Mamak'ta trafik", "https://example.com/haber/1", 3);
    const b = stableRssNewsSlug("Mamak'ta trafik", "https://example.com/haber/1", 3);
    expect(a).toBe(b);
    expect(a).toMatch(/^mamak/);
    expect(a).toContain("-s3-");
    expect(isLegacyRssNumericSlug(a)).toBe(false);
  });
});
