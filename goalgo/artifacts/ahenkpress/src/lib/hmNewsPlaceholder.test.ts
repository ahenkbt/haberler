import { describe, expect, it } from "vitest";
import {
  HM_NEWS_PLACEHOLDER_IMAGE,
  HM_NEWS_PLACEHOLDER_SVG,
  isHmNewsPlaceholderSrc,
} from "./hmNewsPlaceholder";

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
});
