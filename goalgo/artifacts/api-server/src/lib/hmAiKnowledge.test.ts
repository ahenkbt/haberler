import { describe, expect, it } from "vitest";
import { buildHmAiTxt, buildHmLlmsTxt } from "./hmAiKnowledge.js";

describe("hmAiKnowledge", () => {
  it("uses the request origin so suhaber.net / vatanhaber.net stay canonical", () => {
    const llms = buildHmLlmsTxt(
      { slug: "su", displayName: "Su Haber", domain: "suhaberajansi.com" },
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
  });
});
