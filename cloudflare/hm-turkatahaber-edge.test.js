import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isTurkatahaberHost,
  turkataLayoutNeedsRepair,
  TURKATAHABER_DOMAIN,
} from "./hm-turkatahaber-edge.js";

describe("hm-turkatahaber-edge", () => {
  it("detects iller-only legacy nav", () => {
    assert.equal(turkataLayoutNeedsRepair(JSON.stringify({ hmNavOnlyCategorySlugs: ["yerel"] })), true);
    assert.equal(turkataLayoutNeedsRepair(""), true);
  });

  it("accepts cumha page allowlist with bolge-* and gundemi /daha logos", () => {
    const layout = {
      hmNavOnlyCategorySlugs: [
        "yerel",
        "cumhurbaskanligi",
        "bakanliklar",
        "tbmm",
        "siyasi-partiler",
        "yerel-yonetimler",
        "mulki-idare",
        "toplum-ve-yasam",
        "daha",
        "sivil-toplum-kuruluslari",
        "kamu-kurumlari",
        "bolge-marmara",
        "ankara",
      ],
      logoUrl: "/turkata/turkata-logo.webp",
      hmExtraPages: [
        {
          slug: "daha",
          bodyHtml:
            '<div class="hm-daha-proje hm-daha-site-grid"><a href="https://ankarahabergundemi.com/">AHG</a><a href="https://vatanhaber.net/">Vatan</a><a href="https://ege.gundemi.org/">Ege</a><a href="https://doguanadolu.gundemi.org/">Doğu</a><a href="https://guneydogu.gundemi.org/">Güneydoğu</a></div>',
        },
      ],
    };
    assert.equal(turkataLayoutNeedsRepair(JSON.stringify(layout)), false);
  });

  it("flags /daha layouts missing gundemi regionals or still listing TUKAV", () => {
    const base = {
      hmNavOnlyCategorySlugs: [
        "yerel",
        "cumhurbaskanligi",
        "bakanliklar",
        "tbmm",
        "siyasi-partiler",
        "yerel-yonetimler",
        "mulki-idare",
        "toplum-ve-yasam",
        "daha",
        "sivil-toplum-kuruluslari",
        "kamu-kurumlari",
        "bolge-marmara",
      ],
      logoUrl: "/turkata/turkata-logo.webp",
    };
    assert.equal(
      turkataLayoutNeedsRepair(
        JSON.stringify({
          ...base,
          hmExtraPages: [{ slug: "daha", bodyHtml: '<div class="hm-daha-proje hm-daha-site-grid"></div>' }],
        }),
      ),
      true,
    );
    assert.equal(
      turkataLayoutNeedsRepair(
        JSON.stringify({
          ...base,
          hmExtraPages: [
            {
              slug: "daha",
              bodyHtml:
                '<div class="hm-daha-proje hm-daha-site-grid"><a href="https://ege.gundemi.org/">Ege</a><a href="https://doguanadolu.gundemi.org/">Doğu</a><a href="https://guneydogu.gundemi.org/">Güneydoğu</a><a href="https://tukav.org/">TÜKAV</a></div>',
            },
          ],
        }),
      ),
      true,
    );
  });

  it("flags tepe-only allowlist missing bolge-*", () => {
    const layout = {
      hmNavOnlyCategorySlugs: [
        "yerel",
        "cumhurbaskanligi",
        "bakanliklar",
        "tbmm",
        "siyasi-partiler",
        "yerel-yonetimler",
        "mulki-idare",
        "toplum-ve-yasam",
        "daha",
        "sivil-toplum-kuruluslari",
        "kamu-kurumlari",
      ],
      logoUrl: "/turkata/turkata-logo.webp",
    };
    assert.equal(turkataLayoutNeedsRepair(JSON.stringify(layout)), true);
  });

  it("host match", () => {
    assert.equal(isTurkatahaberHost(TURKATAHABER_DOMAIN), true);
    assert.equal(isTurkatahaberHost("www.turkatahaber.com"), true);
    assert.equal(isTurkatahaberHost("fix.tc"), false);
  });
});
