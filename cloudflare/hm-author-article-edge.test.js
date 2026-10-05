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
