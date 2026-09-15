import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isKhNewsHost, isKhNewsSlug, KH_DOMAINS, KH_SITE_SLUG, pickKhTargetSite } from "./hm-kh-site-ensure.js";

const ensureSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "hm-kh-site-ensure.ts"), "utf8");

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

  it("parks newer KH slug clones so home-bundle cannot bind an empty site", () => {
    expect(ensureSrc).toContain("kirsehirhaber-dup-");
    expect(ensureSrc).toContain("parkNewerKhDuplicateSites");
  });

  it("picks the oldest KH row so ensure does not create 506 then 515", () => {
    const picked = pickKhTargetSite([
      { id: 515, slug: "kirsehirhaber", domain: null, domain2: null, domain3: null },
      { id: 506, slug: "kirsehirhaber", domain: null, domain2: null, domain3: null },
      { id: 2, slug: "su", domain: "suhaber.net", domain2: null, domain3: null },
    ]);
    expect(picked?.id).toBe(506);
    expect(pickKhTargetSite([{ id: 3, slug: "asg", domain: "ankarasehirgazetesi.com" }])).toBeUndefined();
  });

  it("defaults KH vitrin to YEREL/GÜNDEM category slots", () => {
    expect(ensureSrc).toContain('hmClassicAraMansetCategorySlugs: ["yerel", "gundem"]');
    expect(ensureSrc).toContain('hmNewsFeaturedCategoryStripSlugs: ["yerel", "gundem"]');
  });
});
