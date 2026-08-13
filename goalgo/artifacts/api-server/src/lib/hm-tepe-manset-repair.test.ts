import { describe, expect, it } from "vitest";
import { nextTepeMansetLayoutPatch } from "./hm-tepe-manset-layout.js";

describe("tepe manset layout repair", () => {
  it("does not re-enable a site the editor turned off", () => {
    expect(
      nextTepeMansetLayoutPatch({
        hmNewsTepeMansetEnabled: false,
        hmNewsHomeModuleOrder: ["hero", "latestGrid"],
      }),
    ).toBeNull();
  });

  it("prepends tepeManset when missing on an enabled site", () => {
    const next = nextTepeMansetLayoutPatch({
      hmNewsTepeMansetEnabled: true,
      hmNewsHomeModuleOrder: ["hero", "latestGrid"],
    });
    expect(next?.hmNewsHomeModuleOrder).toEqual(["tepeManset", "hero", "latestGrid"]);
    expect(next?.hmNewsTepeMansetEnabled).toBe(true);
  });

  it("moves tepeManset to front when present elsewhere", () => {
    const next = nextTepeMansetLayoutPatch({
      hmNewsTepeMansetEnabled: true,
      hmNewsHomeModuleOrder: ["hero", "tepeManset", "latestGrid"],
    });
    expect(next?.hmNewsHomeModuleOrder).toEqual(["tepeManset", "hero", "latestGrid"]);
  });

  it("enables tepe manset when the flag was never set", () => {
    const next = nextTepeMansetLayoutPatch({
      hmNewsHomeModuleOrder: ["hero"],
    });
    expect(next?.hmNewsTepeMansetEnabled).toBe(true);
    expect(next?.hmNewsHomeModuleOrder).toEqual(["tepeManset", "hero"]);
  });

  it("skips a site that is already enabled with tepeManset first", () => {
    expect(
      nextTepeMansetLayoutPatch({
        hmNewsTepeMansetEnabled: true,
        hmNewsHomeModuleOrder: ["tepeManset", "hero"],
      }),
    ).toBeNull();
  });
});
