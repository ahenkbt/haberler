import assert from "node:assert/strict";
import test from "node:test";
import { handleKhEditorDataEdge } from "./hm-editor-kh-data-edge.js";

test("köşe yazarı makalesi oturumsuz 401 döner", async () => {
  const url = new URL("https://ahenk.net.tr/api/hm/author/news");
  const res = await handleKhEditorDataEdge(
    new Request(url, { method: "POST", body: "{}" }),
    {},
    url,
  );
  assert.ok(res);
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.match(body.error, /Köşe yazarı oturumu/);
});

test("köşe yazarı kategori listesi oturumsuz 401 döner", async () => {
  const url = new URL("https://ahenk.net.tr/api/hm/author/categories");
  const res = await handleKhEditorDataEdge(new Request(url), {}, url);
  assert.ok(res);
  assert.equal(res.status, 401);
});

test("köşe yazarı girişi JSON olmadan 400 döner, Container yok", async () => {
  const url = new URL("https://yesilvatan.gen.tr/api/hm/author/login");
  const res = await handleKhEditorDataEdge(
    new Request(url, { method: "POST", body: "not-json" }),
    {},
    url,
  );
  assert.ok(res);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /JSON/i);
});

test("köşe yazarı girişi eksik şifrede 400 döner", async () => {
  const url = new URL("https://yesilvatan.gen.tr/api/hm/author/login");
  const res = await handleKhEditorDataEdge(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.c", siteSlug: "yesilvatan" }),
    }),
    {},
    url,
  );
  assert.ok(res);
  assert.equal(res.status, 400);
});

test("köşe yazarı /me oturumsuz 401 döner", async () => {
  const url = new URL("https://ahenk.net.tr/api/hm/author/me");
  const res = await handleKhEditorDataEdge(new Request(url), {}, url);
  assert.ok(res);
  assert.equal(res.status, 401);
});
