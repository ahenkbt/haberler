import { describe, expect, it } from "vitest";
import {
  HM_BRAND_DOMAIN_BINDINGS,
  findHmBrandBinding,
  hmBrandMetaConflicts,
  isCleanHmBrandSiteRow,
  isKnownHmBrandDomain,
  isKnownHmBrandSlug,
  listHmBrandDomains,
} from "./hm-brand-domain-bindings.js";

describe("hm-brand-domain-bindings", () => {
  const su = HM_BRAND_DOMAIN_BINDINGS.find((b) => b.slug === "su")!;

  it("includes suhaberajansi.com → su", () => {
    expect(HM_BRAND_DOMAIN_BINDINGS.some((b) => b.domain === "suhaberajansi.com" && b.slug === "su")).toBe(
      true,
    );
    expect(listHmBrandDomains()).toContain("suhaberajansi.com");
    expect(isKnownHmBrandDomain("www.suhaberajansi.com")).toBe(true);
    expect(isKnownHmBrandSlug("su")).toBe(true);
    expect(findHmBrandBinding({ domain: "suhaberajansi.com" })?.slug).toBe("su");
  });

  it("rejects ASG id=3 as Su brand site", () => {
    expect(su.forbiddenIds).toContain(3);
    expect(
      isCleanHmBrandSiteRow(
        {
          id: 3,
          slug: "su",
          domain: "suhaberajansi.com",
          displayName: "Su Haber Ajansı",
        },
        su,
      ),
    ).toBe(false);
    expect(
      hmBrandMetaConflicts(
        { id: 3, slug: "su", domain: "suhaberajansi.com", displayName: "Su Haber Ajansı" },
        su,
      ),
    ).toBe(true);
    expect(
      isCleanHmBrandSiteRow(
        { id: 3, slug: "asg", domain: "ankarasehirgazetesi.com", displayName: "Ankara Şehir Gazetesi" },
        su,
      ),
    ).toBe(false);
  });

  it("rejects kirsehir / protected rows as Su", () => {
    expect(
      isCleanHmBrandSiteRow(
        { id: 2, slug: "kirsehir", domain: "belediyehizmet.com", displayName: "Kırşehir Haber" },
        su,
      ),
    ).toBe(false);
  });

  it("accepts independent su site id", () => {
    expect(
      isCleanHmBrandSiteRow(
        { id: 42, slug: "su", domain: "suhaberajansi.com", displayName: "Su Haber Ajansı" },
        su,
      ),
    ).toBe(true);
    expect(
      hmBrandMetaConflicts(
        { id: 42, slug: "su", domain: "suhaberajansi.com", displayName: "Su Haber Ajansı" },
        su,
      ),
    ).toBe(false);
  });
});
