import { afterEach, describe, expect, it } from "vitest";
import {
  apexZoneFromHostname,
  collectCustomPhpApexZones,
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
});
