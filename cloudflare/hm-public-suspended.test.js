import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isKhPublicHost,
  isKhWorkerPassthroughPath,
  khSuspendedFlagFromRows,
  khSuspensionHtml,
} from "./hm-public-suspended.js";

describe("Kırşehir kamu askı kapısı", () => {
  it("haber alanını tanır, paneli kendi yolunda bırakır", () => {
    assert.equal(isKhPublicHost("www.kirsehirhaber.org"), true);
    assert.equal(isKhPublicHost("ahenk.net.tr"), false);
    assert.equal(isKhWorkerPassthroughPath("/editor"), true);
    assert.equal(isKhWorkerPassthroughPath("/api/hm/meta/by-slug/kirsehirhaber"), true);
    assert.equal(isKhWorkerPassthroughPath("/"), false);
    assert.equal(isKhWorkerPassthroughPath("/haber/rss-334785"), false);
  });

  it("askı bayrağı yoksa veya açıksa kapanır, false ise yayındadır", () => {
    assert.equal(khSuspendedFlagFromRows([{ layout_json: { hmPublicSuspended: true } }]), true);
    assert.equal(khSuspendedFlagFromRows([{ layout_json: "{}" }]), null);
    assert.equal(khSuspendedFlagFromRows([{ layout_json: { hmPublicSuspended: false } }]), false);
    assert.equal(
      khSuspendedFlagFromRows([
        { layout_json: { hmPublicSuspended: false } },
        { layout_json: { hmPublicSuspended: true } },
      ]),
      true,
    );
  });

  it("askı sayfasında başlık ve ahenk.net.tr linki vardır", () => {
    const html = khSuspensionHtml();
    assert.match(html, /Site neden askıya alınır/);
    assert.match(html, /href="https:\/\/ahenk\.net\.tr"/);
    assert.match(html, /aylık 50 usd/);
  });
});
