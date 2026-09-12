import { describe, expect, it } from "vitest";
import { isKhNewsHost, isKhNewsSlug, KH_DOMAINS, KH_SITE_SLUG } from "./hm-kh-site-ensure.js";

describe("KH site identity", () => {
  it("recognizes kirsehirhaber hosts with www / scheme stripped", () => {
    expect(isKhNewsHost("kirsehirhaber.org")).toBe(true);
    expect(isKhNewsHost("https://www.kirsehirhaber.org/")).toBe(true);
    expect(isKhNewsHost("kirsehri.com:443")).toBe(true);
    expect(isKhNewsHost("kirsehir.net")).toBe(true);
    expect(isKhNewsHost("ankarasehirgazetesi.com")).toBe(false);
    expect(isKhNewsHost("suhaber.net")).toBe(false);
    expect(isKhNewsHost("")).toBe(false);
  });

  it("recognizes canonical and legacy slugs only", () => {
    expect(isKhNewsSlug(KH_SITE_SLUG)).toBe(true);
    expect(isKhNewsSlug("/kirsehirhaber/")).toBe(true);
    expect(isKhNewsSlug("kh")).toBe(true);
    expect(isKhNewsSlug("kirsehir")).toBe(true);
    expect(isKhNewsSlug("asg")).toBe(false);
    expect(isKhNewsSlug("su")).toBe(false);
  });

  it("keeps the three public KH domains", () => {
    expect([...KH_DOMAINS]).toEqual(["kirsehirhaber.org", "kirsehri.com", "kirsehir.net"]);
  });
});
