import { describe, expect, it } from "vitest";
import { extractYsMansetLayoutKeys } from "./hm-php-layout-sync.js";

describe("extractYsMansetLayoutKeys", () => {
  it("reads preset keys from layout_json", () => {
    const keys = extractYsMansetLayoutKeys(
      JSON.stringify({ hmYsMansetPreset: "Sabah", hmNewsYsMansetLayout: "odatv" }),
    );
    expect(keys.hmYsMansetPreset).toBe("sabah");
    expect(keys.hmNewsYsMansetLayout).toBe("odatv");
  });

  it("returns nulls for empty layout", () => {
    expect(extractYsMansetLayoutKeys(null)).toEqual({
      hmYsMansetPreset: null,
      hmNewsYsMansetLayout: null,
    });
  });
});
