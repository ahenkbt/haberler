import assert from "node:assert/strict";
import test from "node:test";
import {
  isPhpThemePublicHost,
  isPhpCorporateThemeHost,
  listPhpThemePublicApexHosts,
  listPhpCorporateThemeApexHosts,
  phpThemeLegacyRedirectPath,
  phpThemeLegacyRedirectResponse,
  koseyazariPanelRedirectPath,
  koseyazariPanelRedirectResponse,
} from "./php-theme-legacy-redirect.js";

function run(url, method = "GET") {
  const incoming = new URL(url);
  return phpThemeLegacyRedirectResponse(new Request(url, { method }), incoming);
}

test("PHP tema hostları: ASG + Ekim 2026 twin'ler + kurumsal PHP; askı kapısı hariç", () => {
  const apex = listPhpThemePublicApexHosts();
  assert.ok(apex.includes("ankarasehirgazetesi.com"));
  assert.ok(apex.includes("yesilvatan.gen.tr"));
  assert.ok(apex.includes("sehitgazi.org.tr"));
  assert.ok(apex.includes("turksav.org"));
  assert.ok(apex.includes("dunyasaglik.org"));
  assert.ok(apex.includes("yerel.net.tr"));
  assert.ok(apex.includes("gundemi.org"));
  assert.ok(apex.includes("ege.gundemi.org"));
  assert.ok(apex.includes("akdeniz.gundemi.org"));
  assert.ok(apex.includes("kibris.gundemi.org"));
  assert.ok(apex.includes("vatankahramanlari.org"));
  assert.ok(apex.includes("trafikdernegi.com"));
  assert.ok(apex.includes("tgd.tc"));
  assert.equal(isPhpThemePublicHost("gundemi.org"), true);
  assert.equal(isPhpThemePublicHost("www.gundemi.org"), true);
  assert.equal(isPhpThemePublicHost("ege.gundemi.org"), true);
  assert.equal(isPhpThemePublicHost("icanadolu.gundemi.org"), true);
  assert.equal(isPhpThemePublicHost("ankarasehirgazetesi.com"), true);
  assert.equal(isPhpThemePublicHost("WWW.yesilvatan.gen.tr"), true);
  assert.equal(isPhpThemePublicHost("sehitgazi.org.tr"), true);
  assert.equal(isPhpThemePublicHost("vatankahramanlari.org"), true);
  assert.equal(isPhpThemePublicHost("trafikdernegi.com"), true);
  assert.equal(isPhpCorporateThemeHost("vatankahramanlari.org"), true);
  assert.equal(isPhpCorporateThemeHost("www.trafikdernegi.com"), true);
  assert.equal(isPhpCorporateThemeHost("yesilvatan.gen.tr"), false);
  assert.equal(isPhpThemePublicHost("kirsehirhaber.org"), false);
  assert.equal(isPhpThemePublicHost("ahenk.net.tr"), false);
  assert.equal(run("https://ahenk.net.tr/tr/asg/haber/x"), null);
  assert.equal(run("https://kirsehirhaber.org/tr/kirsehirhaber/haber/x"), null);
});

test("eski SPA haber linki PHP /haber/:slug adresine 301 gider ve siteId silinir", () => {
  const res = run(
    "https://ankarasehirgazetesi.com/tr/asg/haber/ayaklariyla-uretilen-eserlerden-basi-onde-gecisler-sergisi-ankara-da-acildi-sana?siteId=3",
  );
  assert.ok(res);
  assert.equal(res.status, 301);
  assert.equal(
    res.headers.get("location"),
    "https://ankarasehirgazetesi.com/haber/ayaklariyla-uretilen-eserlerden-basi-onde-gecisler-sergisi-ankara-da-acildi-sana",
  );
  assert.equal(res.headers.get("x-yekpare-frontend"), "php-theme-legacy-redirect");
});

test("gundemi bölgesel alt alan eski SPA yolu PHP /haber adresine 301", () => {
  const ege = run("https://ege.gundemi.org/tr/ege-gundemi/haber/izmir-korfezi?siteId=99");
  assert.ok(ege);
  assert.equal(ege.status, 301);
  assert.equal(ege.headers.get("location"), "https://ege.gundemi.org/haber/izmir-korfezi");
  const ak = run("https://akdeniz.gundemi.org/hm/akdeniz-gundemi/kategori/gundemi-akdeniz-antalya");
  assert.ok(ak);
  assert.equal(ak.headers.get("location"), "https://akdeniz.gundemi.org/kategori/gundemi-akdeniz-antalya");
});

test("yesilvatan / sehitgazi eski SPA yolları apex PHP adresine 301", () => {
  const yv = run("https://www.yesilvatan.gen.tr/tr/yesilvatan/haber/orman-yangini?siteId=1090");
  assert.ok(yv);
  assert.equal(yv.status, 301);
  assert.equal(yv.headers.get("location"), "https://yesilvatan.gen.tr/haber/orman-yangini");

  const sg = run("https://sehitgazi.org.tr/hm/sehitgazi/kategori/sehit-gazi");
  assert.ok(sg);
  assert.equal(sg.headers.get("location"), "https://sehitgazi.org.tr/kategori/sehit-gazi");
});

