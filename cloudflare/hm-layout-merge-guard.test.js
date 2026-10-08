import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPartialLayoutForMirror,
  changedLayoutKeys,
  isModuleSwitchKey,
  sanitizeEditorLayoutIncoming,
} from "./hm-layout-merge-guard.js";

describe("hm-layout-merge-guard", () => {
  const prev = {
    hmVitrinTheme: "esen",
    hmNewsRssSources: [{ url: "https://x/rss" }],
    hmPrimaryColor: "#c8102e",
    hmNewsHomeModuleOrder: ["hero", "ysManset"],
    hmNewsYsTickerEnabled: true,
    hmCategoryColors: { spor: "#2e7d32" },
  };

  it("drops unchanged keys from a full snapshot save", () => {
    const { inc } = sanitizeEditorLayoutIncoming(prev, {
      hmPrimaryColor: "#c8102e",
      hmNewsHomeModuleOrder: ["hero", "ysManset"],
      hmCategoryColors: { spor: "#2e7d32" },
      hmThemeGradient: { id: "mavi-1", from: "#1d5fbf", to: "#0a1f44" },
    });
    assert.deepEqual(Object.keys(inc), ["hmThemeGradient"]);
  });

  it("never writes hmVitrinTheme and never nulls module switches", () => {
    const { inc, dropped } = sanitizeEditorLayoutIncoming(prev, {
      hmVitrinTheme: "yenisafak",
      hmNewsYsTickerEnabled: null,
      hmNewsYsMostReadEnabled: null,
      hmNewsYsGalleryEnabled: false,
    });
    assert.deepEqual(inc, { hmNewsYsGalleryEnabled: false });
    const absentOn = sanitizeEditorLayoutIncoming(prev, { hmNewsYsAuthorsEnabled: true });
    assert.deepEqual(absentOn.inc, {});
    assert.ok(dropped.includes("hmVitrinTheme"));
    assert.ok(dropped.includes("hmNewsYsTickerEnabled"));
  });

  it("does not create null keys for absent values, but can clear an existing value", () => {
    const { inc } = sanitizeEditorLayoutIncoming(prev, { hmThemeGradient: null, hmPrimaryColor: null });
    assert.deepEqual(inc, { hmPrimaryColor: null });
  });

  it("ignores client-sent internal stamps", () => {
    const { inc } = sanitizeEditorLayoutIncoming(prev, { _hmUserSavedAt: "x" });
    assert.deepEqual(inc, {});
  });

  it("detects module switch keys", () => {
    assert.equal(isModuleSwitchKey("hmNewsYsTickerEnabled"), true);
    assert.equal(isModuleSwitchKey("hmPrimaryColor"), false);
  });

  it("computes changed keys and a partial mirror that keeps theme-only keys out", () => {
    const next = { ...prev, hmPrimaryColor: "#0b6e4f", _hmUserSavedAt: "t" };
    delete next.hmCategoryColors;
    const changed = changedLayoutKeys(prev, next).filter((k) => !k.startsWith("_"));
    assert.deepEqual(changed.sort(), ["hmCategoryColors", "hmPrimaryColor"]);
    const part = buildPartialLayoutForMirror(next, changed);
    assert.deepEqual(part.set, { hmPrimaryColor: "#0b6e4f", _hmUserSavedAt: "t" });
    assert.deepEqual(part.remove, ["hmCategoryColors"]);
    assert.equal("hmNewsRssSources" in part.set, false);
  });
});
