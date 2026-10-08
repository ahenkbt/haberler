import { describe, expect, it, vi } from "vitest";

vi.mock("./articlePageImage.js", () => ({
  fetchArticlePageImageUrl: vi.fn(async () => "https://cdn.example/og.jpg"),
}));

import { resolveRssImportCoverImage } from "./rss-import-cover.js";

describe("resolveRssImportCoverImage", () => {
  it("keeps existing https and local upload covers", async () => {
    await expect(
      resolveRssImportCoverImage({
        link: "https://cumha.com.tr/a",
        existing: "https://cumha.com.tr/uploads/a.webp",
      }),
    ).resolves.toContain("cumha.com.tr");
    await expect(
      resolveRssImportCoverImage({
        link: "https://cumha.com.tr/a",
        existing: "/api/media/uploads/rss-cover.webp",
      }),
    ).resolves.toBe("/api/media/uploads/rss-cover.webp");
  });

  it("reads Cumha enclosure from raw item", async () => {
    const raw = `<item>
      <enclosure url="https://cumha.com.tr/uploads/images/202610/image_870x_abc.webp" type="image/webp"/>
      <media:content url="https://cumha.com.tr/uploads/images/202610/image_870x_abc.webp" medium="image"/>
    </item>`;
    await expect(
      resolveRssImportCoverImage({
        link: "https://cumha.com.tr/haber-1",
        rawItem: raw,
      }),
    ).resolves.toContain("cumha.com.tr/uploads");
  });

  it("falls back to contentHtml img when feed has no enclosure", async () => {
    await expect(
      resolveRssImportCoverImage({
        link: "https://www.ntv.com.tr/turkiye/foo",
        contentHtml: `<p><img src="https://images.ntv.com.tr/images/AW805480_01-730515.jpg?width=930&format=webp"></p>`,
      }),
    ).resolves.toContain("images.ntv.com.tr");
  });
});
