import { describe, expect, it } from "vitest";
import {
  collectGundemiOrgDomainsFromForm,
  isGundemiOrgDomain,
  normalizeGundemiOrgHost,
} from "./gundemiOrgDomain";

describe("gundemiOrgDomain", () => {
  it("detects *.gundemi.org", () => {
    expect(normalizeGundemiOrgHost("https://WWW.Yeni.Gundemi.Org/")).toBe("yeni.gundemi.org");
    expect(isGundemiOrgDomain("yeni.gundemi.org")).toBe(true);
    expect(isGundemiOrgDomain("gundemi.org")).toBe(true);
    expect(isGundemiOrgDomain("ornek.com")).toBe(false);
  });

  it("collects from form triad", () => {
    expect(
      collectGundemiOrgDomainsFromForm({
        domain: "yeni.gundemi.org",
        domain2: "www.yeni.gundemi.org",
        domain3: "ornek.com",
      }),
    ).toEqual(["yeni.gundemi.org"]);
  });
});
