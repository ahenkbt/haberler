import { describe, expect, it } from "vitest";
import { applyHmLayoutDelta } from "./hm-layout-delta.js";

describe("hm-layout-delta Vatan theme", () => {
  it("writes hmVitrinTheme=vatan onto VKD layout JSON", () => {
    const { layout } = applyHmLayoutDelta({ hmVitrinTheme: "corporate" }, { hmVitrinTheme: "vatan" });
    expect(layout.hmVitrinTheme).toBe("vatan");
  });

  it("does not treat a Vatan delta as a news-home default", () => {
    const { layout } = applyHmLayoutDelta(
      { hmVitrinTheme: "corporate", hmCorporateAtaturkCornerEnabled: true },
      { hmVitrinTheme: "vatan" },
    );
    expect(layout.hmVitrinTheme).toBe("vatan");
    expect(layout.hmVitrinTheme).not.toBe("esen");
    expect(layout.hmVitrinTheme).not.toBe("news");
    expect(layout.hmCorporateAtaturkCornerEnabled).toBe(true);
  });
});
