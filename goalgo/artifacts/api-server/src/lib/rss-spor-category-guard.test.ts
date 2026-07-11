import { describe, expect, it } from "vitest";
import { isMisclassifiedSporItem, looksLikeSportsContent } from "./rss-spor-category-guard.js";

describe("rss-spor-category-guard", () => {
  it("detects construction accident as non-sport", () => {
    const title = "Yenimahalle'de İnşaat İskelesinden Düşen İşçi Hayatını Kaybetti";
    expect(looksLikeSportsContent(title)).toBe(false);
    expect(isMisclassifiedSporItem("spor", title)).toBe(true);
  });

  it("keeps real football news in spor", () => {
    const title = "Galatasaray transfer bombasını patlattı";
    expect(looksLikeSportsContent(title)).toBe(true);
    expect(isMisclassifiedSporItem("spor", title)).toBe(false);
  });

  it("ignores non-spor categories", () => {
    expect(isMisclassifiedSporItem("gundem", "Yenimahalle inşaat")).toBe(false);
  });

  it("detects court case and road work as non-sport", () => {
    expect(isMisclassifiedSporItem("spor", "Oğuz Murat Aci davasında yeni gelişme")).toBe(true);
    expect(isMisclassifiedSporItem("spor", "Bursa'da yol yenileme çalışmaları başladı")).toBe(true);
    expect(isMisclassifiedSporItem("spor", "Meteoroloji'den hava durumu uyarısı")).toBe(true);
  });
});
