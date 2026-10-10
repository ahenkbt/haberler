import { describe, expect, it } from "vitest";
import { buildCenterMansetSliderPool, buildRssAwareHeadlinePool } from "./hmHeadlinePool";
import { isOppositionNewsItem, prioritizeOppositionHeadlineItems, sitePrefersOppositionManset } from "./hmOppositionSources";

describe("muhalif manşet önceliği", () => {
  const ntv = {
    id: 1,
    title: "ntv",
    rssSourceUrl: "https://www.ntv.com.tr/haber/1",
    createdAt: "2026-10-10T12:00:00.000Z",
    source: "rss",
    href: "/haberler/rss/1",
  };
  const birgun = {
    id: 2,
    title: "birgun",
    rssSourceUrl: "https://www.birgun.net/haber/2",
    createdAt: "2026-10-10T09:00:00.000Z",
    source: "rss",
    href: "/haberler/rss/2",
  };

  it("muhalif hostu tanır, normal akış sırasını yalnız istenince değiştirir", () => {
    expect(isOppositionNewsItem(birgun)).toBe(true);
    expect(isOppositionNewsItem(ntv)).toBe(false);
    expect(isOppositionNewsItem({ rssSourceUrl: "https://www.karar.com/haber/1" })).toBe(false);
    expect(isOppositionNewsItem({ rssSourceUrl: "https://www.karar.com.tr/rss" })).toBe(false);
    expect(sitePrefersOppositionManset("sol")).toBe(true);
    expect(sitePrefersOppositionManset("sag")).toBe(false);
    expect(sitePrefersOppositionManset("karma")).toBe(false);
    expect(sitePrefersOppositionManset(null)).toBe(false);
    expect(sitePrefersOppositionManset(undefined)).toBe(false);
    const items = [ntv, birgun];
    expect(prioritizeOppositionHeadlineItems(items).map((item) => item.title)).toEqual(["birgun", "ntv"]);
  });

  it("sol manşet havuzu muhalif kaynağı öne alır", () => {
    const manual = {
      id: 3,
      title: "manuel",
      isEditorManual: true,
      isSiteManset: true,
      createdAt: "2026-10-10T11:00:00.000Z",
      imageUrl: "https://cdn.example/m.jpg",
    };
    const pool = buildRssAwareHeadlinePool({
      manualItems: [manual],
      latestItems: [ntv, birgun],
      rssEnabled: true,
      rssBootstrapReady: true,
      preferOppositionSources: true,
      limit: 5,
    });
    expect(pool[0]?.title).toBe("birgun");
    const plain = buildRssAwareHeadlinePool({
      manualItems: [manual],
      latestItems: [ntv, birgun],
      rssEnabled: true,
      rssBootstrapReady: true,
      limit: 5,
    });
    expect(plain.some((item) => item.title === "birgun")).toBe(true);
    expect(plain[0]?.title).not.toBe("birgun");
  });

  it("orta manşet seçimi sol sitede muhalif DB satırını öne alır", () => {
    const olderOpposition = {
      id: 4,
      title: "cumhuriyet",
      isEditorManual: true,
      rssSourceUrl: "https://www.cumhuriyet.com.tr/haber/4",
      createdAt: "2026-10-09T08:00:00.000Z",
    };
    const newer = {
      id: 5,
      title: "aa",
      isEditorManual: true,
      rssSourceUrl: "https://www.aa.com.tr/tr/guncel/5",
      createdAt: "2026-10-10T12:00:00.000Z",
    };
    const sol = buildCenterMansetSliderPool({
      manualItems: [],
      latestItems: [newer, olderOpposition],
      preferOppositionSources: true,
      limit: 5,
    });
    expect(sol.map((item) => item.title)[0]).toBe("cumhuriyet");
    const sag = buildCenterMansetSliderPool({
      manualItems: [],
      latestItems: [newer, olderOpposition],
      limit: 5,
    });
    expect(sag.map((item) => item.title)[0]).toBe("aa");
  });
});
