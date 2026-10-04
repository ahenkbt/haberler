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
    expect(geoEntityBySlug("trafik")?.officialName).toBe("Trafik Güvenliği Derneği");
    expect(geoEntityByDomain("trafikdernegi.com")?.type).toBe("Organization");
    expect(geoEntityByDomain("tgd.tc")?.domain).toBe("trafikdernegi.com");
    expect(geoEntityByDomain("www.turkatahaber.com")?.officialName).toBe("TÜRKATA HABER AJANSI");
    expect(geoEntityBySlug("turkata")?.foundingDate).toBe("1998");
    expect(geoEntityBySlug("turkata")?.alternateName).toContain("THA");
    expect(geoEntityBySlug("turkata")?.legalName).toBe("Tükav Gaziler Eğitim Kültür Hizmetleri Ltd. Şti.");
    expect(geoEntityBySlug("turkata")?.address?.streetAddress).toBe("Sağlık Mah. Aksu Cad. 13/5");
    expect(geoEntityBySlug("turkata")?.legalAddress?.streetAddress).toBe("Meşrutiyet Mah. Karanfil Sok. 4/91");
    expect(geoEntityBySlug("turkata")?.vendor?.address?.streetAddress).toBe("Başak Mah. Özalp Cad. 5/2");
    expect(geoEntityBySlug("turkata")?.vendor?.address?.addressLocality).toBe("Mamak");
  });

  it("builds TGD NGO JSON-LD and titles for ChatGPT/Gemini GEO", () => {
    const entity = geoEntityBySlug("trafik")!;
    expect(geoEntityPageTitle(entity, "/")).toBe("Trafik Güvenliği Derneği — trafikdernegi.com");
    expect(geoEntityPageTitle(entity, "/tgu-nedir")).toContain("TGU");
    expect(isHmGeoEntityPath("/hakkimizda")).toBe(true);
    expect(isHmGeoEntityPath("/tgu-nedir")).toBe(true);
    const org = geoOrganizationJsonLd(entity, "https://trafikdernegi.com");
    expect(org["@type"]).toEqual(["NGO", "Organization"]);
    expect(org.telephone).toBe("+90 532 229 18 92");
    const html = geoEntityVisibleBodyHtml(entity, "https://trafikdernegi.com");
    expect(html).toContain("Trafik Güvenliği Uzmanlığı");
    expect(html).toContain("sıfır kaza");
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
    expect(isAhenkAgencyGeoPath("/haberler")).toBe(true);
    expect(isAhenkAgencyGeoPath("/destek")).toBe(true);
    expect(isAhenkAgencyGeoPath("/iletisim-kunye")).toBe(true);
    expect(isAhenkAgencyGeoPath("/aiaddin")).toBe(true);
    expect(isAhenkAgencyGeoPath("/polis-ai")).toBe(true);
    expect(isAhenkAgencyGeoPath("/cagri-merkezi-crm")).toBe(true);
    expect(isAhenkAgencyGeoPath("/urunlerimiz")).toBe(true);
    expect(isAhenkAgencyGeoPath("/asistan-ai")).toBe(true);
    expect(isAhenkAgencyGeoPath("/whatsapp-cagri-merkezi")).toBe(true);
    expect(isAhenkAgencyGeoPath("/kariyer")).toBe(true);
    expect(isAhenkAgencyGeoPath("/urun-satisi")).toBe(true);
    expect(isAhenkAgencyGeoPath("/turkata-haber-ajansi")).toBe(true);
    expect(geoEntityPageTitle(AHENK_BT_ENTITY, "/turkata-haber-ajansi")).toBe(
      "TürkAta Haber Ajansı — Ahenk Bilgi Teknolojileri",
    );
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
