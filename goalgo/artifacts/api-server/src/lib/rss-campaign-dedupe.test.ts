import { describe, expect, it } from "vitest";
import {
  campaignRequiresCoverImage,
  campaignWritesPerHmSite,
  findDuplicateNews,
  isMidnightTrCampaign,
  newsHasCoverImage,
  rssCampaignItemLimit,
  shouldUpgradeMissingImage,
  sortByPublishedAtAsc,
} from "./rss-campaign-dedupe.js";

describe("RSS kampanya dedupe + görsel yükseltme", () => {
  const existing = [
    { id: 1, rssSourceUrl: "https://sehirhaberajansi.com.tr/haber/belediye-toplanti", title: "Belediye toplantısı yapıldı", imageUrl: null },
    { id: 2, rssSourceUrl: "https://other.test/a", title: "Tamamen farklı spor skoru", imageUrl: "https://cdn.test/a.jpg" },
  ];

  it("aynı rss_source_url / kanonik link ile tekrar eklemez", () => {
    const hit = findDuplicateNews(
      existing,
      "https://www.sehirhaberajansi.com.tr/haber/belediye-toplanti?utm_source=rss",
      "Başka başlık",
    );
    expect(hit?.id).toBe(1);
  });

  it("başlık benzerliği ile tekrar eklemez", () => {
    const hit = findDuplicateNews(existing, "https://sehirhaberajansi.com.tr/haber/yeni", "Belediye toplantısı yapıldı");
    expect(hit?.id).toBe(1);
  });

  it("görseli olmayan kopyayı SHA görseli ile yükseltir", () => {
    expect(newsHasCoverImage(null)).toBe(false);
    expect(newsHasCoverImage("https://sehirhaberajansi.com.tr/img/a.jpg")).toBe(true);
    expect(shouldUpgradeMissingImage(null, "https://sehirhaberajansi.com.tr/img/a.jpg")).toBe(true);
    expect(shouldUpgradeMissingImage("https://cdn.test/a.jpg", "https://sha.test/b.jpg")).toBe(false);
  });

  it("Vatanhaber Ankara kampanyası yalnızca resimli haber ister", () => {
    expect(campaignRequiresCoverImage(["require-image"], [])).toBe(true);
    expect(campaignRequiresCoverImage([], ["https://vatanhaber.net/kategori/ankara"])).toBe(true);
    expect(campaignRequiresCoverImage(["ntv"], ["https://www.ntv.com.tr/gundem.rss"])).toBe(false);
  });

  it("öğeleri yayın tarihine göre eskiden yeniye sıralar", () => {
    const sorted = sortByPublishedAtAsc([
      { publishedAt: new Date("2026-09-12T10:00:00Z"), title: "yeni" },
      { publishedAt: new Date("2026-09-11T08:00:00Z"), title: "eski" },
    ]);
    expect(sorted.map((i) => i.title)).toEqual(["eski", "yeni"]);
  });

  it("dailyLimit tavanını 30 ile kesmez (SHA gece çekimi)", () => {
    expect(rssCampaignItemLimit(80)).toBe(80);
    expect(rssCampaignItemLimit(0)).toBe(20);
    expect(rssCampaignItemLimit(500)).toBe(200);
  });

  it("gece 00:00 TR kampanyasını etiket / SHA feed / 1440 dk ile tanır", () => {
    expect(isMidnightTrCampaign({ active: true, tags: ["midnight-tr"] })).toBe(true);
    expect(
      isMidnightTrCampaign({
        active: true,
        tags: [],
        feeds: ["https://sehirhaberajansi.com.tr/rss.php"],
      }),
    ).toBe(true);
    expect(isMidnightTrCampaign({ active: true, intervalMinutes: 1440, tags: [], feeds: [] })).toBe(true);
    expect(isMidnightTrCampaign({ active: false, tags: ["midnight-tr"] })).toBe(false);
    expect(isMidnightTrCampaign({ active: true, tags: ["ntv"], intervalMinutes: 30, feeds: [] })).toBe(false);
  });

  it("SHA + Vatanhaber her siteye yazar; diğer kampanyalar shared havuza gider", () => {
    expect(
      campaignWritesPerHmSite({
        tags: ["sehirhaberajansi", "midnight-tr"],
        name: "Şehir Haber Ajansı → ASG + AHG",
      }),
    ).toBe(true);
    expect(
      campaignWritesPerHmSite({
        tags: [],
        feeds: ["https://sehirhaberajansi.com.tr/rss.php?kategori=yerel"],
      }),
    ).toBe(true);
    expect(campaignWritesPerHmSite({ tags: ["vatanhaber-ankara"], feeds: [] })).toBe(true);
    expect(
      campaignWritesPerHmSite({
        tags: ["ntv"],
        feeds: ["https://www.ntv.com.tr/gundem.rss"],
        name: "NTV",
      }),
    ).toBe(false);
  });
});
