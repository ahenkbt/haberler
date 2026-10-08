import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminUsernamesMatch,
  buildSessionRecord,
  handleAdminPanelSessionEdge,
  permissionsFromJson,
  signConnectSid,
  verifyEnvAdminCredentials,
} from "./hm-admin-login-edge.js";
import { unsignConnectSid } from "./hm-admin-site-edge.js";

describe("hm-admin-login-edge", () => {
  it("signs connect.sid exactly like express-session (round-trips through unsign)", async () => {
    const signed = await signConnectSid("abc_DEF-123", "0123456789abcdef-secret");
    assert.equal(await unsignConnectSid(signed, "0123456789abcdef-secret"), "abc_DEF-123");
    assert.equal(await unsignConnectSid(signed, "other-secret-xxxxxxxx"), null);
  });

  it("env credentials: list + aliases + exact password; never accepts empty config", () => {
    const env = { ADMIN_PANEL_USERNAMES: "ahenkbt, ops@x.tr", ADMIN_PANEL_PASSWORD: "S3cret!" };
    assert.equal(verifyEnvAdminCredentials(env, "ahenbt", "S3cret!"), true);
    assert.equal(verifyEnvAdminCredentials(env, "OPS@x.tr", "S3cret!"), true);
    assert.equal(verifyEnvAdminCredentials(env, "ahenkbt", "wrong"), false);
    assert.equal(verifyEnvAdminCredentials({}, "ahenkbt", "Ahenk2006*"), false);
    assert.equal(adminUsernamesMatch("a@b", "a"), false);
  });

  it("session record mirrors the container shape", () => {
    const exp = new Date("2026-11-07T00:00:00Z");
    assert.deepEqual(buildSessionRecord({ kind: "full" }, exp).panelBootstrap, true);
    assert.equal("panelPermissions" in buildSessionRecord({ kind: "full" }, exp), false);
    assert.deepEqual(buildSessionRecord({ kind: "limited", permissions: ["hm_sites"] }, exp).panelPermissions, ["hm_sites"]);
    assert.deepEqual(permissionsFromJson('["hm_sites"]'), { kind: "limited", permissions: ["hm_sites"] });
    assert.deepEqual(permissionsFromJson(null), { kind: "full" });
  });

  it("falls through (null) when credentials do not match or secrets are missing", async () => {
    const req = () =>
      new Request("https://ahenk.net.tr/api/members/admin-panel-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "x", password: "y" }),
      });
    assert.equal(await handleAdminPanelSessionEdge(req(), {}, {}), null);
    assert.equal(
      await handleAdminPanelSessionEdge(req(), { SESSION_SECRET: "0123456789abcdef-secret", ADMIN_PANEL_USERNAMES: "a", ADMIN_PANEL_PASSWORD: "b" }, {}),
      null,
    );
    const r = req();
    await handleAdminPanelSessionEdge(r, {}, {});
    assert.equal(r.bodyUsed, false);
  });
});

describe("adminLoginContainerOrReject", () => {
  const req = () => new Request("https://ahenk.net.tr/api/members/admin-panel-session", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "x", password: "y" }),
  });
  it("wrong credentials never hang on a dead container", async () => {
    const { adminLoginContainerOrReject } = await import("./hm-admin-login-edge.js");
    const t0 = Date.now();
    const hung = await adminLoginContainerOrReject(req(), {}, 50, () => new Promise(() => {}));
    assert.equal(hung.status, 401);
    assert.ok(Date.now() - t0 < 1000);
    assert.match(await hung.text(), /hatal/);
    const ok = await adminLoginContainerOrReject(req(), {}, 1000, async () => new Response('{"success":true}', { status: 200 }));
    assert.equal(ok.status, 200);
    const err = await adminLoginContainerOrReject(req(), {}, 1000, async () => new Response("x", { status: 503 }));
    assert.equal(err.status, 401);
  });
});
