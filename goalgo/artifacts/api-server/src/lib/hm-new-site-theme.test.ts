import { describe, expect, it } from "vitest";
import {
  companionHexForPrimary,
  findNewSiteColorPalette,
  normalizeNewSiteHex,
  normalizeNewSiteVitrinTheme,
  resolveConceptPortalColors,
  resolveNewSiteVitrinTheme,
} from "./hm-new-site-theme.js";
import { conceptSiteLayoutDefaults, siteKindLayoutDefaults } from "./hm-site-kind.js";

describe("yeni site Portal teması", () => {
  it("boş tema üç türde de Portal", () => {
    expect(resolveNewSiteVitrinTheme("news")).toBe("portal");
    expect(resolveNewSiteVitrinTheme("corporate")).toBe("portal");
    expect(conceptSiteLayoutDefaults(true, "teknoloji").hmVitrinTheme).toBe("portal");
  });

  it("kullanıcı temayı değiştirebilir; bilinmeyen değer Portal'a düşer", () => {
    expect(normalizeNewSiteVitrinTheme("yenisafak", "news")).toBe("yenisafak");
    expect(normalizeNewSiteVitrinTheme("Yenişafak", "news")).toBe("yenisafak");
    expect(normalizeNewSiteVitrinTheme("portal3", "news")).toBe("portal3");
    expect(normalizeNewSiteVitrinTheme("esen", "news")).toBe("esen");
    expect(normalizeNewSiteVitrinTheme("classic", "news")).toBe("portal");
    expect(normalizeNewSiteVitrinTheme("vatan", "corporate")).toBe("vatan");
    expect(normalizeNewSiteVitrinTheme("kurumsal", "corporate")).toBe("corporate");
    expect(normalizeNewSiteVitrinTheme("yenisafak", "corporate")).toBeNull();
    expect(normalizeNewSiteVitrinTheme("vatan", "news")).toBeNull();
    expect(resolveNewSiteVitrinTheme("news", undefined, "ajans")).toBe("portal");
    expect(resolveNewSiteVitrinTheme("corporate", undefined, "esen")).toBe("portal");
  });

  it("eski kurumsal istemci VKD/VATAN gönderirse onu korur", () => {
    expect(resolveNewSiteVitrinTheme("corporate", "vatan")).toBe("vatan");
    expect(resolveNewSiteVitrinTheme("corporate", "corporate")).toBe("corporate");
    expect(siteKindLayoutDefaults("corporate", "corporate").hmVitrinTheme).toBe("corporate");
  });

  it("açık Portal seçimi eski corporateTheme değerini ezer", () => {
    expect(resolveNewSiteVitrinTheme("corporate", "vatan", "portal")).toBe("portal");
    expect(siteKindLayoutDefaults("news", "vatan", "portal")).toMatchObject({
      hmSiteKind: "news",
      hmVitrinTheme: "portal",
      phpTheme: true,
    });
  });

  it("oluşturma mevcut layout nesnesini değiştirmez", () => {
    const stored = { hmVitrinTheme: "esen", hmPrimaryColor: "#123456", hmConceptSite: false };
    const before = JSON.stringify(stored);
    siteKindLayoutDefaults("news");
    conceptSiteLayoutDefaults(true, "spor", { palette: "mavi" });
    expect(JSON.stringify(stored)).toBe(before);
    expect(stored.hmVitrinTheme).toBe("esen");
  });
});

describe("konsept Portal rengi", () => {
  it("palet ve özel renk geçerli hex yazar", () => {
    expect(normalizeNewSiteHex("#ABC")).toBe("#aabbcc");
    expect(normalizeNewSiteHex("kirmizi")).toBeNull();
    expect(findNewSiteColorPalette("YESIL")?.primary).toBe("#0b6e4f");
    const named = resolveConceptPortalColors({ palette: "lacivert" });
    expect(named).toMatchObject({
      hmConceptPalette: "lacivert",
      hmPrimaryColor: "#0b3362",
      hmSecondaryColor: "#c8102e",
      hmNavBarBackground: "#c8102e",
    });
    const custom = resolveConceptPortalColors({ palette: "ozel", primary: "#3366FF" });
    expect(custom.hmPrimaryColor).toBe("#3366ff");
    expect(custom.hmSecondaryColor).toBe(companionHexForPrimary("#3366ff"));
    expect(String(custom.hmSecondaryColor)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("geçersiz özel renk Portal paletine düşer", () => {
    expect(resolveConceptPortalColors({ palette: "ozel", primary: "mavi" })).toMatchObject({
      hmConceptPalette: "portal",
      hmPrimaryColor: "#b00020",
    });
    expect(resolveConceptPortalColors(undefined)).toMatchObject({ hmConceptPalette: "portal" });
  });

  it("konsept kapalıyken renk ve tema yazılmaz", () => {
    expect(conceptSiteLayoutDefaults(false, "spor", { palette: "yesil", primary: "#00ff00" })).toEqual({
      hmConceptSite: false,
    });
  });
});
