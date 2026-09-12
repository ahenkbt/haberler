import { describe, expect, it } from "vitest";
import { applyHmLayoutDelta } from "./hm-layout-delta.js";

describe("hm-layout-delta Vatan theme", () => {
  it("writes hmVitrinTheme=vatan onto VKD layout JSON", () => {
    const { layout } = applyHmLayoutDelta({ hmVitrinTheme: "corporate" }, { hmVitrinTheme: "vatan" });
    expect(layout.hmVitrinTheme).toBe("vatan");
  });
});
