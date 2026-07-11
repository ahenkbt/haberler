import { describe, expect, it } from "vitest";
import { toHmInternalTrPath } from "@/lib/hmCustomDomainCleanPath";
import { hmPublicHref } from "@/lib/hmPublicLinks";
import { isHmCustomDomainInfrastructurePath } from "@/lib/hmCustomDomainTrPath";

describe("hmCustomDomainTrPath — harita kök yolları", () => {
  it("treats /maps and /map as infrastructure on custom domains", () => {
    expect(isHmCustomDomainInfrastructurePath("/maps")).toBe(true);
    expect(isHmCustomDomainInfrastructurePath("/map")).toBe(true);
    expect(isHmCustomDomainInfrastructurePath("/maps/place/foo/@41,29,13z")).toBe(true);
  });

  it("routes /newsmap and /haritalar to the HM site route on custom domains", () => {
    expect(isHmCustomDomainInfrastructurePath("/newsmap")).toBe(false);
    expect(isHmCustomDomainInfrastructurePath("/haritalar")).toBe(false);
    expect(toHmInternalTrPath("/newsmap", "vatanhaber")).toBe("/tr/vatanhaber/newsmap");
    expect(toHmInternalTrPath("/haritalar", "vatanhaber")).toBe("/tr/vatanhaber/haritalar");
  });

  it("does not prefix /maps with /tr/{slug} for wouter on custom domain", () => {
    expect(toHmInternalTrPath("/maps", "vatanhaber")).toBeNull();
    expect(toHmInternalTrPath("/maps?city=ankara", "vatanhaber")).toBeNull();
  });

  it("hmPublicHref keeps /maps at domain root for editor custom domain", () => {
    const href = hmPublicHref("/maps", {
      domain: "vatanhaber.net",
      slug: "vatanhaber",
      siteId: 42,
    });
    expect(href).toBe("https://vatanhaber.net/maps");
  });
});
