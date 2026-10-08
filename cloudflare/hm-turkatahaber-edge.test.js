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

  it("accepts cumha page allowlist with bolge-* and /daha tanıtım", () => {
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
            '<div class="hm-daha-proje">x</div> ankarahabergundemi.com vatanhaber.net',
        },
      ],
    };
    assert.equal(turkataLayoutNeedsRepair(JSON.stringify(layout)), false);
  });

  it("flags layouts missing Ankara Haber Gündemi / Vatan Haber on /daha", () => {
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
      ],
      logoUrl: "/turkata/turkata-logo.webp",
      hmExtraPages: [{ slug: "daha", bodyHtml: '<div class="hm-daha-page">eski</div>' }],
    };
    assert.equal(turkataLayoutNeedsRepair(JSON.stringify(layout)), true);
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
