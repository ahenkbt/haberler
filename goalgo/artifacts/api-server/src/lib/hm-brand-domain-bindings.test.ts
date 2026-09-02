import { describe, expect, it } from "vitest";
import {
  HM_BRAND_DOMAIN_BINDINGS,
  isKnownHmBrandDomain,
  isKnownHmBrandSlug,
  listHmBrandDomains,
} from "./hm-brand-domain-bindings.js";

describe("hm-brand-domain-bindings", () => {
  it("lists suhaber.net as the only Su Haber brand domain", () => {
    expect(HM_BRAND_DOMAIN_BINDINGS.some((b) => b.domain === "suhaber.net")).toBe(true);
    expect(listHmBrandDomains()).toContain("suhaber.net");
    expect(listHmBrandDomains()).not.toContain("suhaberajansi.com");
    expect(isKnownHmBrandDomain("www.suhaber.net")).toBe(true);
    expect(isKnownHmBrandDomain("www.suhaberajansi.com")).toBe(false);
    expect(isKnownHmBrandSlug("su")).toBe(true);
  });
});
