import { describe, expect, it } from "vitest";
import { buildPartialLayoutForMirror, changedLayoutKeys, sanitizeEditorLayoutIncoming } from "./hm-layout-merge-guard.js";

describe("hm-layout-merge-guard (Node)", () => {
  const prev = { hmVitrinTheme: "esen", hmNewsRssSources: [1], hmPrimaryColor: "#c8102e", hmNewsYsTickerEnabled: true };

  it("drops unchanged keys, hmVitrinTheme and null/absent-true module switches", () => {
    const { inc } = sanitizeEditorLayoutIncoming(prev, {
      hmVitrinTheme: "yenisafak",
      hmPrimaryColor: "#c8102e",
      hmNewsYsTickerEnabled: null,
      hmNewsYsAuthorsEnabled: true,
      hmNewsYsGalleryEnabled: false,
      hmThemeGradient: null,
      hmSecondaryColor: "#111111",
    });
    expect(inc).toEqual({ hmNewsYsGalleryEnabled: false, hmSecondaryColor: "#111111" });
  });

  it("mirrors only changed keys", () => {
    const next = { ...prev, hmPrimaryColor: "#0b6e4f", _hmUserSavedAt: "t" };
    const changed = changedLayoutKeys(prev, next).filter((k) => !k.startsWith("_"));
    expect(changed).toEqual(["hmPrimaryColor"]);
    expect(buildPartialLayoutForMirror(next, changed)).toEqual({
      set: { hmPrimaryColor: "#0b6e4f", _hmUserSavedAt: "t" },
      remove: [],
    });
  });
});
