import { describe, expect, it } from "vitest";
import {
  buildHmNewsImageSrcChain,
  homeCoverItemKey,
  newsCoverProxyPath,
  nextHmNewsImageSrc,
  takeVisibleHomeCoverItems,
} from "../../../ahenkpress/src/lib/hmNewsImageFail.ts";

describe("anasayfa kapak fail / hide", () => {
  it("birincil + yedek tükendikten sonra aynı-köken vekil dener", () => {
    const primary = "https://sha.example/hotlink.jpg";
    const fallback = "https://sha.example/og.jpg";
    const chain = buildHmNewsImageSrcChain(primary, fallback);
    expect(chain[0]).toBe(primary);
    expect(chain).toContain(fallback);
    expect(chain).toContain(newsCoverProxyPath(primary));
    expect(chain).toContain(newsCoverProxyPath(fallback));
    expect(nextHmNewsImageSrc(chain, primary)).toBe(fallback);
    expect(nextHmNewsImageSrc(chain, chain[chain.length - 1]!)).toBeNull();
  });

  it("yerel upload için vekil üretmez", () => {
    expect(newsCoverProxyPath("/api/media/uploads/rss-abc.webp")).toBeNull();
    expect(buildHmNewsImageSrcChain("/api/media/uploads/rss-abc.webp", "")).toEqual([
      "/api/media/uploads/rss-abc.webp",
    ]);
  });

  it("kırılan kartı gizleyip sonraki kapaklı haberi öne alır", () => {
    const items = [
      { id: 1, title: "Kırık" },
      { id: 2, title: "Sağlam" },
      { id: 3, title: "Yedek" },
    ];
    const hidden = new Set(["1"]);
    const visible = takeVisibleHomeCoverItems(items, hidden, homeCoverItemKey, 2);
    expect(visible.map((item) => item.title)).toEqual(["Sağlam", "Yedek"]);
  });
});
