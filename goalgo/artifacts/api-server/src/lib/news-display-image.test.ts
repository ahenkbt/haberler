import { describe, expect, it } from "vitest";
import {
  filterNewsItemsWithUsableCover,
  isUsableNewsCoverUrl,
  newsItemHasUsableCover,
} from "./news-display-image.js";

describe("anasayfa kapak filtresi", () => {
  it("boş ve placeholder kapakları reddeder", () => {
    expect(isUsableNewsCoverUrl("")).toBe(false);
    expect(isUsableNewsCoverUrl(null)).toBe(false);
    expect(isUsableNewsCoverUrl("data:image/svg+xml,%3Csvg")).toBe(false);
    expect(isUsableNewsCoverUrl("/hm/haber-gorsel-hazirlaniyor.svg")).toBe(false);
    expect(isUsableNewsCoverUrl("https://cdn.example.com/cover.jpg")).toBe(true);
  });

  it("home-bundle listesinden görselsiz satırları eler", () => {
    const items = [
      { title: "Resimli", imageUrl: "https://cdn.example.com/a.jpg" },
      { title: "Boş", imageUrl: "" },
      { title: "Placeholder", imageUrl: "/hm/haber-gorsel-hazirlaniyor.svg" },
      { title: "Yedek", imageUrl: null, imageFallbackUrl: "https://cdn.example.com/b.webp" },
    ];
    const kept = filterNewsItemsWithUsableCover(items);
    expect(kept.map((item) => item.title)).toEqual(["Resimli", "Yedek"]);
    expect(newsItemHasUsableCover(items[1])).toBe(false);
  });
});
