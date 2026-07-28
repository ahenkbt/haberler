import { describe, expect, it } from "vitest";
import { isHmCrossSiteSharedEditorEmail } from "./hm-editor-shared-email.js";

describe("isHmCrossSiteSharedEditorEmail", () => {
  it("allows only ASG shared account", () => {
    expect(isHmCrossSiteSharedEditorEmail("sehirgazetesiankara@gmail.com")).toBe(true);
    expect(isHmCrossSiteSharedEditorEmail("kevser@gmail.com")).toBe(false);
  });
});
