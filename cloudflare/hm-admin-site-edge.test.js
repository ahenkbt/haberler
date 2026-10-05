import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyAdminSitePatch,
  handleHmAdminSiteEdge,
  narrowAdminSitePatch,
  parseSessionRecord,
  readCookie,
  sessionGrantsHmSites,
  siteIdFromPath,
  unsignConnectSid,
} from "./hm-admin-site-edge.js";

const SECRET = "sixteen-chars-ok";

function cookieSignatureSign(sid, secret) {
  const mac = createHmac("sha256", secret).update(sid).digest("base64").replace(/=+$/g, "");
  return `s:${sid}.${mac}`;
}

describe("yönetici site kenarı", () => {
  it("connect.sid imzasını cookie-signature ile doğrular", async () => {
    const sid = "AbC_def-123";
    const signed = cookieSignatureSign(sid, SECRET);
    assert.equal(await unsignConnectSid(signed, SECRET), sid);
    assert.equal(await unsignConnectSid(encodeURIComponent(signed), SECRET), null);
    const header = `theme=light; connect.sid=${encodeURIComponent(signed)}; other=1`;
    assert.equal(readCookie(header, "connect.sid"), signed);
    assert.equal(await unsignConnectSid(readCookie(header, "connect.sid"), SECRET), sid);
    assert.equal(await unsignConnectSid(signed, "wrong-secret-value"), null);
    assert.equal(await unsignConnectSid(signed.slice(0, -2) + "aa", SECRET), null);
    assert.equal(await unsignConnectSid("plain-sid", SECRET), null);
  });

  it("yalnızca askı ve aktif gövdesini alır", () => {
    assert.deepEqual(narrowAdminSitePatch({ active: false }), { kind: "active", active: false });
    assert.deepEqual(narrowAdminSitePatch({ layoutJson: { hmPublicSuspended: true } }), {
      kind: "suspend",
      suspended: true,
    });
    assert.equal(narrowAdminSitePatch({ active: "false" }), null);
    assert.equal(narrowAdminSitePatch({ active: true, displayName: "KH" }), null);
    assert.equal(
      narrowAdminSitePatch({ layoutJson: { hmPublicSuspended: true, hmMansetPreset: "nefes" } }),
      null,
    );
    assert.equal(narrowAdminSitePatch({ editorEmail: "kirsehir@gmail.com" }), null);
    assert.equal(narrowAdminSitePatch(null), null);
  });

  it("site yolunu ve panel iznini okur", () => {
    assert.equal(siteIdFromPath("/api/hm/sites/1087"), 1087);
    assert.equal(siteIdFromPath("/api/hm/sites/11/"), 11);
    assert.equal(siteIdFromPath("/api/hm/sites"), null);
    assert.equal(siteIdFromPath("/api/hm/editor/site-layout"), null);
    assert.equal(sessionGrantsHmSites({ panelBootstrap: true }), true);
    assert.equal(sessionGrantsHmSites({ panelBootstrap: true, panelPermissions: null }), true);
    assert.equal(
      sessionGrantsHmSites({ panelBootstrap: true, panelPermissions: ["hm_sites"] }),
      true,
    );
    assert.equal(
      sessionGrantsHmSites({ panelBootstrap: true, panelPermissions: ["haberler"] }),
      false,
    );
    assert.equal(sessionGrantsHmSites({ panelBootstrap: false }), false);
    assert.equal(sessionGrantsHmSites(parseSessionRecord('{"panelBootstrap":true}')), true);
  });

  it("geniş kayıt ve imzasız isteği Container'a bırakır", async () => {
    const wide = await handleHmAdminSiteEdge(
      new Request("https://ahenk.net.tr/api/hm/sites/8", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: "Kırşehir", active: true }),
      }),
      { SESSION_SECRET: SECRET },
      { pathname: "/api/hm/sites/8" },
    );
    assert.equal(wide, null);

    const signed = cookieSignatureSign("sid-1", SECRET);
    const noCookie = await handleHmAdminSiteEdge(
      new Request("https://ahenk.net.tr/api/hm/sites/8", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: false }),
      }),
      { SESSION_SECRET: SECRET },
      { pathname: "/api/hm/sites/8" },
    );
    assert.equal(noCookie, null);

    const badCookie = await handleHmAdminSiteEdge(
      new Request("https://ahenk.net.tr/api/hm/sites/8", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: `connect.sid=${encodeURIComponent(signed.slice(0, -3) + "zzz")}`,
        },
        body: JSON.stringify({ layoutJson: { hmPublicSuspended: true } }),
      }),
      { SESSION_SECRET: SECRET },
      { pathname: "/api/hm/sites/8" },
    );
    assert.equal(badCookie, null);
  });

  it("aktif ve askı yazısını Neon cümlesine çevirir", async () => {
    const calls = [];
    const sql = (strings, ...values) => {
      const text = strings.join("?");
      calls.push({ text, values });
      if (text.includes("::text")) throw new Error("text column");
      return Promise.resolve([{ id: values.at(-1) }]);
    };
    const active = await applyAdminSitePatch(sql, 61, { kind: "active", active: false });
    assert.equal(active.status, 200);
    assert.deepEqual(active.body, { ok: true, active: false });
    assert.match(calls[0].text, /UPDATE hm_news_sites/);
    assert.equal(calls[0].values[0], false);
    assert.equal(calls[0].values[1], 61);

    const suspended = await applyAdminSitePatch(sql, 8, { kind: "suspend", suspended: true });
    assert.equal(suspended.status, 200);
    assert.deepEqual(suspended.body, { ok: true, hmPublicSuspended: true });
    assert.match(calls[1].text, /hmPublicSuspended/);
    assert.match(calls[2].text, /jsonb_set/);
    assert.equal(calls[2].values[0], "true");

    const missing = await applyAdminSitePatch(
      () => Promise.resolve([]),
      9,
      { kind: "active", active: true },
    );
    assert.equal(missing.status, 404);
  });
});
