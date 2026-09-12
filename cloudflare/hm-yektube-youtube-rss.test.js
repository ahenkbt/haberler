import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hmYektubeRssChannelsFor,
  mapYoutubeRssToCatalogItem,
  parseYoutubeAtomEntries,
  youtubeChannelRssUrl,
} from "./hm-yektube-youtube-rss.js";

const SAMPLE_ATOM = `<?xml version="1.0"?>
<feed>
  <entry>
    <yt:videoId>dQw4w9wgGcQ</yt:videoId>
    <title>Örnek haber</title>
    <author><name>NTV</name></author>
  </entry>
</feed>`;

describe("hm-yektube-youtube-rss", () => {
  it("builds UC channel Atom URLs", () => {
    assert.match(youtubeChannelRssUrl("UC9TDTjbOjFB9jADmPhSAPsw"), /channel_id=UC9TDTjbOjFB9jADmPhSAPsw/);
    assert.equal(youtubeChannelRssUrl("@NTV"), "");
  });

  it("parses Atom and maps yektube.com watch URLs", () => {
    const rows = parseYoutubeAtomEntries(SAMPLE_ATOM);
    assert.equal(rows.length, 1);
    const item = mapYoutubeRssToCatalogItem(rows[0], "haberler", "NTV");
    assert.equal(item.watchUrl, "https://yektube.com/yp/?v=dQw4w9wgGcQ");
    assert.equal(item.categorySlug, "haberler");
  });

  it("picks haberler feeds for Tümü", () => {
    const all = hmYektubeRssChannelsFor("");
    assert.ok(all.length > 0);
    assert.ok(all.every((c) => c.category === "haberler"));
  });
});
