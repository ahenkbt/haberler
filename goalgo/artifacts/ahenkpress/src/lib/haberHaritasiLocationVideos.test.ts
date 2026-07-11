import { describe, expect, it } from "vitest";
import {
  buildNewsmapLocationYoutubeQuery,
  buildNewsmapYektubeSearchQueries,
  filterNewsmapVideosForCity,
  mergeNewsmapVideoItems,
  newsmapLocationVideoCategorySlug,
  normalizeNewsmapYoutubeSearchRow,
} from "@/lib/haberHaritasiLocationVideos";
import { resolveNewsmapLocationContext } from "@/lib/haberHaritasiLocationContext";

describe("haberHaritasiLocationVideos", () => {
  it("accepts YouTube scrape rows with sourceId 0", () => {
    const row = normalizeNewsmapYoutubeSearchRow({
      id: 1,
      sourceId: 0,
      videoId: "abc123",
      title: "Ankara haberleri",
      thumbnail: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
    });
    expect(row).not.toBeNull();
    expect(row?.videoId).toBe("abc123");
    expect(row?.sourceId).toBe(0);
  });

  it("dedupes merged videos by videoId", () => {
    const merged = mergeNewsmapVideoItems(
      [{ id: 1, sourceId: 5, videoId: "x", title: "A", description: null, thumbnail: null, publishedAt: "2026-01-01", channelName: null }],
      [{ id: 2, sourceId: 0, videoId: "x", title: "B", description: null, thumbnail: null, publishedAt: "2026-02-01", channelName: null }],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe("B");
  });

  it("derives location category slug for Turkish provinces", () => {
    expect(newsmapLocationVideoCategorySlug("Ankara")).toBe("ankara");
    expect(newsmapLocationVideoCategorySlug("İstanbul, Türkiye")).toBe("istanbul");
    expect(newsmapLocationVideoCategorySlug("")).toBe("haberler");
  });

  it("prefers bare location then travel queries", () => {
    expect(buildNewsmapLocationYoutubeQuery("Ankara", "travel")).toBe("Ankara");
    expect(buildNewsmapLocationYoutubeQuery("Ankara", "bare")).toBe("Ankara");
    expect(buildNewsmapLocationYoutubeQuery("Ermenistan", "travel")).toBe("Ermenistan");
    expect(buildNewsmapLocationYoutubeQuery("Ermenistan", "news")).toBe("Ermenistan haber");
    expect(buildNewsmapLocationYoutubeQuery("Endonezya Bali", "travel")).toBe("Bali gezi tanıtım");
  });

  it("filters out Turkish domestic videos on foreign locations", () => {
    const pool = [
      {
        id: 1,
        sourceId: 1,
        videoId: "tr1",
        title: "CHP'ye istismar siyaseti tepkisi - atv Ana Haber",
        description: "Türkiye siyaset gündemi",
        thumbnail: null,
        publishedAt: "2026-07-01",
        channelName: null,
      },
      {
        id: 2,
        sourceId: 0,
        videoId: "kz1",
        title: "Kazakistan Astana gezi rehberi",
        description: "Astana şehir turu",
        thumbnail: null,
        publishedAt: "2026-07-02",
        channelName: null,
      },
    ];
    const filtered = filterNewsmapVideosForCity(pool, "Kazakistan");
    expect(filtered.map((row) => row.videoId)).toEqual(["kz1"]);
  });

  it("rejects unrelated national news for Antalya", () => {
    const pool = [
      {
        id: 1,
        sourceId: 1,
        videoId: "ist1",
        title: "İstanbul'da metro grevi",
        description: "İstanbul ulaşım",
        thumbnail: null,
        publishedAt: "2026-07-01",
        channelName: null,
      },
      {
        id: 2,
        sourceId: 0,
        videoId: "ant1",
        title: "Antalya Kemer turizm haberleri",
        description: "Antalya sahilleri",
        thumbnail: null,
        publishedAt: "2026-07-02",
        channelName: null,
      },
    ];
    const filtered = filterNewsmapVideosForCity(pool, "Antalya");
    expect(filtered.map((row) => row.videoId)).toEqual(["ant1"]);
  });

  it("accepts NYC-tagged videos for New York", () => {
    const pool = [
      {
        id: 1,
        sourceId: 0,
        videoId: "tr1",
        title: "ÖSYM sonuçları açıklandı",
        description: "Türkiye",
        thumbnail: null,
        publishedAt: "2026-07-01",
        channelName: null,
      },
      {
        id: 2,
        sourceId: 0,
        videoId: "ny1",
        title: "NYC subway news today",
        description: "New York transit",
        thumbnail: null,
        publishedAt: "2026-07-02",
        channelName: null,
      },
    ];
    const filtered = filterNewsmapVideosForCity(pool, "New York");
    expect(filtered.map((row) => row.videoId)).toEqual(["ny1"]);
  });

  it("builds YekTube search queries for Dubai", () => {
    const queries = buildNewsmapYektubeSearchQueries(resolveNewsmapLocationContext("Dubai"));
    expect(queries[0]).toBe("Dubai");
    expect(queries.some((q) => /dubai/i.test(q))).toBe(true);
  });

  it("accepts Lefkoşa/KKTC videos only for Lefkoşa", () => {
    const pool = [
      {
        id: 1,
        sourceId: 0,
        videoId: "tr1",
        title: "Ankara'da seçim gündemi",
        description: null,
        thumbnail: null,
        publishedAt: "2026-07-01",
        channelName: null,
      },
      {
        id: 2,
        sourceId: 0,
        videoId: "cy1",
        title: "Lefkoşa şehir turu",
        description: "KKTC gezi",
        thumbnail: null,
        publishedAt: "2026-07-02",
        channelName: null,
      },
    ];
    const filtered = filterNewsmapVideosForCity(pool, "Lefkoşa");
    expect(filtered.map((row) => row.videoId)).toEqual(["cy1"]);
  });
});
