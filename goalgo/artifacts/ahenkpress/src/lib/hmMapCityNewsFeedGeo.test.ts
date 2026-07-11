import { describe, expect, it } from "vitest";
import { findLocationForHybridNewsItem } from "@/lib/hmMapCityNews";
import type { HomeHybridNewsItem } from "@/hooks/useHomeHybridNews";

describe("hmMapCityNews feed geo fallback", () => {
  it("assigns province from feed geo when title has no city mention", () => {
    const item: HomeHybridNewsItem = {
      id: "rss:test",
      title: "Son dakika gelişme",
      href: "/haberler/rss/test",
      source: "rss",
      geoLat: 39.9055,
      geoLng: 41.2658,
      regionKey: "tr-erzurum",
      regionLabel: "Erzurum",
      countryCode: "TR",
    };
    const loc = findLocationForHybridNewsItem(item, []);
    expect(loc?.label).toBe("Erzurum");
    expect(loc?.lat).toBeCloseTo(39.9055, 3);
    expect(loc?.lng).toBeCloseTo(41.2658, 3);
    expect(loc?.countryCode).toBe("TR");
  });

  it("prefers text match over feed geo", () => {
    const item: HomeHybridNewsItem = {
      id: "rss:test2",
      title: "Van'da deprem",
      href: "/haberler/rss/test2",
      source: "rss",
      geoLat: 41.0082,
      geoLng: 28.9784,
      regionKey: "tr-istanbul",
      regionLabel: "İstanbul",
      countryCode: "TR",
    };
    const loc = findLocationForHybridNewsItem(item, [
      {
        key: "van",
        label: "Van",
        searchTerms: ["Van"],
        lat: 38.4891,
        lng: 43.4089,
        zoom: 12,
        countryCode: "TR",
        kind: "tr-province",
      },
    ]);
    expect(loc?.label).toBe("Van");
  });
});
