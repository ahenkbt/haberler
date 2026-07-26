import { describe, expect, it } from "vitest";
import {
  HM_BRAND_DOMAIN_BINDINGS,
  isKnownHmBrandDomain,
  isKnownHmBrandSlug,
  listHmBrandDomains,
} from "./hm-brand-domain-bindings.js";

describe("hm-brand-domain-bindings", () => {
  it("lists suhaberajansi.com as known brand domain (admin owns assignment)", () => {
    expect(HM_BRAND_DOMAIN_BINDINGS.some((b) => b.domain === "suhaberajansi.com")).toBe(true);
    expect(listHmBrandDomains()).toContain("suhaberajansi.com");
    expect(isKnownHmBrandDomain("www.suhaberajansi.com")).toBe(true);
    expect(isKnownHmBrandSlug("su")).toBe(true);
  });
});
