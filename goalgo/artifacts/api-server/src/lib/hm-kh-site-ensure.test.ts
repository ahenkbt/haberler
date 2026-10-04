import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isKhNewsHost,
  isKhNewsSlug,
  KH_DOMAINS,
  KH_SITE_SLUG,
  pickStableKhSite,
} from "./hm-kh-site-ensure.js";

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

  it("picks the active kirsehirhaber row with the lowest id, not the newest", () => {
    const picked = pickStableKhSite([
      { id: 1121, slug: "kirsehirhaber", domain: null, active: true },
      { id: 1118, slug: "kirsehirhaber", domain: null, active: true },
      { id: 944, slug: "kirsehirhaber", domain: null, active: false },
    ]);
    expect(picked?.id).toBe(1118);
  });

  it("keeps LiveBridge 944 when that row is still the active kirsehirhaber slug", () => {
    const picked = pickStableKhSite([
      { id: 1077, slug: "kirsehirhaber", domain: null, active: true },
      { id: 944, slug: "kirsehirhaber", domain: null, active: true },
    ]);
    expect(picked?.id).toBe(944);
  });

  it("reuses a retired row instead of implying a new insert", () => {
    const picked = pickStableKhSite([
      { id: 1100, slug: "kirsehirhaber-retired-1100", domain: null, active: false },
    ]);
    expect(picked?.id).toBe(1100);
  });

  it("does not let a different site at id 944 steal the KH row", () => {
    const picked = pickStableKhSite([
      { id: 944, slug: "tr", domain: null, active: true },
      { id: 1121, slug: "kirsehirhaber", domain: null, active: true },
    ]);
    expect(picked?.id).toBe(1121);
  });

  it("defaults KH vitrin to YEREL/GÜNDEM category slots", () => {
    expect(ensureSrc).toContain('hmClassicAraMansetCategorySlugs: ["yerel", "gundem"]');
    expect(ensureSrc).toContain('hmNewsFeaturedCategoryStripSlugs: ["yerel", "gundem"]');
  });
});
