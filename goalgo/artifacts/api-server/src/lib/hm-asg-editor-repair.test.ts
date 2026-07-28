import { describe, expect, it } from "vitest";
import { isAsgHmNewsSiteRow } from "./hm-asg-editor-repair.js";

describe("isAsgHmNewsSiteRow", () => {
  it("matches slug asg", () => {
    expect(isAsgHmNewsSiteRow({ slug: "asg" })).toBe(true);
  });

  it("matches ankarasehirgazetesi domain", () => {
    expect(isAsgHmNewsSiteRow({ slug: "x", domain: "ankarasehirgazetesi.com" })).toBe(true);
  });

  it("rejects kirsehir", () => {
    expect(isAsgHmNewsSiteRow({ slug: "kirsehirhaber", domain: "kirsehirhaber.org" })).toBe(false);
  });
});
