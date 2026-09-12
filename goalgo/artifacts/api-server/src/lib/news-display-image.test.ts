import { describe, expect, it } from "vitest";
import {
  extractNewsCoverFromHtml,
  filterNewsItemsWithUsableCover,
  isUsableNewsCoverUrl,
  newsItemHasUsableCover,
  resolveNewsItemImageUrl,
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

  it("kategori listesi görselsiz satırları silmez — homepage filtresi kategoriye uygulanmaz", () => {
    const items = [
      { title: "Ankara 1", categorySlug: "ankara", imageUrl: "" },
      { title: "Ankara 2", categorySlug: "ankara", imageUrl: null },
    ];
    expect(filterNewsItemsWithUsableCover(items)).toEqual([]);
    expect(items).toHaveLength(2);
  });

  it("SHA enclosure / spot HTML içinden kapak çözer", () => {
    const shaXml = `
      <item>
        <title>SYM</title>
        <link>https://sehirhaberajansi.com.tr/haber/sym-1</link>
        <enclosure url="https://sehirhaberajansi.com.tr/uploads/1789121609_6aa3d449aa727.jpeg" length="0" type="image/jpeg" />
        <media:content url="https://sehirhaberajansi.com.tr/uploads/1789121609_6aa3d449aa727.jpeg" medium="image" />
      </item>
    `;
    expect(extractNewsCoverFromHtml(shaXml, "https://sehirhaberajansi.com.tr/haber/sym-1")).toContain(
      "sehirhaberajansi.com.tr/uploads/",
    );
    expect(
      resolveNewsItemImageUrl({
        imageUrl: "",
        spot: `<img src="https://yozgatmedya.com/wp-content/uploads/a.jpg" />`,
      }),
    ).toContain("yozgatmedya.com");
  });
});
