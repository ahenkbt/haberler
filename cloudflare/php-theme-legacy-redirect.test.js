import assert from "node:assert/strict";
import test from "node:test";
import {
  isPhpThemePublicHost,
  phpThemeLegacyRedirectPath,
  phpThemeLegacyRedirectResponse,
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

test("köşe yazarı paneli SPA'da kalır (yönlendirme yok)", () => {
  for (const p of [
    "/tr/asg/yazar/giris",
    "/tr/asg/yazar/sifremi-unuttum",
    "/tr/asg/yazar/sifre-yenile",
    "/tr/asg/yazar/haberler",
    "/tr/asg/yazar/sifre",
    "/tr/asg/yazar/haber/yeni",
    "/tr/asg/yazar/haber/12345",
    "/tr/asg/yazar/huseyin-akin",
  ]) {
    assert.equal(phpThemeLegacyRedirectPath(p), null, p);
    assert.equal(run(`https://ankarasehirgazetesi.com${p}`), null, p);
  }
});

test("PHP temada karşılığı olmayan yollar ve GET dışı istekler dokunulmaz", () => {
  assert.equal(phpThemeLegacyRedirectPath("/tr/asg/sondakika"), null);
  assert.equal(phpThemeLegacyRedirectPath("/tr/asg/haber"), null);
  assert.equal(phpThemeLegacyRedirectPath("/tr/asg/haber/a/b"), null);
  assert.equal(phpThemeLegacyRedirectPath("/editor/haberler"), null);
  assert.equal(phpThemeLegacyRedirectPath("/api/hm/author/news"), null);
  assert.equal(phpThemeLegacyRedirectPath("/haber/x"), null);
  assert.equal(run("https://ankarasehirgazetesi.com/tr/asg/haber/x", "POST"), null);
});
