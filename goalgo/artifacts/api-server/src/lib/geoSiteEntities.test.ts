import { describe, expect, it } from "vitest";
import {
  AHENK_BT_ENTITY,
  appendGeoEntityToLlmsTxt,
  geoEntityByDomain,
  geoEntityBySlug,
  geoEntityPageTitle,
  geoEntityVisibleBodyHtml,
  geoOrganizationJsonLd,
  geoPublisherGraph,
  isAhenkAgencyGeoPath,
  isHmGeoEntityPath,
} from "./geoSiteEntities.js";

describe("geoSiteEntities", () => {
  it("resolves editor domains including vatanhaber.net", () => {
    const vatan = geoEntityByDomain("VATANHABER.NET");
    expect(vatan?.officialName).toBe("Vatan Haber");
    expect(vatan?.alternateName).toContain("vatanhaber.net");
    expect(vatan?.disambiguatingDescription).toMatch(/gazetevatan\.com/);
    expect(geoEntityBySlug("vatanhaber")?.domain).toBe("vatanhaber.net");
    expect(geoEntityByDomain("suhaber.net")?.officialName).toBe("Su Haber");
    expect(geoEntityByDomain("kirsehirhaber.org")?.officialName).toBe("Kırşehir Haber");
  });

  it("resolves ahenk.net.tr as Ahenk Bilgi Teknolojileri", () => {
    const ahenk = geoEntityByDomain("www.ahenk.net.tr");
    expect(ahenk?.officialName).toBe("Ahenk Bilgi Teknolojileri");
    expect(ahenk?.type).toBe("Organization");
    expect(AHENK_BT_ENTITY.faq.some((f) => /Yekpare/.test(f.question))).toBe(true);
  });

  it("marks homepage and hakkinda as entity paths", () => {
    expect(isHmGeoEntityPath("/")).toBe(true);
    expect(isHmGeoEntityPath("/hakkinda")).toBe(true);
    expect(isHmGeoEntityPath("/kunye")).toBe(true);
    expect(isHmGeoEntityPath("/haber/ornek")).toBe(false);
    expect(isAhenkAgencyGeoPath("/")).toBe(true);
    expect(isAhenkAgencyGeoPath("/hakkimizda")).toBe(true);
    expect(isAhenkAgencyGeoPath("/haberler")).toBe(false);
    expect(isAhenkAgencyGeoPath("/aiaddin")).toBe(true);
    expect(isAhenkAgencyGeoPath("/cagri-merkezi-crm")).toBe(true);
  });

  it("builds Googlebot HTML that names the domain", () => {
    const entity = geoEntityBySlug("vatanhaber")!;
    const html = geoEntityVisibleBodyHtml(entity, "https://vatanhaber.net");
    expect(html).toContain("vatanhaber.net");
    expect(html).toContain("gazetevatan.com");
    expect(html).toContain("Ahenk Bilgi Teknolojileri");
    expect(html).toContain("https://ahenk.net.tr");
    expect(geoEntityPageTitle(entity, "/")).toContain("vatanhaber.net");
  });

  it("emits Organization JSON-LD with alternateName", () => {
    const org = geoOrganizationJsonLd(geoEntityBySlug("vatanhaber")!, "https://vatanhaber.net");
    expect(org.alternateName).toEqual(expect.arrayContaining(["vatanhaber.net", "VATANHABER.NET"]));
    expect(org["@type"]).toEqual(["NewsMediaOrganization", "Organization"]);
    const graph = geoPublisherGraph(AHENK_BT_ENTITY, "https://ahenk.net.tr", { path: "/" });
    expect(graph.some((n) => n["@type"] === "FAQPage")).toBe(true);
    const llms = appendGeoEntityToLlmsTxt("# Vatan Haber", geoEntityBySlug("vatanhaber")!);
    expect(llms).toContain("Google AI / GEO varlık");
    expect(llms).toContain("vatanhaber.net");
  });
});
