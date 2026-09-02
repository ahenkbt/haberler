import { describe, expect, it } from "vitest";
import { newsArticleJsonLd, newsMediaOrganizationJsonLd, newsWebSiteJsonLd } from "./portal-json-ld.js";

describe("portal-json-ld GEO / news publisher", () => {
  it("marks NewsArticle as Turkish and free to read", () => {
    const ld = newsArticleJsonLd({
      origin: "https://vatanhaber.net",
      path: "/haber/ornek",
      headline: "Örnek haber",
      description: "Spot",
      publisherName: "Vatan Haber",
    });
    expect(ld["@type"]).toBe("NewsArticle");
    expect(ld.inLanguage).toBe("tr-TR");
    expect(ld.isAccessibleForFree).toBe(true);
    expect((ld.contentLocation as { name: string }).name).toBe("Türkiye");
    expect((ld.publisher as { "@type": string })["@type"]).toBe("NewsMediaOrganization");
  });

  it("builds NewsMediaOrganization + WebSite for HM publishers", () => {
    const org = newsMediaOrganizationJsonLd({
      origin: "https://vatanhaber.net",
      name: "Vatan Haber",
      description: "Güncel haber",
    });
    expect(org["@type"]).toEqual(["NewsMediaOrganization", "Organization"]);
    expect((org.areaServed as { name: string }).name).toBe("Türkiye");

    const site = newsWebSiteJsonLd({
      origin: "https://suhaber.net",
      name: "Su Haber",
    });
    expect(site["@type"]).toBe("WebSite");
    expect((site.potentialAction as { target: string }).target).toContain("https://suhaber.net/ara");
  });
});
