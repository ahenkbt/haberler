import { describe, expect, it } from "vitest";
import {
  HM_NEWS_PLACEHOLDER_IMAGE,
  HM_NEWS_PLACEHOLDER_SVG,
  isHmNewsPlaceholderSrc,
  isUsableNewsCoverSrc,
} from "./hmNewsPlaceholder";
import { filterNewsItemsWithCoverImage } from "@/components/HmNewsImage";

describe("haber görsel placeholder", () => {
  it("data URI SVG içinde «Görsel Hazırlanmaktadır» yazar", () => {
    expect(HM_NEWS_PLACEHOLDER_SVG.startsWith("data:image/svg+xml,")).toBe(true);
    const svg = decodeURIComponent(HM_NEWS_PLACEHOLDER_SVG.slice("data:image/svg+xml,".length));
    expect(svg).toContain("Görsel Hazırlanmaktadır");
    expect(HM_NEWS_PLACEHOLDER_IMAGE).toBe(HM_NEWS_PLACEHOLDER_SVG);
  });

  it("placeholder src tanıması", () => {
    expect(isHmNewsPlaceholderSrc(HM_NEWS_PLACEHOLDER_SVG)).toBe(true);
    expect(isHmNewsPlaceholderSrc("https://cdn.example.com/cover.jpg")).toBe(false);
  });

  it("anasayfa kapak filtresi boş ve varsayılan görseli reddeder", () => {
    expect(isUsableNewsCoverSrc("")).toBe(false);
    expect(isUsableNewsCoverSrc(null)).toBe(false);
    expect(isUsableNewsCoverSrc(HM_NEWS_PLACEHOLDER_SVG)).toBe(false);
    expect(isUsableNewsCoverSrc("/hm/haber-gorsel-hazirlaniyor.svg")).toBe(false);
    expect(isUsableNewsCoverSrc("https://cdn.example.com/cover.jpg")).toBe(true);
  });

  it("anasayfa listesinden görselsiz haberi çıkarır", () => {
    const kept = filterNewsItemsWithCoverImage([
      { title: "Resimli", imageUrl: "https://cdn.example.com/a.jpg" },
      { title: "Boş", imageUrl: "" },
      { title: "Placeholder", imageUrl: HM_NEWS_PLACEHOLDER_SVG },
    ]);
    expect(kept.map((item) => item.title)).toEqual(["Resimli"]);
  });

  it("harici URL string’i kapak sayılır; runtime fail ayrı hide zincirine bırakılır", () => {
    const kept = filterNewsItemsWithCoverImage([
      { title: "SHA", imageUrl: "https://sehirhaberajansi.com.tr/uploads/reha.jpg" },
    ]);
    expect(kept).toHaveLength(1);
  });
});

