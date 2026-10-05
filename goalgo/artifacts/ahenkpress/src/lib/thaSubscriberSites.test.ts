import { describe, expect, it } from "vitest";
import { thaSubscriberHref, thaSubscriberSites } from "./thaSubscriberSites";

describe("THA abone haber siteleri", () => {
  it("yayındaki haber sitelerini tutar, askı ve kurumsalı çıkarır, slug’u teke indirir", () => {
    const rows = thaSubscriberSites([
      { slug: "vatanhaber", displayName: "Vatan Haber", domain: "vatanhaber.net", logoUrl: "/v.png", newsSite: true },
      { slug: "kirsehirhaber", displayName: "Kırşehir", domain: "kirsehirhaber.org", logoUrl: null, newsSite: true, publicSuspended: true },
      { slug: "vkd", displayName: "VKD", domain: "vatankahramanlari.org", logoUrl: "/vkd.png", newsSite: false },
      { slug: "trafik", displayName: "TGD", domain: "trafikdernegi.com", logoUrl: "/t.png", newsSite: true },
      { slug: "tr", displayName: "Vakıf", domain: "tukav.org", logoUrl: "/v.png", newsSite: true },
      { slug: "asg", displayName: "ASG", domain: "ankarasehirgazetesi.com", logoUrl: null, newsSite: true },
      { slug: "asg", displayName: "ASG", domain: "ankarasehirgazetesi.com", logoUrl: "/asg.png", newsSite: true },
    ]);
    expect(rows.map((site) => site.slug)).toEqual(["vatanhaber", "asg"]);
    expect(rows[1]?.logoUrl).toBe("/asg.png");
  });

  it("logoya tıklanınca sitenin alan adına gider", () => {
    expect(thaSubscriberHref({ slug: "su", displayName: "Su", domain: "https://www.suhaber.net/" })).toBe(
      "https://suhaber.net",
    );
    expect(thaSubscriberHref({ slug: "yeni", displayName: "Yeni", domain: null })).toContain("/tr/yeni");
  });
});
