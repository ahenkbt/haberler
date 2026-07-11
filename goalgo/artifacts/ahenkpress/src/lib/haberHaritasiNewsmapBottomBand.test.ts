import { describe, expect, it } from "vitest";
import {
  classifyNewsmapBottomBandHeadline,
  defaultNewsmapBottomBandTab,
  detectLanguage,
  filterNewsmapBottomBandHeadlines,
  isInsideKktcBounds,
  isNewsmapTurkeyOrKktcViewport,
  isStrictTurkishBottomBandHeadline,
  mergeNewsmapBottomBandHeadlines,
  resolveNewsmapBottomBandHeadlines,
  resolveNewsmapLocationBottomBandHeadlines,
} from "@/lib/haberHaritasiNewsmapBottomBand";
import type { HmMapCityHeadline } from "@/lib/hmMapCityNews";

function headline(partial: Partial<HmMapCityHeadline> & Pick<HmMapCityHeadline, "title">): HmMapCityHeadline {
  return {
    city: "Test",
    href: "/test",
    kind: "news",
    ...partial,
  };
}

describe("haberHaritasiNewsmapBottomBand", () => {
  it("detects KKTC bounds", () => {
    expect(isInsideKktcBounds(35.2, 33.4)).toBe(true);
    expect(isInsideKktcBounds(41.0, 29.0)).toBe(false);
  });

  it("defaults to turkce in Turkey/KKTC", () => {
    expect(defaultNewsmapBottomBandTab({ lat: 39.2, lng: 35.2 })).toBe("turkce");
    expect(defaultNewsmapBottomBandTab({ lat: 35.2, lng: 33.4 })).toBe("turkce");
    expect(isNewsmapTurkeyOrKktcViewport(35.2, 33.4)).toBe(true);
  });

  it("defaults to global outside Turkey/KKTC", () => {
    expect(defaultNewsmapBottomBandTab({ lat: 51.5, lng: -0.12 })).toBe("global");
  });

  it("detects headline languages", () => {
    expect(detectLanguage("Ankara'da son dakika gelişme")).toBe("tr");
    expect(detectLanguage("Breaking news from London")).toBe("en");
    expect(detectLanguage("La France face à une nouvelle réforme")).toBe("fr");
  });

  it("classifies Turkish province headlines strictly", () => {
    expect(
      classifyNewsmapBottomBandHeadline(headline({ title: "Ankara'da son dakika gelişme", countryCode: "TR" })),
    ).toBe("turkce");
    expect(
      isStrictTurkishBottomBandHeadline(headline({ title: "İstanbul trafik yoğun", city: "İstanbul", countryCode: "TR" })),
    ).toBe(true);
  });

  it("classifies global RSS headlines", () => {
    expect(
      classifyNewsmapBottomBandHeadline(
        headline({ title: "Breaking news from London", countryCode: "GB", feedLabel: "BBC World" }),
      ),
    ).toBe("global");
  });

  it("filters bottom band by tab without mixing", () => {
    const rows = [
      headline({ title: "İstanbul trafik", countryCode: "TR", href: "/a" }),
      headline({ title: "Breaking update in Berlin", countryCode: "DE", feedLabel: "DW English", href: "/b" }),
    ];
    const tr = filterNewsmapBottomBandHeadlines(rows, "turkce");
    const gl = filterNewsmapBottomBandHeadlines(rows, "global");
    expect(tr).toHaveLength(1);
    expect(gl).toHaveLength(1);
    expect(tr[0]?.title).toMatch(/İstanbul/);
    expect(gl[0]?.title).toMatch(/Breaking/);
  });

  it("falls back to Turkish-text headlines when strict geo filter is empty", () => {
    const rows = [
      headline({
        title: "Cumhurbaşkanı Erdoğan açıklama yaptı",
        city: "Gündem",
        countryCode: null,
        feedLabel: "Yeni RSS kaynağı",
        href: "/a",
      }),
    ];
    const tr = filterNewsmapBottomBandHeadlines(rows, "turkce");
    expect(tr).toHaveLength(1);
    expect(tr[0]?.title).toMatch(/Erdoğan/);
  });

  it("keeps English and French foreign headlines out of turkce tab", () => {
    const rows = [
      headline({ title: "Mexico border crisis escalates", countryCode: "MX", city: "Meksika", href: "/mx" }),
      headline({ title: "Azerbaijan economy update", countryCode: "AZ", city: "Azerbaycan", href: "/az" }),
      headline({ title: "La France face à une nouvelle réforme", countryCode: "FR", city: "Fransa", href: "/fr" }),
      headline({ title: "NATO üyeleri toplantıda", countryCode: "BE", city: "Brüksel", href: "/nato" }),
      headline({ title: "Gazze'de son gelişmeler", countryCode: "IL", city: "İsrail", href: "/il" }),
    ];
    const tr = filterNewsmapBottomBandHeadlines(rows, "turkce");
    const gl = filterNewsmapBottomBandHeadlines(rows, "global");
    expect(tr).toHaveLength(0);
    expect(gl.map((row) => row.href).sort()).toEqual(["/az", "/fr", "/il", "/mx", "/nato"].sort());
  });

  it("allows Turkish text from Turkish feeds on foreign geo", () => {
    expect(
      classifyNewsmapBottomBandHeadline(
        headline({
          title: "Gazze'de son gelişmeler",
          countryCode: "IL",
          city: "İsrail",
          feedLabel: "Anadolu Ajansı Dünya",
        }),
      ),
    ).toBe("turkce");
  });

  it("rejects English headlines on TR geo without Turkish text", () => {
    expect(
      classifyNewsmapBottomBandHeadline(
        headline({ title: "Breaking news from Ankara", countryCode: "TR", city: "Ankara" }),
      ),
    ).toBe("global");
  });

  it("does not classify foreign geo as turkce when countryCode was wrongly TR", () => {
    expect(
      classifyNewsmapBottomBandHeadline(
        headline({ title: "Breaking news from Mexico City", countryCode: "TR", city: "Meksika" }),
      ),
    ).toBe("global");
  });

  it("classifies Cumha provincial headlines as turkce", () => {
    expect(
      classifyNewsmapBottomBandHeadline(
        headline({ title: "Kayseri'de son dakika gelişme", countryCode: "TR", city: "Kayseri", feedLabel: "Cumha Kayseri" }),
      ),
    ).toBe("turkce");
  });

  it("classifies Cumha dunya feed as global even with Turkish text", () => {
    expect(
      classifyNewsmapBottomBandHeadline(
        headline({ title: "Avrupa'da yeni gelişme", countryCode: "DE", city: "Dünya", feedLabel: "Cumha Dünya" }),
      ),
    ).toBe("global");
  });

  it("classifies global category slug to global tab", () => {
    expect(
      classifyNewsmapBottomBandHeadline(headline({ title: "Breaking news today", categorySlug: "global" })),
    ).toBe("global");
  });

  it("never leaves global tab empty when international headlines exist", () => {
    const rows = [
      headline({ title: "Mexico border crisis escalates", countryCode: "MX", href: "/mx" }),
      headline({ title: "Latest from Berlin", countryCode: "DE", feedLabel: "DW English", href: "/de" }),
    ];
    expect(filterNewsmapBottomBandHeadlines(rows, "global")).toHaveLength(2);
  });

  it("resolveNewsmapBottomBandHeadlines: turkce falls back, global stays empty without foreign rows", () => {
    const rows = [
      headline({ title: "Ankara'da son dakika", countryCode: "TR", city: "Ankara", href: "/a" }),
    ];
    /* Global sekmede Türkçe habere düşme yok — boş durum mesajı gösterilir. */
    expect(resolveNewsmapBottomBandHeadlines(rows, "global")).toHaveLength(0);
    expect(resolveNewsmapBottomBandHeadlines(rows, "turkce", { kindFilter: "news" })).toHaveLength(1);
  });

  it("global tab keeps videos even without language match", () => {
    const rows = [
      headline({ title: "Ankara gezilecek yerler", countryCode: "TR", city: "Ankara", href: "/v", kind: "video" }),
    ];
    expect(resolveNewsmapBottomBandHeadlines(rows, "global", { kindFilter: "video" })).toHaveLength(1);
  });

  it("location-scoped pool does not leak other provinces on turkce tab", () => {
    const ankaraOnly = [
      headline({ title: "Ankara trafik", countryCode: "TR", city: "Ankara", href: "/a" }),
    ];
    const mixed = mergeNewsmapBottomBandHeadlines(
      ankaraOnly,
      [headline({ title: "Kayseri haber", countryCode: "TR", city: "Kayseri", href: "/k" })],
    );
    expect(resolveNewsmapBottomBandHeadlines(mixed, "turkce")).toHaveLength(2);
    expect(resolveNewsmapBottomBandHeadlines(ankaraOnly, "turkce")).toHaveLength(1);
    expect(resolveNewsmapBottomBandHeadlines(ankaraOnly, "turkce")[0]?.city).toBe("Ankara");
  });

  it("location bottom band skips turkce/global tab filter", () => {
    const pool = [
      headline({ title: "Batum travel vlog", countryCode: "GE", city: "Batum", href: "/v", kind: "video" }),
      headline({ title: "Batum news", countryCode: "GE", city: "Batum", href: "/n" }),
    ];
    expect(resolveNewsmapLocationBottomBandHeadlines(pool, "all")).toHaveLength(2);
    expect(resolveNewsmapLocationBottomBandHeadlines(pool, "video")).toHaveLength(1);
  });
});

describe("buildNewsmapGlobalPoolHeadlines", () => {
  it("includes foreign-language items without geo match", async () => {
    const { buildNewsmapGlobalPoolHeadlines } = await import("@/lib/haberHaritasiNewsmapBottomBand");
    const rows = buildNewsmapGlobalPoolHeadlines([
      { id: "1", title: "Trump indictment hearing continues", href: "/h1", feedLabel: "CNN International", source: "rss", publishedAt: "2026-07-05T10:00:00Z" },
      { id: "2", title: "Ankara'da toplantı", href: "/h2", feedLabel: "AA", source: "rss", publishedAt: "2026-07-05T10:00:00Z" },
      { id: "3", title: "La France face à une réforme", href: "/h3", source: "rss", publishedAt: "2026-07-05T10:00:00Z" },
    ]);
    expect(rows.map((r) => r.href)).toEqual(["/h1", "/h3"]);
    expect(rows[0]?.city).toBe("Dünya");
    expect(rows[0]?.kind).toBe("news");
  });
});
