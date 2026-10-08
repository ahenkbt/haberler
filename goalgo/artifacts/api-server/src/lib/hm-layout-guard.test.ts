import { describe, expect, it } from "vitest";
import { applyHmLayoutGuard, HM_LAYOUT_USER_SAVED_AT_KEY, markHmLayoutUserSave } from "./hm-layout-guard.js";

describe("hm layout guard", () => {
  it("panel save (new stamp) passes through unchanged", () => {
    const oldL = { logoUrl: "/api/media/uploads/a.webp", [HM_LAYOUT_USER_SAVED_AT_KEY]: "2026-10-01T00:00:00.000Z" };
    const raw = markHmLayoutUserSave(JSON.stringify({ logoUrl: "/api/media/uploads/b.webp" }), new Date("2026-10-08T10:00:00Z"));
    const r = applyHmLayoutGuard(oldL, JSON.parse(raw));
    expect(r.blocked).toEqual([]);
    expect(r.layout.logoUrl).toBe("/api/media/uploads/b.webp");
  });

  it("automated write cannot overwrite logo, menu or other set values; may fill new/empty keys", () => {
    const oldL = {
      logoUrl: "/api/media/uploads/a.webp",
      hmNavOnlyCategorySlugs: ["siyaset", "kamu"],
      hmNewsYsMansetLayout: "odatv",
      faviconUrl: "",
      [HM_LAYOUT_USER_SAVED_AT_KEY]: "2026-10-01T00:00:00.000Z",
    };
    const newL = { logoUrl: "/turkata/turkata-logo.webp", hmNavOnlyCategorySlugs: [], faviconUrl: "/f.png", extra: 1 };
    const r = applyHmLayoutGuard(oldL, newL);
    expect(r.layout.logoUrl).toBe("/api/media/uploads/a.webp");
    expect(r.layout.hmNavOnlyCategorySlugs).toEqual(["siyaset", "kamu"]);
    expect(r.layout.hmNewsYsMansetLayout).toBe("odatv");
    expect(r.layout.faviconUrl).toBe("/f.png");
    expect(r.layout.extra).toBe(1);
    expect(r.layout[HM_LAYOUT_USER_SAVED_AT_KEY]).toBe("2026-10-01T00:00:00.000Z");
    expect(r.blocked.sort()).toEqual(["hmNavOnlyCategorySlugs", "hmNewsYsMansetLayout", "logoUrl"]);
  });

  it("copying the old stamp does not count as a panel save", () => {
    const oldL = { logoUrl: "/u/a.webp", [HM_LAYOUT_USER_SAVED_AT_KEY]: "x" };
    const r = applyHmLayoutGuard(oldL, { logoUrl: "/repo.png", [HM_LAYOUT_USER_SAVED_AT_KEY]: "x" });
    expect(r.layout.logoUrl).toBe("/u/a.webp");
  });

  it("admin suspend toggle stays writable", () => {
    const r = applyHmLayoutGuard({ hmPublicSuspended: false }, { hmPublicSuspended: true });
    expect(r.layout.hmPublicSuspended).toBe(true);
  });

  it("mark leaves invalid JSON untouched", () => {
    expect(markHmLayoutUserSave("not json")).toBe("not json");
  });
});
