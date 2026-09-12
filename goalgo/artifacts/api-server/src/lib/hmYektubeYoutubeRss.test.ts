import { describe, expect, it } from "vitest";
import {
  hmYektubeRssChannelsFor,
  mapYoutubeRssToCatalogItem,
  parseYoutubeAtomEntries,
  youtubeChannelRssUrl,
} from "./hmYektubeYoutubeRss.js";

const SAMPLE_ATOM = `<?xml version="1.0"?>
<feed>
  <entry>
    <yt:videoId>dQw4w9wgGcQ</yt:videoId>
    <title>Örnek haber</title>
    <author><name>NTV</name></author>
    <media:thumbnail url="https://i.ytimg.com/vi/dQw4w9wgGcQ/hqdefault.jpg"/>
  </entry>
  <entry>
    <yt:videoId>aaaaaaaaaaa</yt:videoId>
    <title>Deleted video</title>
  </entry>
</feed>`;

describe("hmYektubeYoutubeRss", () => {
  it("builds channel Atom URLs only for UC ids", () => {
    expect(youtubeChannelRssUrl("UC9TDTjbOjFB9jADmPhSAPsw")).toContain("channel_id=UC9TDTjbOjFB9jADmPhSAPsw");
    expect(youtubeChannelRssUrl("@NTV")).toBeNull();
  });

  it("parses Atom entries and drops deleted titles", () => {
    const rows = parseYoutubeAtomEntries(SAMPLE_ATOM);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.videoId).toBe("dQw4w9wgGcQ");
    expect(rows[0]?.title).toBe("Örnek haber");
  });

  it("maps RSS to HM catalog DTO without news writes", () => {
    const item = mapYoutubeRssToCatalogItem(
      { videoId: "dQw4w9wgGcQ", title: "Örnek", thumbnail: null, channelName: "NTV" },
      "haberler",
    );
    expect(item).toMatchObject({
      videoId: "dQw4w9wgGcQ",
      title: "Örnek",
      watchUrl: "https://yektube.com/yp/?v=dQw4w9wgGcQ",
      categorySlug: "haberler",
      isStory: false,
    });
  });

  it("uses haberler UC channels for Tümü", () => {
    const all = hmYektubeRssChannelsFor(null);
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((c) => c.category === "haberler")).toBe(true);
    expect(hmYektubeRssChannelsFor("spor").every((c) => c.category === "spor")).toBe(true);
  });
});
