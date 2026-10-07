import assert from "node:assert/strict";
import test from "node:test";
import { handleKhEditorDataEdge } from "./hm-editor-kh-data-edge.js";
import { edgeDeleteAuthor, edgeMirrorNewsDbWrite } from "./hm-php-news-dual-write.js";

test("bulk-delete oturumsuz 401 — kenar, Container yok", async () => {
  const url = new URL("https://vatanhaber.net/api/hm/editor/authors/bulk-delete");
  const res = await handleKhEditorDataEdge(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: [1, 2, 3] }),
    }),
    {},
    url,
  );
  assert.ok(res);
  assert.equal(res.status, 401);
  assert.equal(res.headers.get("x-yekpare-frontend"), "cloudflare-kh-editor-data-edge");
  const body = await res.json();
  assert.match(String(body.error || ""), /Bearer|oturum/i);
});

test("geçersiz Bearer ile yazar silme 401 — null/Container yok", async () => {
  const url = new URL("https://vatanhaber.net/api/hm/editor/authors/bulk-delete");
  const res = await handleKhEditorDataEdge(
    new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer not-a-real-jwt",
      },
      body: JSON.stringify({ ids: [1] }),
    }),
    { SESSION_SECRET: "test-session-secret-for-edge" },
    url,
  );
  assert.ok(res);
  assert.equal(res.status, 401);
  assert.equal(res.headers.get("x-yekpare-frontend"), "cloudflare-kh-editor-data-edge");
});

test("PUT yazar id oturumsuz 401 kenar", async () => {
  const url = new URL("https://vatanhaber.net/api/hm/editor/authors/42");
  const res = await handleKhEditorDataEdge(
    new Request(url, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
    }),
    {},
    url,
  );
  assert.ok(res);
  assert.equal(res.status, 401);
});

test("PATCH authors/order oturumsuz 401 kenar", async () => {
  const url = new URL("https://vatanhaber.net/api/hm/editor/authors/order");
  const res = await handleKhEditorDataEdge(
    new Request(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: [1, 2] }),
    }),
    {},
    url,
  );
  assert.ok(res);
  assert.equal(res.status, 401);
});

test("PHP yazar silme hm_site_id olmadan reddedilir", async () => {
  const calls = [];
  const sql = async (strings, ...values) => {
    calls.push({ text: strings.join("?"), values });
    return [];
  };
  const r = await edgeDeleteAuthor(sql, 99);
  assert.equal(r.mirrored, false);
  assert.equal(r.reason, "hm-site-id-required");
  assert.equal(calls.length, 0);
});

test("PHP yazar silme site-scoped — başka siteye dokunmaz", async () => {
  const state = {
    authors: [
      { id: 10, hm_site_id: 1, name: "Nail" },
      { id: 10, hm_site_id: 99, name: "OtherSite" },
    ],
  };
  const sql = async (strings, ...values) => {
    const text = strings.join("?");
    if (/DELETE FROM authors/i.test(text) && /hm_site_id/i.test(text)) {
      const [id, siteId] = values;
      const before = state.authors.length;
      state.authors = state.authors.filter(
        (a) => !(Number(a.id) === Number(id) && Number(a.hm_site_id) === Number(siteId)),
      );
      return before === state.authors.length ? [] : [{ id }];
    }
    return [];
  };
  const r = await edgeMirrorNewsDbWrite(sql, "authors", "delete", { id: 10, hm_site_id: 1 });
  assert.equal(r.mirrored, true);
  assert.equal(state.authors.length, 1);
  assert.equal(state.authors[0].hm_site_id, 99);
});
