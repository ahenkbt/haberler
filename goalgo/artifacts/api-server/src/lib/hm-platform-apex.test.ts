import { describe, expect, it } from "vitest";
import {
  HM_PLATFORM_FIX_TC,
  HM_PLATFORM_GUNDEMI_ORG,
  suggestHmPlatformSubdomains,
} from "./hm-platform-apex.js";

describe("hm platform apex defaults", () => {
  it("suggests subdomains from slug", () => {
    expect(HM_PLATFORM_FIX_TC).toBe("fix.tc");
    expect(HM_PLATFORM_GUNDEMI_ORG).toBe("gundemi.org");
    expect(suggestHmPlatformSubdomains("adana")).toEqual({
      fixTc: "adana.fix.tc",
      gundemiOrg: "adana.gundemi.org",
    });
  });
});
