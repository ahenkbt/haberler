import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyPhpConceptColorsToLayout,
  buildPhpYsChromeBodyStyle,
  phpConceptPaletteForHost,
  phpThemeChromeCssPrefix,
} from "./hm-php-concept-colors.js";

describe("hm-php-concept-colors", () => {
  it("injects green chrome CSS for yesilvatan", () => {
    const css = phpThemeChromeCssPrefix("yesilvatan.gen.tr");
    assert.match(css, /hm-php-concept-colors:yesilvatan/);
    assert.match(css, /--ys-nav:#0b6e4f/);
    assert.match(css, /--ys-navy:#0b6e4f/);
    assert.match(css, /--ys-accent:#2e7d32/);
  });

  it("leaves unknown hosts without prefix", () => {
    assert.equal(phpThemeChromeCssPrefix("example.com"), "");
  });

  it("repairs layout colors for sehitgazi", () => {
    const palette = phpConceptPaletteForHost("sehitgazi.org.tr");
    const { layout, changed } = applyPhpConceptColorsToLayout(
      { hmPrimaryColor: "#0b2a5b" },
      palette,
    );
    assert.equal(changed, true);
    assert.equal(layout.hmPrimaryColor, "#a50e1e");
    assert.equal(layout.hmSecondaryColor, "#7a0b16");
  });

  it("builds body style with navy chrome + red accent for turkata", () => {
    const style = buildPhpYsChromeBodyStyle("#0b3362", "#c00005");
    assert.equal(
      style,
      "--ys-accent: #c00005; --ys-navy: #0b3362; --ys-nav: #0b3362; --ys-secondary: #c00005",
    );
  });
});
