import { describe, expect, it } from "vitest";
import { resolveKnownHmEditorSlug } from "./hmEditorDomains";

describe("resolveKnownHmEditorSlug", () => {
  it("maps PHP-theme news hosts", () => {
    expect(resolveKnownHmEditorSlug("yesilvatan.gen.tr")).toBe("yesilvatan");
    expect(resolveKnownHmEditorSlug("www.ankarasehirgazetesi.com")).toBe("asg");
    expect(resolveKnownHmEditorSlug("ankara.fix.tc")).toBe("asg");
    expect(resolveKnownHmEditorSlug("sehir.gundemi.org")).toBe("asg");
    expect(resolveKnownHmEditorSlug("gundem.fix.tc")).toBe("ankarahabergundemi");
    expect(resolveKnownHmEditorSlug("ankara.gundemi.org")).toBe("ankarahabergundemi");
    expect(resolveKnownHmEditorSlug("fix.tc")).toBe("fixhaber");
    expect(resolveKnownHmEditorSlug("www.fix.tc")).toBe("fixhaber");
    expect(resolveKnownHmEditorSlug("gundemi.org")).toBe("gundemi");
    expect(resolveKnownHmEditorSlug("www.gundemi.org")).toBe("gundemi");
  });

  it("maps turkatahaber.com to the HM author-panel slug", () => {
    expect(resolveKnownHmEditorSlug("turkatahaber.com")).toBe("turkatahaber");
    expect(resolveKnownHmEditorSlug("www.turkatahaber.com")).toBe("turkatahaber");
  });
});
