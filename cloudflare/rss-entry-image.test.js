import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { encodeHttpImageUrl, extractRssBlockImageUrl } from "./rss-entry-image.js";

const NTV_ENTRY = `<entry>
    <id>https://www.ntv.com.tr/dunya/ornek-haber</id>
    <title type="text">İsrail seçimlerinde Türkiye gündemi</title>
    <summary type="text">Özet</summary>
    <published>2026-08-20T13:44:00+03:00</published>
    <link rel="alternate" href="https://www.ntv.com.tr/dunya/ornek-haber" />
    <enclosure type="image/jpeg" url="https://images.ntv.com.tr/images/Ekrangörüntüsü2026-08-15091745-610242.png" />
    <content type="html"><![CDATA[<img src="https://images.ntv.com.tr/images/Ekrangörüntüsü2026-08-15091745-610242.png?width=930&format=webp" class="type:primaryImage" alt="x" />
<p>ABD'nin Cleveland şehrinde bulunan hastane.</p>]]></content>
</entry>`;

describe("rss-entry-image", () => {
  it("encodes Turkish characters in NTV image paths", () => {
    const out = encodeHttpImageUrl(
      "https://images.ntv.com.tr/images/Ekrangörüntüsü2026-08-15091745-610242.png?width=930&format=webp",
    );
    assert.match(out, /Ekrang%C3%B6r%C3%BCnt%C3%BCs%C3%BC/);
    assert.match(out, /width=930/);
  });

  it("reads NTV Atom enclosure when media:thumbnail is missing", () => {
    const url = extractRssBlockImageUrl(NTV_ENTRY);
    assert.ok(url);
    assert.match(url, /^https:\/\/images\.ntv\.com\.tr\/images\//);
    assert.match(url, /Ekrang%C3%B6r%C3%BCnt%C3%BCs%C3%BC/);
  });

  it("falls back to CDATA content img when enclosure is absent", () => {
    const xml = `<entry>
      <content type="html"><![CDATA[<img src="https://images.ntv.com.tr/images/447578-654307.jpg?width=930&format=webp" />]]></content>
    </entry>`;
    assert.equal(
      extractRssBlockImageUrl(xml),
      "https://images.ntv.com.tr/images/447578-654307.jpg?width=930&format=webp",
    );
  });

  it("ignores non-image enclosures", () => {
    const xml = `<item><enclosure type="audio/mpeg" url="https://cdn.example/a.mp3" /></item>`;
    assert.equal(extractRssBlockImageUrl(xml), null);
  });
});
