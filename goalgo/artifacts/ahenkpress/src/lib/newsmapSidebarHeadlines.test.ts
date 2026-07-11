import { describe, expect, it } from "vitest";
import type { HmMapCityHeadline } from "@/lib/hmMapCityNews";
import {
  buildNewsmapSidebarHeadlines,
  resolveIlCenterFromSearchQuery,
  resolveNewsmapLocationCoords,
} from "@/lib/newsmapSidebarHeadlines";

function headline(partial: Partial<HmMapCityHeadline> & Pick<HmMapCityHeadline, "title" | "city">): HmMapCityHeadline {
  return {
    href: `/t/${partial.title}`,
    kind: "news",
    ...partial,
  };
}

describe("newsmapSidebarHeadlines", () => {
  const ilCenters = [
    { plaka: 42, adi: "Konya", lat: 37.87, lng: 32.48, zoom: 10 },
    { plaka: 6, adi: "Ankara", lat: 39.93, lng: 32.85, zoom: 10 },
  ];

  it("resolves Turkish province names from search query", () => {
    expect(resolveIlCenterFromSearchQuery("konya", ilCenters)?.adi).toBe("Konya");
    expect(resolveIlCenterFromSearchQuery("KONYA, Türkiye", ilCenters)?.adi).toBe("Konya");
  });

  it("does not fall back to global headlines when a city is selected", () => {
    const global = [
      headline({ city: "İstanbul", title: "NATO zirvesi" }),
      headline({ city: "Malatya", title: "Deprem yardımı" }),
    ];
    const rows = buildNewsmapSidebarHeadlines({
      selectedCity: "Konya",
      kindFilter: "all",
      layerHeadlines: global,
      layerFiltered: global,
      locationNewsHeadlines: [],
      locationVideoHeadlines: [],
      filterByKind: (items) => items,
    });
    expect(rows).toEqual([]);
  });

  it("shows phase1 city headlines while location API is still empty", () => {
    const rows = buildNewsmapSidebarHeadlines({
      selectedCity: "Konya",
      kindFilter: "news",
      layerHeadlines: [headline({ city: "Konya", title: "Konya DB haber", source: "db" })],
      layerFiltered: [headline({ city: "İstanbul", title: "Global" })],
      locationNewsHeadlines: [],
      locationVideoHeadlines: [],
      filterByKind: (items) => items,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("Konya DB haber");
  });

  it("resolves coords from il center", () => {
    const coords = resolveNewsmapLocationCoords("Konya", ilCenters, []);
    expect(coords?.lat).toBeCloseTo(37.87, 1);
  });

  it("resolves global coords from search terms like Yerevan", () => {
    const coords = resolveNewsmapLocationCoords("Yerevan", ilCenters, [
      {
        key: "yerevan",
        label: "Yerevan",
        searchTerms: ["Yerevan", "Erivan"],
        lat: 40.1776,
        lng: 44.5126,
        zoom: 10,
        countryCode: "AM",
        kind: "global-city",
      },
      {
        key: "armenia",
        label: "Ermenistan",
        searchTerms: ["Ermenistan", "Armenia"],
        lat: 40.1792,
        lng: 44.4991,
        zoom: 8,
        countryCode: "AM",
        kind: "country",
      },
    ]);
    expect(coords?.lat).toBeCloseTo(40.1776, 2);
  });

  it("prefers explicit geocoded coords over static dictionary", () => {
    const coords = resolveNewsmapLocationCoords(
      "Yerevan",
      ilCenters,
      [],
      null,
      { lat: 40.15867, lng: 44.23095, zoom: 12 },
    );
    expect(coords?.lat).toBeCloseTo(40.15867, 4);
    expect(coords?.zoom).toBe(12);
  });

  it("skips stale TR pool headlines for global locations", () => {
    const rows = buildNewsmapSidebarHeadlines({
      selectedCity: "Bali",
      kindFilter: "all",
      layerHeadlines: [headline({ city: "Ankara", title: "Ankara haber" })],
      layerFiltered: [headline({ city: "Muğla", title: "Muğla haber" })],
      locationNewsHeadlines: [headline({ city: "Bali", title: "Bali travel update" })],
      locationVideoHeadlines: [],
      filterByKind: (items) => items,
    });
    expect(rows.map((row) => row.title)).toEqual(["Bali travel update"]);
  });
});
