import { afterEach, describe, expect, it } from "vitest";
import {
  apexZoneFromHostname,
  collectCustomPhpApexZones,
  customApexPanelWorkerRoutePatterns,
  resetCustomApexProvisionCaches,
} from "./hm-custom-apex-provision.js";

afterEach(() => {
  resetCustomApexProvisionCaches();
});

describe("custom apex zone detection", () => {
  it("apexZoneFromHostname", () => {
    expect(apexZoneFromHostname("sosyalhizmetler.tr")).toBe("sosyalhizmetler.tr");
    expect(apexZoneFromHostname("www.sosyalhizmetler.tr")).toBe("sosyalhizmetler.tr");
    expect(apexZoneFromHostname("marmara.gundemi.org")).toBe("gundemi.org");
  });

  it("collects external apex from domain2 only", () => {
    expect(
      collectCustomPhpApexZones("marmara.gundemi.org", "sosyalhizmetler.tr", null),
    ).toEqual(["sosyalhizmetler.tr"]);
    expect(collectCustomPhpApexZones("ege.gundemi.org", null, null)).toEqual([]);
    expect(collectCustomPhpApexZones("fix.tc", null, null)).toEqual(["fix.tc"]);
  });

  it("panel-only worker routes include brand asset prefix", () => {
    const fixPatterns = customApexPanelWorkerRoutePatterns("fix.tc");
    expect(fixPatterns).toContain("fix.tc/fix/*");
    expect(fixPatterns).toContain("fix.tc/api/*");
    expect(fixPatterns.some((p) => p.endsWith("/*") && p === "fix.tc/*")).toBe(false);
    const shPatterns = customApexPanelWorkerRoutePatterns("sosyalhizmetler.tr");
    expect(shPatterns).toContain("sosyalhizmetler.tr/sh/*");
  });
});
