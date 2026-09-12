import { describe, expect, it } from "vitest";
import {
  HM_TEPE_MANSET_DEFAULT_ON_REV,
  HM_TEPE_MANSET_OPT_IN_REV,
  nextTepeMansetLayoutPatch,
} from "./hm-tepe-manset-layout.js";

describe("tepe manset default-on layout patch", () => {
  it("turns Tepe manşet on once and stamps the default-on rev", () => {
    const next = nextTepeMansetLayoutPatch({
      hmNewsTepeMansetEnabled: false,
      hmTepeMansetOptInRev: HM_TEPE_MANSET_OPT_IN_REV,
      hmNewsHomeModuleOrder: ["tepeManset", "hero"],
    });
    expect(next?.hmNewsTepeMansetEnabled).toBe(true);
    expect(next?.hmTepeMansetOptInRev).toBe(HM_TEPE_MANSET_DEFAULT_ON_REV);
    expect(next?.hmNewsHomeModuleOrder).toEqual(["tepeManset", "hero"]);
  });

  it("does not re-enable after an editor opts out", () => {
    expect(
      nextTepeMansetLayoutPatch({
        hmNewsTepeMansetEnabled: false,
        hmTepeMansetOptInRev: HM_TEPE_MANSET_DEFAULT_ON_REV,
      }),
    ).toBeNull();
  });

  it("stamps the rev even when Tepe manşet is already on", () => {
    const next = nextTepeMansetLayoutPatch({ hmNewsTepeMansetEnabled: true });
    expect(next?.hmNewsTepeMansetEnabled).toBe(true);
    expect(next?.hmTepeMansetOptInRev).toBe(HM_TEPE_MANSET_DEFAULT_ON_REV);
  });

  it("skips a site that already received the default-on migration", () => {
    expect(
      nextTepeMansetLayoutPatch({
        hmNewsTepeMansetEnabled: true,
        hmTepeMansetOptInRev: HM_TEPE_MANSET_DEFAULT_ON_REV,
      }),
    ).toBeNull();
  });
});
