import { describe, expect, it } from "vitest";
import { shouldUseHmPublicApp } from "./hmPublicAppEntry";

describe("shouldUseHmPublicApp", () => {
  it("uses the slim HM app on known editor news hosts", () => {
    expect(shouldUseHmPublicApp("ankarasehirgazetesi.com")).toBe(true);
    expect(shouldUseHmPublicApp("www.vatanhaber.net")).toBe(true);
    expect(shouldUseHmPublicApp("suhaber.net")).toBe(true);
  });

  it("keeps the full portal app on hub hosts", () => {
    expect(shouldUseHmPublicApp("ahenk.net.tr")).toBe(false);
    expect(shouldUseHmPublicApp("turk.eco")).toBe(false);
    expect(shouldUseHmPublicApp("localhost")).toBe(false);
  });
});
