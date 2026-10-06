import { describe, expect, it } from "vitest";
import { resolveKnownHmEditorSlug } from "./hmEditorDomains";

describe("resolveKnownHmEditorSlug", () => {
  it("maps PHP-theme news hosts", () => {
    expect(resolveKnownHmEditorSlug("yesilvatan.gen.tr")).toBe("yesilvatan");
    expect(resolveKnownHmEditorSlug("www.ankarasehirgazetesi.com")).toBe("asg");
  });

  it("maps turkatahaber.com to the HM author-panel slug", () => {
    expect(resolveKnownHmEditorSlug("turkatahaber.com")).toBe("turkatahaber");
    expect(resolveKnownHmEditorSlug("www.turkatahaber.com")).toBe("turkatahaber");
  });
});
