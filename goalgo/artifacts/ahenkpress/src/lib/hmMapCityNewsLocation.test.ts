import { describe, expect, it } from "vitest";
import type { HomeHybridNewsItem } from "@/hooks/useHomeHybridNews";
import {
  buildHmMapCityHeadlines,
  dedupeHybridNewsItemsForMap,
  findLocationForHybridNewsItem,
  hasTurkishCapitalInstitutionKeyword,
  resolveHeadlineLocationFromText,
  resolveLocationForHybridNewsItem,
} from "@/lib/hmMapCityNews";
import { allHaberHaritasiMatchLocations } from "@/lib/haberHaritasiLocations";

function hybridItem(partial: Partial<HomeHybridNewsItem> & Pick<HomeHybridNewsItem, "title">): HomeHybridNewsItem {
  return {
    id: partial.id ?? partial.title,
    href: partial.href ?? `/haberler/rss/${partial.id ?? "test"}`,
    source: partial.source ?? "rss",
    ...partial,
  };
}

describe("hmMapCityNews location resolution", () => {
  const ilCenters = [{ adi: "Ankara", lat: 39.9334, lng: 32.8597, zoom: 10 }];
  const locations = allHaberHaritasiMatchLocations(ilCenters);

  it("detects TBMM and Meclis as Ankara", () => {
    expect(hasTurkishCapitalInstitutionKeyword("Er Gaziler Meclis'ten ayrıldı")).toBe(true);
    expect(hasTurkishCapitalInstitutionKeyword("ER GAZİLERİMİZDEN TBMM'YE ZİYARET")).toBe(true);

    const loc = findLocationForHybridNewsItem(
      hybridItem({ title: "Er Gaziler Meclis'ten yasal düzenleme bekliyor" }),
      locations,
    );
    expect(loc?.label).toBe("Ankara");
  });

  it("prefers Ankara from text over Denizli feed geo", () => {
    const item = hybridItem({
      title: "Er Gaziler Meclis'ten yasal düzenleme bekliyor",
      geoLat: 37.7765,
      geoLng: 29.0864,
      regionKey: "tr-denizli",
      regionLabel: "Denizli",
      countryCode: "TR",
    });
    const resolved = resolveLocationForHybridNewsItem(item, locations);
    expect(resolved?.location.label).toBe("Ankara");
    expect(resolved?.source).toBe("institution");
  });

  it("blocks Afghanistan feed geo for Turkish TBMM headline", () => {
    const item = hybridItem({
      title: "ER GAZİLERİMİZDEN TBMM'YE ZİYARET",
      geoLat: 34.5553,
      geoLng: 69.2075,
      regionKey: "afghanistan",
      regionLabel: "Afganistan",
      countryCode: "AF",
    });
    const loc = findLocationForHybridNewsItem(item, locations);
    expect(loc?.label).toBe("Ankara");
    expect(loc?.countryCode).toBe("TR");
  });

  it("dedupes syndicated story and keeps single Ankara marker", () => {
    const sharedTitle = "Er Gaziler Meclis'ten yasal düzenleme bekliyor";
    const sharedUrl = "https://www.sozcu.com.tr/ornek-haber";
    const items = [
      hybridItem({
        id: "rss:denizli",
        title: sharedTitle,
        rssSourceUrl: sharedUrl,
        regionLabel: "Denizli",
        regionKey: "tr-denizli",
        geoLat: 37.7765,
        geoLng: 29.0864,
        countryCode: "TR",
      }),
      hybridItem({
        id: "rss:af",
        title: sharedTitle,
        rssSourceUrl: sharedUrl,
        regionLabel: "Afganistan",
        regionKey: "afghanistan",
        geoLat: 34.5553,
        geoLng: 69.2075,
        countryCode: "AF",
      }),
    ];
    const deduped = dedupeHybridNewsItemsForMap(items, locations);
    expect(deduped).toHaveLength(1);
    const headlines = buildHmMapCityHeadlines(deduped, ilCenters, 24);
    expect(headlines).toHaveLength(1);
    expect(headlines[0]?.city).toBe("Ankara");
    expect(headlines[0]?.title).toBe(sharedTitle);
  });

  it("still uses feed geo when title has no location hint", () => {
    const item = hybridItem({
      title: "Son dakika gelişme",
      geoLat: 39.9055,
      geoLng: 41.2658,
      regionKey: "tr-erzurum",
      regionLabel: "Erzurum",
      countryCode: "TR",
    });
    const loc = findLocationForHybridNewsItem(item, locations);
    expect(loc?.label).toBe("Erzurum");
  });

  it("does not match Erzurum from Er Gaziler headline", () => {
    const loc = findLocationForHybridNewsItem(
      hybridItem({ title: "Er Gaziler için yeni düzenleme yürürlükte" }),
      locations,
    );
    expect(loc).toBeNull();
  });

  it("maps Mamak and Tandoğan keywords to Ankara", () => {
    expect(
      findLocationForHybridNewsItem(hybridItem({ title: "Mamak'ta trafik düzenlemesi" }), locations)?.label,
    ).toBe("Ankara");
    expect(
      findLocationForHybridNewsItem(hybridItem({ title: "Tandoğan meydanında etkinlik" }), locations)?.label,
    ).toBe("Ankara");
  });

  it("prefers Ankara from title over Kırıkkale feed geo", () => {
    const item = hybridItem({
      title: "Ankara'da bakanlar kurulu toplantısı",
      geoLat: 39.8468,
      geoLng: 33.4988,
      regionKey: "tr-kirikkale",
      regionLabel: "Kırıkkale",
      countryCode: "TR",
    });
    const resolved = resolveLocationForHybridNewsItem(item, locations);
    expect(resolved?.location.label).toBe("Ankara");
    expect(resolved?.source).toBe("institution");
    expect(resolved?.location.lat).toBeCloseTo(39.9334, 2);
  });

  it("headline pins use text-resolved coords not feed geo", () => {
    const item = hybridItem({
      title: "Er Gaziler Meclis'ten yasal düzenleme bekliyor",
      geoLat: 37.7765,
      geoLng: 29.0864,
      regionLabel: "Denizli",
      regionKey: "tr-denizli",
      countryCode: "TR",
    });
    const headlines = buildHmMapCityHeadlines([item], ilCenters, 24);
    expect(headlines[0]?.city).toBe("Ankara");
    expect(headlines[0]?.geoLat).toBeCloseTo(39.9334, 2);
    expect(headlines[0]?.geoLng).toBeCloseTo(32.8597, 2);
  });

  it("resolveHeadlineLocationFromText ignores feed metadata", () => {
    const loc = resolveHeadlineLocationFromText(
      "TBMM Genel Kurulu olağanüstü toplantı",
      "",
      locations,
    );
    expect(loc?.label).toBe("Ankara");
  });

  it("does not pin Dutch NOS NATO headline to Van (van preposition false positive)", () => {
    const item = hybridItem({
      title: "NAVO neemt omstreden AI-systeem van Amerikaans bedrijf Palantir in gebruik",
      feedLabel: "NOS Netherlands",
      countryCode: "NL",
      regionKey: "netherlands",
      regionLabel: "Hollanda",
      geoLat: 52.3676,
      geoLng: 4.9041,
    });
    const loc = findLocationForHybridNewsItem(item, locations);
    expect(loc?.label).not.toBe("Van");
    expect(loc?.key === "nato" || loc?.label === "Hollanda").toBe(true);
    const headlines = buildHmMapCityHeadlines([item], ilCenters, 24);
    expect(headlines.every((h) => h.city !== "Van")).toBe(true);
  });

  it("pins Van il RSS when title explicitly mentions Van with Turkish suffix", () => {
    const item = hybridItem({
      title: "Van'da 4.2 büyüklüğünde deprem",
      feedLabel: "Cumha Van",
      countryCode: "TR",
      regionKey: "tr-van",
      regionLabel: "Van",
      geoLat: 38.4891,
      geoLng: 43.4089,
    });
    const loc = findLocationForHybridNewsItem(item, locations);
    expect(loc?.label).toBe("Van");
    const headlines = buildHmMapCityHeadlines([item], ilCenters, 24);
    expect(headlines[0]?.city).toBe("Van");
  });

  it("blocks TR feed geo for global dunya RSS with non-Turkish title", () => {
    const item = hybridItem({
      title: "Breaking: Middle East tensions escalate",
      feedLabel: "Cumha Dünya",
      countryCode: null,
      regionKey: "global-dunya",
      regionLabel: "Dünya",
      geoLat: 20,
      geoLng: 0,
    });
    const loc = findLocationForHybridNewsItem(item, locations);
    expect(loc?.label).not.toBe("Van");
    if (loc) {
      expect(loc.countryCode).not.toBe("TR");
    }
  });
});
