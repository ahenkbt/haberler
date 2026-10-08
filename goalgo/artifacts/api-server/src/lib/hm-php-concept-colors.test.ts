import { describe, expect, it } from "vitest";
import {
  applyPhpConceptColorsToLayout,
  buildPhpYsChromeBodyStyle,
  HM_PHP_CONCEPT_PALETTES,
  phpConceptPaletteForHost,
  phpConceptPaletteForSlug,
} from "./hm-php-concept-colors.js";

describe("hm-php-concept-colors", () => {
  it("maps yesilvatan to forest greens", () => {
    const p = phpConceptPaletteForHost("www.yesilvatan.gen.tr");
    expect(p?.primary).toBe("#0b6e4f");
    expect(p?.secondary).toBe("#2e7d32");
    expect(phpConceptPaletteForSlug("yesilvatan")?.primary).toBe("#0b6e4f");
  });

  it("keeps turkatahaber navy/red yenisafak pair", () => {
    const p = phpConceptPaletteForSlug("turkatahaber");
    expect(p?.primary).toBe("#0b3362");
    expect(p?.secondary).toBe("#c00005");
  });

  it("forces wrong navy primary back to concept green", () => {
    const palette = phpConceptPaletteForSlug("yesilvatan")!;
    const { layout, changed } = applyPhpConceptColorsToLayout(
      { hmPrimaryColor: "#0b2a5b", hmSecondaryColor: "#c8102e", logoUrl: "/x.png" },
      palette,
    );
    expect(changed).toBe(true);
    expect(layout.hmPrimaryColor).toBe("#0b6e4f");
    expect(layout.hmSecondaryColor).toBe("#2e7d32");
    expect(layout.logoUrl).toBe("/x.png");
  });

  it("is idempotent when colors already match", () => {
    const palette = phpConceptPaletteForSlug("yerelnet")!;
    const { changed } = applyPhpConceptColorsToLayout(
      { hmPrimaryColor: "#0b6e4f", hmSecondaryColor: "#c45c00" },
      palette,
    );
    expect(changed).toBe(false);
  });

  it("builds PHP chrome body style with nav from primary", () => {
    expect(buildPhpYsChromeBodyStyle("#0b6e4f", "#2e7d32")).toBe(
      "--ys-accent: #2e7d32; --ys-navy: #0b6e4f; --ys-nav: #0b6e4f; --ys-secondary: #2e7d32",
    );
  });

  it("covers all concept PHP news hosts", () => {
    const domains = HM_PHP_CONCEPT_PALETTES.map((p) => p.domain);
    expect(domains).toEqual(
      expect.arrayContaining([
        "yesilvatan.gen.tr",
        "yerel.net.tr",
        "turkatahaber.com",
        "sehitgazi.org.tr",
        "turksav.org",
        "dunyasaglik.org",
        "fix.tc",
      ]),
    );
  });
});
