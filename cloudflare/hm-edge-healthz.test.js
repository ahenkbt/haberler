import assert from "node:assert/strict";
import test from "node:test";
import { handleEdgeHealthzLive, isEdgeHealthzLivePath } from "./hm-edge-healthz.js";

test("healthz/live path tanıma", () => {
  assert.equal(isEdgeHealthzLivePath("/api/healthz/live"), true);
  assert.equal(isEdgeHealthzLivePath("/api/healthz/live/"), true);
  assert.equal(isEdgeHealthzLivePath("/api/healthz"), false);
});

test("kenar healthz Container beklemeden 200 ve Container uyandırmaz", async () => {
  const woke = [];
  const env = {
    GOALGO_API: {
      getByName() {
        return {
          fetch: async () => {
            woke.push("container");
            return new Response("ok");
          },
        };
      },
    },
  };
  const pending = [];
  const ctx = { waitUntil: (p) => pending.push(p) };
  const res = await handleEdgeHealthzLive(
    new Request("https://ahenk.net.tr/api/healthz/live"),
    env,
    ctx,
  );
  assert.ok(res);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-yekpare-frontend"), "cloudflare-edge-healthz");
  const body = await res.json();
  assert.equal(body.status, "ok");
  assert.equal(body.edge, true);
  assert.equal(body.wokeContainer, false);
  await Promise.all(pending);
  assert.equal(pending.length, 0);
  assert.equal(woke.length, 0);
});
