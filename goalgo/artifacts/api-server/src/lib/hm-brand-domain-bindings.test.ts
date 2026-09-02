import { describe, expect, it } from "vitest";
import {
  HM_BRAND_DOMAIN_BINDINGS,
  isKnownHmBrandDomain,
  isKnownHmBrandSlug,
  listHmBrandDomains,
} from "./hm-brand-domain-bindings.js";

describe("hm-brand-domain-bindings", () => {
  it("lists suhaber.net as canonical brand domain (suhaberajansi.com remains alias)", () => {
    expect(HM_BRAND_DOMAIN_BINDINGS.some((b) => b.domain === "suhaber.net")).toBe(true);
    expect(listHmBrandDomains()).toContain("suhaber.net");
    expect(listHmBrandDomains()).toContain("suhaberajansi.com");
    expect(isKnownHmBrandDomain("www.suhaber.net")).toBe(true);
    expect(isKnownHmBrandDomain("www.suhaberajansi.com")).toBe(true);
    expect(isKnownHmBrandSlug("su")).toBe(true);
  });
});
