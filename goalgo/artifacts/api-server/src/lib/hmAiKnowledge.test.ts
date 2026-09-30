import { describe, expect, it } from "vitest";
import { buildAhenkAiTxt, buildAhenkLlmsTxt, buildHmAiTxt, buildHmLlmsTxt } from "./hmAiKnowledge.js";

describe("hmAiKnowledge", () => {
  it("uses the request origin so suhaber.net / vatanhaber.net stay canonical", () => {
    const llms = buildHmLlmsTxt(
      { slug: "su", displayName: "Su Haber", domain: "suhaber.net" },
      "https://suhaber.net",
    );
    expect(llms).toContain("# Su Haber");
    expect(llms).toContain("https://suhaber.net/sitemap.xml");
    expect(llms).toContain("https://suhaber.net/google-news.xml");
    expect(llms).toContain("NewsMediaOrganization");
    expect(llms).not.toContain("https://suhaberajansi.com/sitemap.xml");

    const ai = buildHmAiTxt(
      { slug: "vatanhaber", displayName: "Vatan Haber", domain: "vatanhaber.net" },
      "https://vatanhaber.net",
    );
    expect(ai).toContain("site_name: Vatan Haber");
    expect(ai).toContain("geo.region: TR");
    expect(ai).toContain("https://vatanhaber.net/google-news.xml");
    expect(ai).toContain("gazetevatan.com");
    expect(llms).toContain("/hakkinda");
    expect(llms).toContain("Google AI / GEO varlık");
  });

  it("builds Ahenk BT knowledge files for ahenk.net.tr", () => {
    const llms = buildAhenkLlmsTxt("https://ahenk.net.tr");
    expect(llms).toContain("Ahenk Bilgi Teknolojileri");
    expect(llms).toContain("ahenk.net.tr");
    expect(llms).toContain("Yekpare");
    const ai = buildAhenkAiTxt("https://ahenk.net.tr");
    expect(ai).toContain("site_type: organization");
    expect(ai).toContain("canonical_domain: ahenk.net.tr");
  });

  it("builds Trafik Güvenliği Derneği GEO files for Gemini/ChatGPT", () => {
    const llms = buildHmLlmsTxt(
      {
        slug: "trafik",
        displayName: "Trafik Güvenliği Derneği",
        domain: "trafikdernegi.com",
        description: "Yolumuz Hayat, Önceliğimiz Güvenlik.",
      },
      "https://trafikdernegi.com",
    );
    expect(llms).toContain("Trafik Güvenliği Derneği");
    expect(llms).toContain("https://trafikdernegi.com/tgu-nedir");
    expect(llms).toContain("Seviye 1 Uygulayıcı");
    expect(llms).toContain("NGO");
    expect(llms).toContain("sivil toplum");
    expect(llms).not.toContain("Tür: NewsMediaOrganization\n");

    const ai = buildHmAiTxt(
      { slug: "trafik", displayName: "Trafik Güvenliği Derneği", domain: "trafikdernegi.com" },
      "https://trafikdernegi.com",
    );
    expect(ai).toContain("site_type: ngo_organization");
    expect(ai).toContain("canonical_domain: trafikdernegi.com");
    expect(ai).toContain("tgu_nedir: https://trafikdernegi.com/tgu-nedir");
    expect(ai).toContain("+90 532 229 18 92");
  });
});
