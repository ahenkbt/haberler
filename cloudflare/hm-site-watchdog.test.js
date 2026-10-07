import assert from "node:assert/strict";
import test from "node:test";
import {
  classifySiteProbeIssues,
  listActiveHmSites,
  siteProbePaths,
} from "./hm-site-watchdog.js";

test("listActiveHmSites display_name kullanır (name kolonu yok)", async () => {
  let seen = "";
  const sql = async (strings) => {
    seen = Array.from(strings).join("");
    return [
      {
        id: 3,
        slug: "asg",
        display_name: "Ankara",
        domain: "asg.com.tr",
        domain2: null,
        domain3: null,
        active: true,
      },
    ];
  };
  const rows = await listActiveHmSites(sql);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "Ankara");
  assert.equal(rows[0].slug, "asg");
  assert.match(seen, /display_name/);
  // Şemada `name` yok — SELECT listesinde çıplak name olmamalı.
  const withoutDisplay = seen.replace(/display_name/gi, "");
  assert.doesNotMatch(withoutDisplay, /\bname\b/);
});

test("listActiveHmSites sql yoksa boş dizi", async () => {
  assert.deepEqual(await listActiveHmSites(null), []);
});

test("siteProbePaths PHP tema hostlarını işaretler", () => {
  const v = siteProbePaths("vatanhaber.net");
  assert.equal(v.phpTheme, true);
  assert.equal(v.corporate, false);
  assert.equal(v.editor, "https://vatanhaber.net/editor/giris");
  assert.equal(v.kose, "https://vatanhaber.net/koseyazari/giris");

  const vkd = siteProbePaths("vatankahramanlari.org");
  assert.equal(vkd.phpTheme, true);
  assert.equal(vkd.corporate, true);
});

test("PHP tema editor 404 + home 200 + dual-write → soft, hard yok", () => {
  const { hard, soft } = classifySiteProbeIssues({
    home: { ok: true, status: 200, ms: 120 },
    editor: { ok: false, status: 404 },
    kose: { ok: true, status: 200 },
    phpTheme: true,
    corporate: false,
    dualWriteReady: true,
  });
  assert.deepEqual(hard, []);
  assert.equal(soft.length, 1);
  assert.match(soft[0], /self-fetch|SPA Worker/i);
});

test("SPA olmayan sitede editor 404 → hard", () => {
  const { hard, soft } = classifySiteProbeIssues({
    home: { ok: true, status: 200, ms: 100 },
    editor: { ok: false, status: 404 },
    kose: { ok: true, status: 200 },
    phpTheme: false,
    corporate: false,
    dualWriteReady: true,
  });
  assert.deepEqual(hard, ["editör girişi açılmıyor"]);
  assert.deepEqual(soft, []);
});

test("VKD/TGD home fail → soft Hostinger notu, hard yok (haber twin kırılmaz)", () => {
  const { hard, soft } = classifySiteProbeIssues({
    home: { ok: false, status: 0, ms: 9000 },
    editor: { ok: false, status: 0 },
    kose: { ok: false, status: 0 },
    phpTheme: true,
    corporate: true,
    dualWriteReady: true,
  });
  assert.deepEqual(hard, []);
  assert.equal(soft.length, 1);
  assert.match(soft[0], /Hostinger php-kurumsal/i);
});

test("gerçek anasayfa kesintisi hard kalır", () => {
  const { hard } = classifySiteProbeIssues({
    home: { ok: false, status: 0 },
    editor: { ok: false, status: 0 },
    kose: { ok: false, status: 0 },
    phpTheme: false,
    corporate: false,
    dualWriteReady: true,
  });
  assert.ok(hard.includes("anasayfa açılmıyor"));
  assert.ok(hard.includes("editör girişi açılmıyor"));
});
