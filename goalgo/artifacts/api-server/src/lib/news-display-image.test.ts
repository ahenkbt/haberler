import { describe, expect, it } from "vitest";
import {
  filterNewsItemsWithUsableCover,
  isUsableNewsCoverUrl,
  newsItemHasUsableCover,
  paginateNewsItemsWithUsableCover,
  preferCoveredThenFallback,
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

  it("hybrid sayfalama kapaksız satırları total’den düşer", () => {
    const items = [
      { title: "A", imageUrl: "https://cdn.example.com/a.jpg" },
      { title: "B", imageUrl: "" },
      { title: "C", imageUrl: "https://cdn.example.com/c.jpg" },
      { title: "D", imageUrl: "/hm/haber-gorsel-hazirlaniyor.svg" },
      { title: "E", imageUrl: "https://cdn.example.com/e.jpg" },
    ];
    const page = paginateNewsItemsWithUsableCover(items, 0, 2);
    expect(page.total).toBe(3);
    expect(page.items.map((item) => item.title)).toEqual(["A", "C"]);
    expect(paginateNewsItemsWithUsableCover(items, 2, 2).items.map((item) => item.title)).toEqual(["E"]);
  });

  it("keeps coverless rows when no usable cover exists (KH vitrin fallback)", () => {
    const coverless = [
      { title: "Kırşehir haber", imageUrl: null },
      { title: "Yerel", imageUrl: "" },
    ];
    expect(preferCoveredThenFallback(coverless).map((item) => item.title)).toEqual([
      "Kırşehir haber",
      "Yerel",
    ]);
    const mixed = [
      { title: "Boş", imageUrl: "" },
      { title: "Kapak", imageUrl: "https://cdn.example.com/k.jpg" },
    ];
    expect(preferCoveredThenFallback(mixed).map((item) => item.title)).toEqual(["Kapak"]);
  });
});

