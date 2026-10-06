import assert from "node:assert/strict";
import test from "node:test";
import {
  isPhpThemePublicHost,
  phpThemeLegacyRedirectPath,
  phpThemeLegacyRedirectResponse,
  koseyazariPanelRedirectPath,
  koseyazariPanelRedirectResponse,
} from "./php-theme-legacy-redirect.js";

function run(url, method = "GET") {
  const incoming = new URL(url);
  return phpThemeLegacyRedirectResponse(new Request(url, { method }), incoming);
}

test("yalnızca PHP tema hostları (ASG apex + www); kirsehirhaber.org askı kapısında kalır", () => {
  assert.equal(isPhpThemePublicHost("ankarasehirgazetesi.com"), true);
  assert.equal(isPhpThemePublicHost("WWW.ankarasehirgazetesi.com"), true);
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
