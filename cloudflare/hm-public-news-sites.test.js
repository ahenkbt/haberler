import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { logoVersion, publicNewsSitesFromRows, rebrandAssignmentForSlug, renderIlSitesGrid, renderNewsSitesGrid, replacedPublicHost, textLogoSvg } from "./hm-public-news-sites.js";

const L = (o) => JSON.stringify(o);

describe("hm-public-news-sites", () => {
  const rows = [
    { id: 1, slug: "vatanhaber", domain: "vatanhaber.net", display_name: "Vatan Haber", active: true, layout_json: L({ logoUrl: "https://vatanhaber.net/media/logos/x.png" }) },
    { id: 7, slug: "vkd", domain: "vatankahramanlari.org", display_name: "VKD", active: true, layout_json: L({ logoUrl: "/v.png" }) },
    { id: 11, slug: "trafik", domain: "trafik.gd", display_name: "TGD", active: true, layout_json: L({ logoUrl: "/t.png" }) },
    { id: 61, slug: "tr", domain: "tukav.org", display_name: "Vakıf", active: true, layout_json: "{}" },
    { id: 229, slug: "kirsehirhaber", domain: "kirsehirhaber.org", display_name: "KH", active: true, layout_json: L({ hmPublicSuspended: true, logoUrl: "data:image/png;base64,AAAA" }) },
    { id: 230, slug: "turkatahaber", domain: "turkatahaber.com", display_name: "TÜRKATA", active: true, layout_json: L({ logoUrl: "/turkata/l.webp" }) },
    { id: 233, slug: "turksav", domain: "turksav.org", display_name: "TürkSav", active: true, layout_json: L({ logoUrl: "/turksav/l.png", hmLogoBarBackground: "#071422" }) },
    { id: 1134, slug: "marmara-gundemi", domain: "marmara.gundemi.org", display_name: "Marmara", active: false, layout_json: L({ logoUrl: "/a.png" }) },
    { id: 1144, slug: "marmara-gundemi", domain: "marmara.gundemi.org", display_name: "Marmara", active: true, layout_json: L({ logoUrl: "/g.png" }) },
    { id: 1143, slug: "marmara-gundemi", domain: "marmara.gundemi.org", display_name: "Marmara", active: true, layout_json: L({ logoUrl: "/g.png" }) },
    { id: 9999, slug: "yeni", domain: "yeni.gundemi.org", display_name: "Yeni Site", active: true, layout_json: null },
  ];

  it("keeps active news sites; drops corporate 7/11/61, suspended and inactive; one tile per domain", () => {
    const out = publicNewsSitesFromRows(rows);
    assert.deepEqual(out.map((s) => s.id), [1, 230, 233, 1143, 9999]);
    assert.equal(out.find((s) => s.id === 233).logoBg, "#071422");
    assert.equal(out.find((s) => s.id === 9999).logoRaw, "");
    assert.equal(out[0].url, "https://vatanhaber.net/");
  });

  it("logo version changes with the logo setting", () => {
    assert.notEqual(logoVersion("/a.png"), logoVersion("/b.png"));
    assert.equal(logoVersion("/a.png"), logoVersion("/a.png"));
  });

  it("renders a linked grid with names; no corporate links", () => {
    const html = renderNewsSitesGrid([
      { id: 1, name: "Vatan <Haber>", domain: "vatanhaber.net", url: "https://vatanhaber.net/", logo: "/api/hm/public/news-sites/1/logo?v=1", logoBg: "" },
      { id: 9, name: "Yeni", domain: "yeni.gundemi.org", url: "https://yeni.gundemi.org/", logo: "", logoBg: "#000" },
    ]);
    assert.match(html, /id="daha-haber-siteleri"/);
    assert.match(html, /href="https:\/\/vatanhaber\.net\/"/);
    assert.match(html, /Vatan &lt;Haber&gt;/);
    assert.match(html, /hm-ns-initial">Yeni</);
    assert.doesNotMatch(html, /tukav|vatankahramanlari|trafik/);
  });

  it("81 İl: il siteleri (hmIl81) ana listede yok, ayrı il listesinde plaka sırasıyla", () => {
    const il = [
      ...rows,
      { id: 1150, slug: "izmir", domain: "izmir.fix.tc", display_name: "İzmir Gündemi", active: true, layout_json: L({ logoUrl: "/gundemi/logos/izmir-gundemi.png", hmIl81: { slug: "izmir", il: "İzmir", plate: "35", region: "ege" } }) },
      { id: 1154, slug: "adana", domain: "adana.fix.tc", display_name: "Adana Gündemi", active: true, layout_json: L({ logoUrl: "/gundemi/logos/adana-gundemi.png", hmIl81: { slug: "adana", il: "Adana", plate: "01", region: "akdeniz" } }) },
      { id: 1160, slug: "hatay", domain: "hatay.fix.tc", display_name: "Hatay Gündemi", active: false, layout_json: L({ hmIl81: { slug: "hatay", il: "Hatay", plate: "31" } }) },
    ];
    assert.deepEqual(publicNewsSitesFromRows(il).map((s) => s.id), [1, 230, 233, 1143, 9999]);
    const out = publicNewsSitesFromRows(il, { group: "il" });
    assert.deepEqual(out.map((s) => s.id), [1154, 1150]);
    assert.equal(out[0].il, "Adana");
    assert.equal(out[1].region, "ege");
    const html = renderIlSitesGrid([{ id: 1150, name: "İzmir Gündemi", domain: "izmir.fix.tc", url: "https://izmir.fix.tc/", logo: "", logoBg: "" }]);
    assert.match(html, /id="daha-il-siteleri"/);
    assert.match(html, /İl Siteleri/);
    assert.match(html, /\/iller/);
  });

  it("hmDisplayNameOverride wins over display_name", () => {
    const out = publicNewsSitesFromRows([
      { id: 1141, slug: "gundemi", domain: "gundemi.org", display_name: "Gündemi.org", active: true, layout_json: L({ logoUrl: "/gundemi/logos/gundem-istanbul.png", hmDisplayNameOverride: "Gündem İstanbul" }) },
    ], { group: "il" });
    assert.equal(out[0].name, "Gündem İstanbul");
  });

  it("logogrid: Gündem İstanbul (gundemi.org) is FIRST in İl Siteleri and not in the main group", () => {
    const rows = [
      { id: 1154, slug: "adana", domain: "adana.fix.tc", display_name: "Adana Gündemi", active: true, layout_json: L({ logoUrl: "/a.png", hmIl81: { il: "Adana", plate: "01" } }) },
      { id: 1141, slug: "gundemi", domain: "gundemi.org", display_name: "Gündemi.org", active: true, layout_json: L({ logoUrl: "/gundemi/logos/gundem-istanbul.png" }) },
      { id: 2, slug: "su", domain: "suhaber.net", display_name: "Su", active: true, layout_json: L({ logoUrl: "/s.png" }) },
    ];
    const il = publicNewsSitesFromRows(rows, { group: "il" });
    assert.deepEqual(il.map((s) => s.domain), ["gundemi.org", "adana.fix.tc"]);
    assert.equal(il[0].name, "Gündem İstanbul");
    assert.equal(il[0].plate, "34");
    assert.deepEqual(publicNewsSitesFromRows(rows).map((s) => s.domain), ["suhaber.net"]);
  });

  it("ASG and AHG stay on the tanıtım grid under ankara.fix.tc and gundem.fix.tc", () => {
    const rows = [
      { id: 3, slug: "asg", domain: "ankarasehirgazetesi.com", display_name: "Ankara Şehir Gazetesi", active: false, layout_json: L({ logoUrl: "data:image/png;base64,AAAA" }) },
      { id: 8, slug: "ankarahabergundemi", domain: "ankarahabergundemi.com", display_name: "Ankara Haber Gündemi", active: true, layout_json: L({ logoUrl: "/ahg.png", hmPublicSuspended: true }) },
    ];
    const main = publicNewsSitesFromRows(rows);
    assert.deepEqual(main.map((s) => s.domain), ["ankara.fix.tc", "gundem.fix.tc"]);
    assert.equal(publicNewsSitesFromRows(rows, { group: "il" }).length, 0);
    assert.equal(replacedPublicHost(rows[0], "ankarasehirgazetesi.com"), "ankara.fix.tc");
    assert.equal(rebrandAssignmentForSlug("asg").domain, "ankara.fix.tc");
    assert.equal(rebrandAssignmentForSlug("asg").domain2, null);
    assert.equal(rebrandAssignmentForSlug("asg").domain3, null);
    assert.equal(rebrandAssignmentForSlug("ankarahabergundemi").domain, "gundem.fix.tc");
    assert.equal(rebrandAssignmentForSlug("ankarahabergundemi").domain2, null);
    assert.equal(rebrandAssignmentForSlug("ahg").domain3, null);
    assert.equal(rebrandAssignmentForSlug("vatanhaber"), null);
    assert.doesNotMatch(main.map((s) => s.domain).join(" "), /ankarasehirgazetesi|ankarahabergundemi/);
  });

  it("logogrid: text logo fallback is an SVG in the site colour", () => {
    const svg = textLogoSvg("Yeşil Vatan", "#1d7a3a", "yesilvatan.gen.tr");
    assert.match(svg, /^<svg /);
    assert.match(svg, /#1d7a3a/);
    assert.match(svg, /YEŞİL/);
    assert.match(svg, /yesilvatan\.gen\.tr/);
  });
});
