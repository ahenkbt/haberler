import { describe, expect, it } from "vitest";
import { isKhNewsSiteRow } from "./hm-kh-editor-repair.js";

describe("isKhNewsSiteRow", () => {
  it("recognizes kirsehirhaber slug and domains", () => {
    expect(isKhNewsSiteRow({ slug: "kirsehirhaber", domain: null })).toBe(true);
    expect(isKhNewsSiteRow({ slug: "asg", domain: "kirsehirhaber.org" })).toBe(true);
    expect(isKhNewsSiteRow({ slug: "asg", domain: "ankarasehirgazetesi.com" })).toBe(false);
  });
});
