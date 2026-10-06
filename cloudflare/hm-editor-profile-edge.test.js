import assert from "node:assert/strict";
import test from "node:test";
import { handleHmEditorProfileEdge } from "./hm-editor-profile-edge.js";

test("editör girişi boş JSON ile 400 döner, Container yok", async () => {
  const url = new URL("https://ankarasehirgazetesi.com/api/hm/editor/login");
  const res = await handleHmEditorProfileEdge(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
    {},
    url,
  );
  assert.ok(res);
  assert.notEqual(res.status, 503);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(String(body.error || ""), /Güvenlik doğrulaması/i);
});

test("editör girişi JSON olmadan 400 döner", async () => {
  const url = new URL("https://ankarasehirgazetesi.com/api/hm/editor/login");
  const res = await handleHmEditorProfileEdge(
    new Request(url, { method: "POST", body: "not-json" }),
    {},
    url,
  );
  assert.ok(res);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /JSON/i);
});

test("editör girişi captcha olmadan şifre gönderilse de 400 döner", async () => {
  const url = new URL("https://ankarasehirgazetesi.com/api/hm/editor/login");
  const res = await handleHmEditorProfileEdge(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        login: "bilgi@ankarasehirgazetesi.com",
        password: "not-the-real-password",
        slug: "asg",
      }),
    }),
    { SESSION_SECRET: "test-session-secret" },
    url,
  );
  assert.ok(res);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(String(body.error || ""), /Güvenlik doğrulaması/i);
});
