import { describe, expect, it } from "vitest";
import {
  indexShaRssCoversFromXml,
  lookupShaRssCover,
  rssSourceNeedsShaCoverLookup,
} from "./hm-sha-rss-covers.js";

const SHA_YEREL_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>SYM</title>
      <link>https://sehirhaberajansi.com.tr/haber/sym-turkak-akreditasyon-surecini-tamamladi-944</link>
      <enclosure url="https://sehirhaberajansi.com.tr/uploads/1789121609_6aa3d449aa727.jpeg" length="0" type="image/jpeg" />
      <media:content url="https://sehirhaberajansi.com.tr/uploads/1789121609_6aa3d449aa727.jpeg" medium="image" />
    </item>
  </channel>
</rss>`;

describe("SHA RSS kapak eşlemesi", () => {
  it("SHA makale URL'sini tanır", () => {
    expect(rssSourceNeedsShaCoverLookup("https://sehirhaberajansi.com.tr/haber/sym-1")).toBe(true);
    expect(rssSourceNeedsShaCoverLookup("https://yozgatmedya.com/haber/1")).toBe(false);
  });

  it("enclosure URL'sini makale linkine bağlar", () => {
    const map = indexShaRssCoversFromXml(SHA_YEREL_XML);
    const cover = lookupShaRssCover(
      map,
      "https://sehirhaberajansi.com.tr/haber/sym-turkak-akreditasyon-surecini-tamamladi-944",
    );
    expect(cover).toContain("sehirhaberajansi.com.tr/uploads/1789121609");
  });
});
