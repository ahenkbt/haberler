import { describe, expect, it } from "vitest";
import { ASG_AUTHORS_SOURCE_SLUG, ASG_AUTHORS_TARGET_SLUG } from "./hm-asg-authors-from-ahg-repair.js";

describe("hm-asg-authors-from-ahg-repair", () => {
  it("uses ankarahabergundemi as source and asg as target", () => {
    expect(ASG_AUTHORS_SOURCE_SLUG).toBe("ankarahabergundemi");
    expect(ASG_AUTHORS_TARGET_SLUG).toBe("asg");
  });
});
