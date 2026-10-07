import { describe, expect, it } from "vitest";
import {
  ensurePhpThemeLayoutDefaults,
  layoutMarksPhpTheme,
  phpThemeHostCandidatesFromDomains,
} from "./hm-php-theme.js";

describe("layoutMarksPhpTheme", () => {
  it("phpTheme:true veya frontend:php", () => {
    expect(layoutMarksPhpTheme({ phpTheme: true })).toBe(true);
    expect(layoutMarksPhpTheme({ frontend: "php" })).toBe(true);
    expect(layoutMarksPhpTheme({ frontend: "PHP" })).toBe(true);
  });

  it("opt-out ve boş", () => {
    expect(layoutMarksPhpTheme({ phpTheme: false })).toBe(false);
    expect(layoutMarksPhpTheme({ frontend: "spa" })).toBe(false);
    expect(layoutMarksPhpTheme({})).toBe(false);
    expect(layoutMarksPhpTheme(null)).toBe(false);
  });
});

describe("ensurePhpThemeLayoutDefaults", () => {
  it("yeni siteye phpTheme + frontend yazar", () => {
    const next = ensurePhpThemeLayoutDefaults({ hmVitrinTheme: "yenisafak" });
    expect(next.phpTheme).toBe(true);
    expect(next.frontend).toBe("php");
    expect(next.hmVitrinTheme).toBe("yenisafak");
  });

  it("açık opt-out korunur", () => {
    expect(ensurePhpThemeLayoutDefaults({ phpTheme: false }).phpTheme).toBe(false);
    expect(ensurePhpThemeLayoutDefaults({ frontend: "spa" }).phpTheme).toBe(false);
  });
});

describe("phpThemeHostCandidatesFromDomains", () => {
  it("www ve protokolü temizler, tekilleştirir", () => {
    expect(
      phpThemeHostCandidatesFromDomains("https://www.ornek.com/", "ornek.com", "alt.ornek.com"),
    ).toEqual(["ornek.com", "alt.ornek.com"]);
  });
});
