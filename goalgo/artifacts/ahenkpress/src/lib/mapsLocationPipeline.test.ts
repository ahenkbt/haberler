import { describe, expect, it } from "vitest";
import {
  buildPlacesPreviewQuery,
  resolveNewsmapBusinessLocationScope,
} from "@/lib/mapsLocationPipeline";
import { HABER_HARITASI_GLOBAL_LOCATIONS } from "@/lib/haberHaritasiLocations";

describe("mapsLocationPipeline", () => {
  it("builds travel-friendly places queries for global locations", () => {
    expect(buildPlacesPreviewQuery("Ermenistan")).toBe("Ermenistan işletmeler");
    expect(buildPlacesPreviewQuery("Yerevan")).toBe("Yerevan işletmeler");
    expect(buildPlacesPreviewQuery("Ankara")).toBe("Ankara işletmeler");
  });

  it("resolves global location scope from search terms like Yerevan", () => {
    const scope = resolveNewsmapBusinessLocationScope({
      selectedNewsmapCity: "Yerevan",
      selectedLocation: null,
      ilCenters: [],
      globalLocations: HABER_HARITASI_GLOBAL_LOCATIONS,
    });
    expect(scope?.label).toBe("Yerevan");
    expect(scope?.countryCode).toBe("AM");
    expect(scope?.lat).toBeCloseTo(40.1776, 2);
  });

  it("uses geocoded selectedLocation coords for unknown global places", () => {
    const scope = resolveNewsmapBusinessLocationScope({
      selectedNewsmapCity: "Rotterdam",
      selectedLocation: {
        name: "Rotterdam, Netherlands",
        nameTr: "Rotterdam",
        latitude: 51.9244,
        longitude: 4.4777,
        zoomLevel: 12,
      },
      ilCenters: [],
      globalLocations: HABER_HARITASI_GLOBAL_LOCATIONS,
    });
    expect(scope?.label).toBe("Rotterdam");
    expect(scope?.lat).toBeCloseTo(51.9244, 3);
    expect(scope?.isTrProvince).toBe(false);
  });
});
