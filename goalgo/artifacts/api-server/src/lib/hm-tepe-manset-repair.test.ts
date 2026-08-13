import { describe, expect, it } from "vitest";
import { HM_TEPE_MANSET_OPT_IN_REV, nextTepeMansetLayoutPatch } from "./hm-tepe-manset-layout.js";

describe("tepe manset opt-in layout patch", () => {
  it("turns Tepe manşet off once and stamps the opt-in rev", () => {
    const next = nextTepeMansetLayoutPatch({
      hmNewsTepeMansetEnabled: true,
      hmNewsHomeModuleOrder: ["tepeManset", "hero"],
    });
    expect(next?.hmNewsTepeMansetEnabled).toBe(false);
    expect(next?.hmTepeMansetOptInRev).toBe(HM_TEPE_MANSET_OPT_IN_REV);
    expect(next?.hmNewsHomeModuleOrder).toEqual(["tepeManset", "hero"]);
  });

  it("does not re-disable after an editor opts in", () => {
    expect(
      nextTepeMansetLayoutPatch({
        hmNewsTepeMansetEnabled: true,
        hmTepeMansetOptInRev: HM_TEPE_MANSET_OPT_IN_REV,
      }),
    ).toBeNull();
  });

  it("stamps the rev even when Tepe manşet is already off", () => {
    const next = nextTepeMansetLayoutPatch({ hmNewsTepeMansetEnabled: false });
    expect(next?.hmNewsTepeMansetEnabled).toBe(false);
    expect(next?.hmTepeMansetOptInRev).toBe(HM_TEPE_MANSET_OPT_IN_REV);
  });

  it("skips a site that already received the opt-in migration", () => {
    expect(
      nextTepeMansetLayoutPatch({
        hmNewsTepeMansetEnabled: false,
        hmTepeMansetOptInRev: HM_TEPE_MANSET_OPT_IN_REV,
      }),
    ).toBeNull();
  });
});
