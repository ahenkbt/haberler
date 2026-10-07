import assert from "node:assert/strict";
import test from "node:test";
import {
  handleAdminPanelStatusEdge,
  isAdminPanelStatusPath,
  panelStatusFromSession,
} from "./hm-admin-panel-status-edge.js";

test("admin-panel-status path tanıma", () => {
  assert.equal(isAdminPanelStatusPath("/api/members/admin-panel-status"), true);
  assert.equal(isAdminPanelStatusPath("/api/members/admin-panel-status/"), true);
  assert.equal(isAdminPanelStatusPath("/api/members/admin-panel-session"), false);
});

test("panelStatusFromSession: tam yönetici vs kısıtlı", () => {
  assert.deepEqual(panelStatusFromSession(null), {
    panelBootstrap: false,
    panelFullAdmin: false,
    permissions: null,
    edge: true,
  });
  assert.deepEqual(panelStatusFromSession({ panelBootstrap: true }), {
    panelBootstrap: true,
    panelFullAdmin: true,
    permissions: null,
    edge: true,
  });
  assert.deepEqual(
    panelStatusFromSession({ panelBootstrap: true, panelPermissions: ["haberler"] }),
    {
      panelBootstrap: true,
      panelFullAdmin: false,
      permissions: ["haberler"],
      edge: true,
    },
  );
});

test("çerez yokken kenar 200 + bootstrap false (Container beklemez)", async () => {
  const woke = [];
  const env = {
    SESSION_SECRET: "test-secret",
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
  const res = await handleAdminPanelStatusEdge(
    new Request("https://ahenk.net.tr/api/members/admin-panel-status"),
    env,
    ctx,
  );
  assert.ok(res);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-yekpare-frontend"), "cloudflare-admin-panel-status-edge");
  const body = await res.json();
  assert.equal(body.panelBootstrap, false);
  assert.equal(body.edge, true);
  await Promise.all(pending);
  assert.ok(woke.length >= 1);
});

test("SESSION_SECRET yoksa null (Container'a bırak)", async () => {
  const res = await handleAdminPanelStatusEdge(
    new Request("https://ahenk.net.tr/api/members/admin-panel-status"),
    {},
    { waitUntil: () => {} },
  );
  assert.equal(res, null);
});
