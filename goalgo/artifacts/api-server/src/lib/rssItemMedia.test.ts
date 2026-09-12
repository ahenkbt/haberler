import { describe, expect, it } from "vitest";
import { extractRssCoverImage, extractRssImageUrls } from "./rssItemMedia.js";

describe("extractRssImageUrls", () => {
  it("SHA enclosure (length=0) ve media:content görsellerini alır", () => {
    const raw = `
      <item>
        <title>SYM</title>
        <enclosure url="https://sehirhaberajansi.com.tr/uploads/1789121609_6aa3d449aa727.jpeg" length="0" type="image/jpeg" />
        <media:content url="https://sehirhaberajansi.com.tr/uploads/1789121609_6aa3d449aa727.jpeg" medium="image" />
      </item>
    `;
    expect(extractRssCoverImage(raw, "", "https://sehirhaberajansi.com.tr/haber/sym")).toContain(
      "sehirhaberajansi.com.tr/uploads/",
    );
  });

  it("enclosure ve media:content görsellerini alır", () => {
    const raw = `
      <item>
        <title>Test</title>
        <enclosure url="https://static.birgun.net/resim/haber/2026/09/12/foto.jpg" type="image/jpeg" />
      </item>
    `;
    expect(extractRssCoverImage(raw, "", "https://www.birgun.net/haber/test")).toContain("static.birgun.net");
  });

  it("data-src ve type=image media:content okur", () => {
    const raw = `
      <item>
        <media:content type="image/jpeg" url="https://i.example.com/media/foto.webp" />
        <description><![CDATA[<img data-src="https://i.example.com/uploads/lazy.jpg" />]]></description>
      </item>
    `;
    const urls = extractRssImageUrls(raw, `<img data-src="https://i.example.com/uploads/lazy.jpg" />`, "https://example.com/haber");
    expect(urls.some((u) => /foto\.webp|lazy\.jpg/.test(u))).toBe(true);
  });
});
