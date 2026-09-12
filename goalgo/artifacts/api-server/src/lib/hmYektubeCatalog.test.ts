import { describe, expect, it } from "vitest";
import {
  catalogCacheKey,
  hmYektubeCategorySlugs,
  hmYektubeCategoriesFallback,
  hmYektubeWatchUrl,
  mapYektubeRowToHmCatalogItem,
  mixHmYektubeCatalog,
  parseHmYektubeCatalogQuery,
  youtubeThumbFallback,
  type HmYektubeCatalogRow,
} from "./hmYektubeCatalog.js";

function row(partial: Partial<HmYektubeCatalogRow> & Pick<HmYektubeCatalogRow, "id" | "videoId" | "title">): HmYektubeCatalogRow {
  return {
    sourceId: 12,
    thumbnail: null,
    channelName: "TRT Avaz",
    duration: "12:01",
    categorySlug: "haberler",
    isStory: false,
    platform: "youtube",
    ...partial,
  };
}

describe("hmYektubeCatalog", () => {
  it("parses query slugs and clamps limit", () => {
    expect(parseHmYektubeCatalogQuery({ categorySlug: "Film", limit: "999", seed: "3" })).toEqual({
      categorySlug: "film",
      limit: 48,
      seed: 3,
    });
    expect(parseHmYektubeCatalogQuery({ categorySlug: "tumu", limit: 0 }).categorySlug).toBeNull();
    expect(parseHmYektubeCatalogQuery({ limit: "8" }).limit).toBe(8);
  });

  it("expands film/sinema aliases for Yektube category filter", () => {
    expect(hmYektubeCategorySlugs("sinema")).toEqual(
      expect.arrayContaining(["sinema", "film", "film-dizi", "film-ve-animasyon"]),
    );
    expect(hmYektubeCategorySlugs("haberler")).toEqual(expect.arrayContaining(["haberler", "gundem"]));
  });

  it("maps a Yektube row to the HM card DTO with watch URL", () => {
    const item = mapYektubeRowToHmCatalogItem(
      row({ id: 9, videoId: "dQw4w9wgGcQ", title: "Başlık", sourceId: 44, channelName: "Ankara Haber Ajansı" }),
    );
    expect(item).toMatchObject({
      id: 9,
      videoId: "dQw4w9wgGcQ",
      provider: "Ankara Haber Ajansı",
      thumbnail: "https://i.ytimg.com/vi/dQw4w9wgGcQ/hqdefault.jpg",
      watchUrl: "https://yektube.com/yp/kanal/44/dQw4w9wgGcQ",
    });
  });

  it("drops empty titles and stories", () => {
    expect(mapYektubeRowToHmCatalogItem(row({ id: 1, videoId: "aaaaaaaaaaa", title: "  " }))).toBeNull();
    const items = mixHmYektubeCatalog(
      [
        row({ id: 1, videoId: "aaaaaaaaaaa", title: "Haber", isStory: true }),
        row({ id: 2, videoId: "bbbbbbbbbbb", title: "Uzun haber", sourceId: 1, channelName: "NTV Haber" }),
      ],
      { categorySlug: "haberler", limit: 8, seed: null },
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Uzun haber");
  });

  it("mixes Tümü without requiring a news-table write flag", () => {
    const items = mixHmYektubeCatalog(
      [
        row({ id: 3, videoId: "ccccccccccc", title: "Gündem", categorySlug: "haberler", channelName: "A Haber" }),
        row({ id: 4, videoId: "ddddddddddd", title: "Film", categorySlug: "sinema", channelName: "TRT Avaz", sourceId: 2 }),
      ],
      { categorySlug: null, limit: 8, seed: 7 },
    );
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.watchUrl.startsWith("https://yektube.com/"))).toBe(true);
    expect(catalogCacheKey({ categorySlug: null, limit: 36, seed: null })).toBe("all:36:0");
  });

  it("builds category chips used by /video", () => {
    const cats = hmYektubeCategoriesFallback();
    expect(cats[0]).toEqual({ slug: "haberler", label: "Haberler" });
    expect(cats.map((c) => c.slug)).toContain("sinema");
    expect(cats.find((c) => c.slug === "sinema")?.label).toBe("Film");
  });

  it("watch URL and thumb helpers stay on yektube.com / YouTube CDN", () => {
    expect(hmYektubeWatchUrl(null, "dQw4w9wgGcQ")).toBe("https://yektube.com/yp/?v=dQw4w9wgGcQ");
    expect(youtubeThumbFallback("not-an-id")).toBeNull();
  });
});
