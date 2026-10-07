import assert from "node:assert/strict";
import test from "node:test";
import {
  __resetNewsMirrorReadonlySkipForTests,
  mirrorNewsDbWrite,
  setNewsMirrorEnv,
} from "./hm-editor-kh-data-edge.js";
import { buildContainerEnv } from "./container-env.js";
import { edgeMirrorNewsDbWrite } from "./hm-php-news-dual-write.js";

test("env yoksa ayna isteği atılmaz (false)", async () => {
  setNewsMirrorEnv(null);
  assert.equal(await mirrorNewsDbWrite("hm_makaleler", "upsert", { id: 1 }), false);
  setNewsMirrorEnv({});
  assert.equal(await mirrorNewsDbWrite("hm_makaleler", "upsert", { id: 1 }), false);
});

test("Neon satırı Container köprüsüne gizli anahtarla POST edilir", async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ mirrored: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    setNewsMirrorEnv({ API_ORIGIN: "https://ahenk.net.tr", HM_EDGE_BRIDGE_SECRET: "test-secret" });
    const row = { id: 35920, site_id: 3, author_id: 526, slug: "temiz-siyaset-temiz-toplum-2", status: "published" };
    assert.equal(await mirrorNewsDbWrite("hm_makaleler", "upsert", row), true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://ahenk.net.tr/api/hm/bridge/mirror");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers["x-yekpare-hm-edge-bridge"], "test-secret");
    assert.deepEqual(JSON.parse(calls[0].init.body), { table: "hm_makaleler", op: "upsert", row });

    assert.equal(await mirrorNewsDbWrite("hm_makaleler", "delete", 35919), true);
    assert.deepEqual(JSON.parse(calls[1].init.body), { table: "hm_makaleler", op: "delete", id: 35919 });
  } finally {
    globalThis.fetch = originalFetch;
    setNewsMirrorEnv(null);
  }
});

test("köprü hatası panel yanıtını bozmaz (false döner)", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("container down");
  };
  try {
    setNewsMirrorEnv({ API_ORIGIN: "https://ahenk.net.tr", HM_EDGE_BRIDGE_SECRET: "s" });
    assert.equal(await mirrorNewsDbWrite("news", "upsert", { id: 1 }), false);
  } finally {
    globalThis.fetch = originalFetch;
    setNewsMirrorEnv(null);
  }
});

test("NEWS_DB_WRITE / NEWS_DB_READ Worker secret'ı Container'a iletilir; yoksa main kalır", () => {
  const defaults = buildContainerEnv({});
  assert.equal(defaults.NEWS_DB_WRITE, "main");
  assert.equal(defaults.NEWS_DB_READ, "main");
  const dual = buildContainerEnv({ NEWS_DATABASE_URL: "postgres://u:p@h/db", NEWS_DB_WRITE: "dual" });
  assert.equal(dual.NEWS_DB_WRITE, "dual");
  assert.equal(dual.NEWS_DB_READ, "main");
  assert.equal(dual.NEWS_DATABASE_URL, "postgres://u:p@h/db");
});

test("mirrorNewsDbWrite asla throw etmez (fatal soft)", async () => {
  setNewsMirrorEnv(null);
  __resetNewsMirrorReadonlySkipForTests();
  await assert.doesNotReject(async () => {
    assert.equal(await mirrorNewsDbWrite("news", "upsert", { id: 582114 }), false);
  });
});

test("edge RO INSERT sonrası mirrorNewsDbWrite false; panel yolu bozulmaz", async () => {
  const sql = async () => {
    throw new Error("cannot execute INSERT in a read-only transaction");
  };
  const r = await edgeMirrorNewsDbWrite(sql, "news", "upsert", {
    id: 582114,
    siteId: 3,
    slug: "x",
    title: "Y",
  });
  assert.equal(r.mirrored, false);
  assert.equal(r.readonly, true);
});

test("Container ayna kapalı dönerse (mirrored:false) false döner ve nedeni loglanır", async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const warnings = [];
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ mirrored: false, reason: "no-news-database-url" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  console.warn = (...args) => warnings.push(args.map(String).join(" "));
  try {
    setNewsMirrorEnv({ API_ORIGIN: "https://ahenk.net.tr", HM_EDGE_BRIDGE_SECRET: "s" });
    assert.equal(await mirrorNewsDbWrite("hm_makaleler", "upsert", { id: 35921 }), false);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /hm_makaleler upsert no-news-database-url/);
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    setNewsMirrorEnv(null);
  }
});
