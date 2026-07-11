import { describe, expect, it } from "vitest";
import {
  buildLocationBusinessScrapeLabel,
  buildLocationGoogleNewsQuery,
  buildLocationYoutubeSearchQueries,
  buildLocationYoutubeTravelQueries,
  isLocationNewsFalsePositive,
  isLocationVideoFalsePositive,
  isNewsItemRelevantToLocation,
  resolveNewsmapLocationContext,
  resolveNewsmapLocationQueryLabel,
  textContainsLocationTerm,
} from "@/lib/haberHaritasiLocationContext";

describe("haberHaritasiLocationContext", () => {
  it("parses Endonezya Bali into country + city", () => {
    const ctx = resolveNewsmapLocationContext("Endonezya Bali");
    expect(ctx.cityLabel).toBe("Bali");
    expect(ctx.countryLabel).toBe("Endonezya");
    expect(ctx.isForeign).toBe(true);
  });

  it("builds Google News query for Bali", () => {
    const ctx = resolveNewsmapLocationContext("Bali, Endonezya");
    expect(buildLocationGoogleNewsQuery(ctx)).toBe("Endonezya Bali son dakika haberleri");
  });

  it("builds bare YouTube search queries for Ankara and foreign locations", () => {
    const ankara = buildLocationYoutubeSearchQueries(resolveNewsmapLocationContext("Ankara"));
    expect(ankara[0]).toBe("Ankara");
    expect(ankara).toContain("Ankara gezi tanıtım");

    const foreign = buildLocationYoutubeSearchQueries(resolveNewsmapLocationContext("Afganistan"));
    expect(foreign[0]).toBe("Afganistan");
    expect(foreign).toContain("Afganistan gezi tanıtım");
  });

  it("builds travel YouTube queries for Bali (not bare bali)", () => {
    const ctx = resolveNewsmapLocationContext("Endonezya Bali");
    const queries = buildLocationYoutubeTravelQueries(ctx);
    expect(queries[0]).toBe("Bali gezilecek yerler");
    expect(queries).toContain("baliye nasıl gidilir");
    expect(queries.some((q) => q.includes("bali") && !q.match(/^bali$/i))).toBe(true);
  });

  it("rejects bal/balina false positives for Bali news", () => {
    const ctx = resolveNewsmapLocationContext("Bali");
    expect(isLocationNewsFalsePositive("Arı balı üretimi arttı", "", ctx)).toBe(true);
    expect(isLocationNewsFalsePositive("Balina göç rotası değişti", "", ctx)).toBe(true);
    expect(isLocationNewsFalsePositive("Menemen belediye başkanı açıklama yaptı", "", ctx)).toBe(true);
    expect(isNewsItemRelevantToLocation("Bali'de deprem paniği", "", ctx)).toBe(true);
  });

  it("rejects honey/balina videos for Bali", () => {
    const ctx = resolveNewsmapLocationContext("Bali");
    expect(isLocationVideoFalsePositive("Doğal bal üretimi", "", ctx)).toBe(true);
    expect(isLocationVideoFalsePositive("Balina ile yüzme deneyimi", "", ctx)).toBe(true);
    expect(isLocationVideoFalsePositive("Bali gezilecek yerler rehberi", "", ctx)).toBe(false);
  });

  it("uses word boundaries for short location terms", () => {
    expect(textContainsLocationTerm("Bali tatil rehberi", "Bali")).toBe(true);
    expect(textContainsLocationTerm("Arı balı hasadı", "Bali")).toBe(false);
    expect(textContainsLocationTerm("Balina belgeseli", "Bali")).toBe(false);
  });

  it("builds business scrape label with country", () => {
    const ctx = resolveNewsmapLocationContext("Batumi, Gürcistan");
    expect(buildLocationBusinessScrapeLabel(ctx)).toMatch(/Batumi/);
    expect(buildLocationBusinessScrapeLabel(ctx)).toMatch(/Gürcistan/);
  });

  it("keeps Turkish province as non-foreign", () => {
    const ctx = resolveNewsmapLocationContext("Ankara");
    expect(ctx.isTrProvince).toBe(true);
    expect(ctx.isForeign).toBe(false);
  });

  it("parses Keçiören, Ankara as district + province not country", () => {
    const ctx = resolveNewsmapLocationContext("Keçiören, Ankara");
    expect(ctx.cityLabel).toBe("Keçiören");
    expect(ctx.countryLabel).toBeNull();
  });

  it("resolves query label from district + province and coords", () => {
    const ilCenters = [{ adi: "Ankara", lat: 39.93, lng: 32.85, zoom: 10 }];
    expect(resolveNewsmapLocationQueryLabel("Keçiören, Ankara", { ilCenters }).queryLabel).toBe("Ankara");
    expect(
      resolveNewsmapLocationQueryLabel("Çankaya", { lat: 39.92, lng: 32.85, ilCenters }).queryLabel,
    ).toBe("Ankara");
    expect(resolveNewsmapLocationQueryLabel("Batum, Gürcistan").queryLabel).toBe("Batum");
  });
});
