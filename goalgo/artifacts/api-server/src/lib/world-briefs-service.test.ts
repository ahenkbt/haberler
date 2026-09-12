import { describe, expect, it } from "vitest";
import { WORLD_BRIEFS_SHOW_IMAGES_DEFAULT } from "./world-briefs-service.js";

describe("world briefs defaults", () => {
  it("keeps images off so the strip does not render broken placeholders", () => {
    expect(WORLD_BRIEFS_SHOW_IMAGES_DEFAULT).toBe(false);
  });
});
