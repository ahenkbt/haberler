import { describe, expect, it } from "vitest";
import {
  foldHmNewsText,
  newsItemMatchesHomepageLocalPref,
  resolveHomepageLocalPref,
} from "./hm-homepage-local-pref.js";

const pref = resolveHomepageLocalPref("kirsehirhaber");

describe("homepage local pref", () => {
  it("resolves Kırşehir pack from kirsehirhaber / legacy slugs", () => {
    expect(resolveHomepageLocalPref("kirsehirhaber")?.cityKey).toBe("kirsehir");
    expect(resolveHomepageLocalPref("kh")?.cityKey).toBe("kirsehir");
    expect(resolveHomepageLocalPref("asg")).toBeNull();
    expect(resolveHomepageLocalPref("ankarahabergundemi")).toBeNull();
    expect(resolveHomepageLocalPref("asg", { hmHomepageLocalCity: "kirsehir" })?.cityKey).toBe("kirsehir");
  });

  it("folds Turkish city variants to kirsehir", () => {
    expect(foldHmNewsText("Kırşehir")).toContain("kirsehir");
    expect(foldHmNewsText("KIRŞEHİR")).toContain("kirsehir");
  });

  it("matches title/spot/geo and site-owned rows; ignores national headlines", () => {
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
        { title: "Trump'tan mesaj", spot: "ABD", categorySlug: "dunya" },
        pref,
        494,
      ),
    ).toBe(false);
  });
});