test("VKD / TGD kurumsal SPA yolları apex PHP sayfa yollarına 301", () => {
  const corporate = listPhpCorporateThemeApexHosts();
  assert.deepEqual(corporate.sort(), ["tgd.tc", "trafikdernegi.com", "vatankahramanlari.org"].sort());

  const vkd = run("https://www.vatankahramanlari.org/tr/vkd/hakkimizda");
  assert.ok(vkd);
  assert.equal(vkd.status, 301);
  assert.equal(vkd.headers.get("location"), "https://vatankahramanlari.org/hakkimizda");

  const vkdRoot = run("https://vatankahramanlari.org.tr/hm/vkd");
  assert.ok(vkdRoot);
  assert.equal(vkdRoot.headers.get("location"), "https://vatankahramanlari.org/");

  const tgd = run("https://trafikdernegi.com/tr/trafik/iletisim");
  assert.ok(tgd);
  assert.equal(tgd.headers.get("location"), "https://trafikdernegi.com/iletisim");

  const tgdAlias = run("https://www.tgd.tc/tr/trafik/bagis");
  assert.ok(tgdAlias);
  assert.equal(tgdAlias.headers.get("location"), "https://trafikdernegi.com/bagis");

  assert.equal(phpThemeLegacyRedirectPath("/tr/vkd/hakkimizda", { corporate: true }), "/hakkimizda");
  assert.equal(phpThemeLegacyRedirectPath("/tr/vkd/hakkimizda", { corporate: false }), null);
});

test("www ve /hm/ öneki de apex PHP adresine gider; siteId dışındaki sorgu korunur", () => {
  const res = run("https://www.ankarasehirgazetesi.com/hm/asg/haber/ornek-haber?siteId=3&utm_source=x");
  assert.ok(res);
  assert.equal(res.headers.get("location"), "https://ankarasehirgazetesi.com/haber/ornek-haber?utm_source=x");
});

test("kategori, yazarlar, sayısal yazar ve site kökü eşlemeleri", () => {
  assert.equal(phpThemeLegacyRedirectPath("/tr/asg/kategori/gundem"), "/kategori/gundem");
  assert.equal(phpThemeLegacyRedirectPath("/tr/asg/kategori/gundem/"), "/kategori/gundem");
  assert.equal(phpThemeLegacyRedirectPath("/tr/asg/yazarlar"), "/yazarlar");
  assert.equal(phpThemeLegacyRedirectPath("/tr/asg/yazar/526"), "/yazar/a526");
  assert.equal(phpThemeLegacyRedirectPath("/tr/asg/yazar/a526"), "/yazar/a526");
  assert.equal(phpThemeLegacyRedirectPath("/tr/asg/makale/bir-kose-yazisi"), "/haber/bir-kose-yazisi");
  assert.equal(phpThemeLegacyRedirectPath("/tr/asg"), "/");
  assert.equal(phpThemeLegacyRedirectPath("/tr/asg/"), "/");
});

test("PHP temada karşılığı olmayan yollar ve GET dışı istekler dokunulmaz", () => {
  assert.equal(phpThemeLegacyRedirectPath("/tr/asg/sondakika"), null);
  assert.equal(phpThemeLegacyRedirectPath("/tr/asg/haber"), null);
  assert.equal(phpThemeLegacyRedirectPath("/tr/asg/haber/a/b"), null);
  assert.equal(phpThemeLegacyRedirectPath("/editor/haberler"), null);
  assert.equal(phpThemeLegacyRedirectPath("/api/hm/author/news"), null);
  assert.equal(phpThemeLegacyRedirectPath("/haber/x"), null);
  assert.equal(phpThemeLegacyRedirectPath("/tr/asg/yazar/giris"), null);
  assert.equal(run("https://ankarasehirgazetesi.com/tr/asg/haber/x", "POST"), null);
});

test("/yazar/giris paneli /koseyazari/giris adresine 301 gider; kamu yazar sayfası kalır", () => {
  assert.equal(koseyazariPanelRedirectPath("/yazar/giris"), "/koseyazari/giris");
  assert.equal(koseyazariPanelRedirectPath("/yazar/haberler"), "/koseyazari/haberler");
  assert.equal(koseyazariPanelRedirectPath("/yazar/haber/yeni"), "/koseyazari/haber/yeni");
  assert.equal(koseyazariPanelRedirectPath("/tr/asg/yazar/giris"), "/tr/asg/koseyazari/giris");
  assert.equal(koseyazariPanelRedirectPath("/yazar/a526"), null);
  assert.equal(koseyazariPanelRedirectPath("/yazarlar"), null);
  const portal = koseyazariPanelRedirectResponse(
    new Request("https://ahenk.net.tr/tr/asg/yazar/giris"),
    new URL("https://ahenk.net.tr/tr/asg/yazar/giris"),
  );
  assert.ok(portal);
  assert.equal(portal.status, 301);
  assert.equal(portal.headers.get("location"), "https://ahenk.net.tr/tr/asg/koseyazari/giris");
  assert.equal(
    koseyazariPanelRedirectResponse(
      new Request("https://yesilvatan.gen.tr/yazar/giris"),
      new URL("https://yesilvatan.gen.tr/yazar/giris"),
    ),
    null,
  );
});
