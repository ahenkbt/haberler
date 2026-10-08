import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isKamuYerelDunyaRedirectHost,
  kamuYerelDunyaChildSlugFromPath,
  kamuYerelDunyaRedirectResponse,
} from "./hm-kamu-yerel-dunya-redirect.js";

describe("hm-kamu-yerel-dunya-redirect", () => {
  it("matches kamu-yerel hosts", () => {
    assert.equal(isKamuYerelDunyaRedirectHost("turkatahaber.com"), true);
    assert.equal(isKamuYerelDunyaRedirectHost("www.yerel.net.tr"), true);
    assert.equal(isKamuYerelDunyaRedirectHost("fix.tc"), false);
  });

  it("parses Dünya child kategori paths", () => {
    assert.equal(kamuYerelDunyaChildSlugFromPath("/kategori/nato"), "nato");
    assert.equal(kamuYerelDunyaChildSlugFromPath("/kategori/avrupa-birligi/"), "avrupa-birligi");
    assert.equal(kamuYerelDunyaChildSlugFromPath("/kategori/dunya"), null);
    assert.equal(kamuYerelDunyaChildSlugFromPath("/kategori/ankara"), null);
  });

  it("301 redirects child slugs to /kategori/dunya", () => {
    const incoming = new URL("https://turkatahaber.com/kategori/nato");
    const res = kamuYerelDunyaRedirectResponse(
      new Request(incoming.toString()),
      incoming,
    );
    assert.ok(res);
    assert.equal(res.status, 301);
    assert.equal(res.headers.get("location"), "https://turkatahaber.com/kategori/dunya");
    assert.equal(res.headers.get("x-kamu-yerel-dunya-from"), "nato");
  });
});
