import { describe, expect, it } from "vitest";

/** buildYektubeVideoSitemapXml ile aynı kural — GSC: player_loc ≠ loc. */
function youtubeEmbedPlayerLoc(videoId: string): string {
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
}

describe("yektube video sitemap locs", () => {
  it("player_loc uses YouTube embed, not the watch page loc", () => {
    const loc = "https://yekpare.net/yp/kanal/demo/video-abc123";
    const player = youtubeEmbedPlayerLoc("abc123");
    expect(player).toBe("https://www.youtube.com/embed/abc123");
    expect(player).not.toBe(loc);
  });

  it("does not use YouTube watch URL as content_loc (not a media file)", () => {
    const watch = "https://www.youtube.com/watch?v=abc123";
    // content_loc omitted for embed-only videos — Google wants a real media file here.
    expect(watch.includes("/watch?v=")).toBe(true);
  });
});
