import { describe, expect, it } from "vitest";
import {
  KIRSEHIR_HABER_SITE_ID,
  foldHmNewsText,
  newsItemMatchesHomepageLocalPref,
  resolveHomepageLocalPref,
} from "./hm-homepage-local-pref.js";

const pref = resolveHomepageLocalPref("kirsehirhaber");

describe("homepage local pref", () => {
  it("resolves only Kırşehir Haber (site 494 / kirsehirhaber slugs)", () => {
    expect(KIRSEHIR_HABER_SITE_ID).toBe(494);
    expect(resolveHomepageLocalPref("kirsehirhaber")?.cityKey).toBe("kirsehir");
    expect(resolveHomepageLocalPref("kh")?.cityKey).toBe("kirsehir");
    expect(resolveHomepageLocalPref(null, null, 494)?.siteId).toBe(494);
    expect(resolveHomepageLocalPref("kirsehirhaber", null, 506)?.siteId).toBe(506);
    expect(resolveHomepageLocalPref("asg")).toBeNull();
    expect(resolveHomepageLocalPref("ankarahabergundemi")).toBeNull();
    expect(resolveHomepageLocalPref("asg", { hmHomepageLocalCity: "kirsehir" })).toBeNull();
    expect(resolveHomepageLocalPref("asg", null, 3)).toBeNull();
  });

  it("folds Turkish city variants to kirsehir", () => {
    expect(foldHmNewsText("Kırşehir")).toContain("kirsehir");
    expect(foldHmNewsText("KIRŞEHİR")).toContain("kirsehir");
  });

  it("matches flags, Yerel/Kırşehir, and city text on site 494 only", () => {
    expect(pref).not.toBeNull();
    expect(
      newsItemMatchesHomepageLocalPref(
        { title: "Kırşehir’de yeni otogar projesi", spot: "", categorySlug: "gundem" },
        pref,
        494,
      ),
    ).toBe(true);
    expect(
      newsItemMatchesHomepageLocalPref(
        { title: "Mucur’da tarım fuarı", spot: "", categorySlug: "yerel" },
        pref,
        8,
      ),
    ).toBe(true);
    expect(
      newsItemMatchesHomepageLocalPref(
        { title: "Belediye meclisi toplandı", siteId: 494, categorySlug: "yerel" },
        pref,
        494,
      ),
    ).toBe(true);
    expect(
      newsItemMatchesHomepageLocalPref(
        { title: "Manşet haberi", siteId: 494, categorySlug: "gundem", isTepeManset: true },
        pref,
        494,
      ),
    ).toBe(true);
    expect(
      newsItemMatchesHomepageLocalPref(
        { title: "Editör notu", siteId: 494, categorySlug: "gundem", isEditorManual: true },
        pref,
        494,
      ),
    ).toBe(true);
    expect(
      newsItemMatchesHomepageLocalPref(
        { title: "Trump'tan mesaj", spot: "ABD", categorySlug: "dunya" },
        pref,
        494,
      ),
    ).toBe(false);
    expect(
      newsItemMatchesHomepageLocalPref(
        { title: "Başka ilin yerel haberi", categorySlug: "yerel" },
        pref,
        494,
      ),
    ).toBe(false);
    expect(
      newsItemMatchesHomepageLocalPref(
        { title: "Site 494 dünya haberi", siteId: 494, categorySlug: "dunya" },
        pref,
        494,
      ),
    ).toBe(false);
  });
});
