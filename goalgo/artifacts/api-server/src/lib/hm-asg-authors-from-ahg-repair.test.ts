import { describe, expect, it } from "vitest";
import {
  ASG_AUTHORS_SOURCE_SLUG,
  ASG_AUTHORS_TARGET_SLUG,
  ASG_FROM_AHG_MAKALE_EXT_PREFIX,
  asgFromAhgMakaleExternalKey,
  canonicalAhgAuthors,
} from "./hm-asg-authors-from-ahg-repair.js";

describe("hm-asg-authors-from-ahg-repair", () => {
  it("uses ankarahabergundemi slug (not ahg) as source and asg as target", () => {
    expect(ASG_AUTHORS_SOURCE_SLUG).toBe("ankarahabergundemi");
    expect(ASG_AUTHORS_SOURCE_SLUG).not.toBe("ahg");
    expect(ASG_AUTHORS_TARGET_SLUG).toBe("asg");
  });

  it("dedupes ankarahabergundemi authors by person keeping sort order", () => {
    const rows = canonicalAhgAuthors([
      { id: 1, name: "Hazal Oral", hmSortOrder: 1 } as any,
      { id: 2, name: "HAZAL ORAL", hmSortOrder: null } as any,
      { id: 3, name: "HÜSEYİN AKIN", hmSortOrder: 2 } as any,
    ]);
    expect(rows.map((r) => r.id)).toEqual([1, 3]);
  });

  it("builds stable external keys for copied makaleler", () => {
    expect(asgFromAhgMakaleExternalKey(42)).toBe(`${ASG_FROM_AHG_MAKALE_EXT_PREFIX}42`);
  });
});
