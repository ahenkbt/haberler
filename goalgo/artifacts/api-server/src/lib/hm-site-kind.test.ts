import { describe, expect, it } from "vitest";
import {
  conceptSiteLayoutDefaults,
  corporateDomainError,
  defaultEditorLoginForHost,
  defaultEditorLoginForSite,
  isPlatformAliasHost,
  normalizeHmConceptTopic,
  orderSiteDomains,
  planNewsSiteDomains,
  platformAliasesForSlug,
  resolveHmSiteKind,
  siteKindLayoutDefaults,
  siteKindPatchError,
} from "./hm-site-kind.js";

describe("platform aliases", () => {
  it("builds both aliases from the slug", () => {
    expect(platformAliasesForSlug("adana")).toEqual({ gundemi: "adana.gundemi.org", fixTc: "adana.fix.tc" });
    expect(platformAliasesForSlug("grok-test")).toEqual({ gundemi: "grok-test.gundemi.org", fixTc: "grok-test.fix.tc" });
  });
  it("only one-label subdomains are aliases (apex sites are real sites)", () => {
    expect(isPlatformAliasHost("adana.gundemi.org")).toBe(true);
    expect(isPlatformAliasHost("www.adana.fix.tc")).toBe(true);
    expect(isPlatformAliasHost("gundemi.org")).toBe(false);
    expect(isPlatformAliasHost("fix.tc")).toBe(false);
    expect(isPlatformAliasHost("adanahaber.com")).toBe(false);
  });
});

describe("planNewsSiteDomains", () => {
  it("no custom domain → gundemi first (canonical), fix.tc second", () => {
    expect(planNewsSiteDomains({ slug: "adana" }).triad).toEqual({
      domain: "adana.gundemi.org",
      domain2: "adana.fix.tc",
      domain3: null,
    });
  });
  it("custom domain becomes canonical, aliases follow", () => {
    expect(planNewsSiteDomains({ slug: "adana", domain3: "AdanaHaber.com" }).triad).toEqual({
      domain: "adanahaber.com",
      domain2: "adana.gundemi.org",
      domain3: "adana.fix.tc",
    });
  });
  it("an alias can be switched off", () => {
    expect(planNewsSiteDomains({ slug: "adana", aliases: { fixTc: false } }).triad).toEqual({
      domain: "adana.gundemi.org",
      domain2: null,
      domain3: null,
    });
    expect(planNewsSiteDomains({ slug: "adana", aliases: { gundemi: false } }).triad.domain).toBe("adana.fix.tc");
  });
  it("needs at least one domain", () => {
    expect(planNewsSiteDomains({ slug: "adana", aliases: { gundemi: false, fixTc: false } }).error).toBeTruthy();
  });
  it("more than 3 domains is refused", () => {
    expect(planNewsSiteDomains({ slug: "a", domain: "x.com", domain2: "y.com" }).error).toBeTruthy();
  });
});

describe("orderSiteDomains", () => {
  it("custom first, then gundemi, then fix; dedupe www", () => {
    expect(orderSiteDomains(["adana.fix.tc", "adana.gundemi.org", "adanahaber.com", "www.adanahaber.com"]).triad).toEqual({
      domain: "adanahaber.com",
      domain2: "adana.gundemi.org",
      domain3: "adana.fix.tc",
    });
  });
  it("removing the custom domain falls back to gundemi canonical", () => {
    expect(orderSiteDomains([null, "adana.gundemi.org", "adana.fix.tc"]).triad.domain).toBe("adana.gundemi.org");
  });
  it("ASG and AHG drop deleted apexes and sehir.gundemi.org", () => {
    expect(orderSiteDomains(["ankarasehirgazetesi.com", "ankara.fix.tc"]).triad).toEqual({
      domain: "ankara.fix.tc",
      domain2: null,
      domain3: null,
    });
    expect(orderSiteDomains(["sehir.gundemi.org", "ankara.fix.tc"]).triad).toEqual({
      domain: "ankara.fix.tc",
      domain2: null,
      domain3: null,
    });
    expect(
      orderSiteDomains(["ankarahabergundemi.com", "ankara.gundemi.org", "gundem.fix.tc"]).triad,
    ).toEqual({
      domain: "gundem.fix.tc",
      domain2: "ankara.gundemi.org",
      domain3: null,
    });
  });
  it("keeps existing multi-custom sites stable", () => {
    expect(orderSiteDomains(["suhaber.net", "suhaberajansi.com", "suhaberajansi.com.tr"]).triad).toEqual({
      domain: "suhaber.net",
      domain2: "suhaberajansi.com",
      domain3: "suhaberajansi.com.tr",
    });
  });
});

describe("site kind", () => {
  it("infers corporate rows", () => {
    expect(resolveHmSiteKind({ slug: "vkd" })).toBe("corporate");
    expect(resolveHmSiteKind({ slug: "tr", domain: "tukav.org" })).toBe("corporate");
    expect(resolveHmSiteKind({ slug: "x", domain: "trafik.gd" })).toBe("corporate");
    expect(resolveHmSiteKind({ slug: "x", layoutJson: '{"hmVitrinTheme":"vatan"}' })).toBe("corporate");
    expect(resolveHmSiteKind({ slug: "vatanhaber", domain: "vatanhaber.net" })).toBe("news");
  });
  it("explicit hmSiteKind wins", () => {
    expect(resolveHmSiteKind({ slug: "vkd", layoutJson: { hmSiteKind: "news" } })).toBe("news");
  });
  it("locks the type", () => {
    expect(siteKindPatchError("news", { hmSiteKind: "corporate" })).toMatch(/dönüştürülemez/);
    expect(siteKindPatchError("corporate", { hmSiteKind: "news" })).toMatch(/dönüştürülemez/);
    expect(siteKindPatchError("news", { hmVitrinTheme: "vatan" })).toBeTruthy();
    expect(siteKindPatchError("corporate", { hmVitrinTheme: "yenisafak" })).toBeTruthy();
    expect(siteKindPatchError("corporate", { phpTheme: true })).toBeTruthy();
    expect(siteKindPatchError("news", { hmSiteKind: "news", phpTheme: true })).toBeNull();
    expect(siteKindPatchError("news", { phpTheme: false, frontend: "spa" })).toMatch(/PHP/);
    expect(siteKindPatchError("corporate", { hmVitrinTheme: "vatan", hmPublicSuspended: true })).toBeNull();
  });
  it("corporate sites refuse platform aliases", () => {
    expect(corporateDomainError({ domain: "vkd.gundemi.org", domain2: null, domain3: null })).toBeTruthy();
    expect(corporateDomainError({ domain: "tukav.org", domain2: null, domain3: null })).toBeNull();
  });
  it("create defaults", () => {
    expect(siteKindLayoutDefaults("news")).toMatchObject({ hmSiteKind: "news", phpTheme: true, frontend: "php" });
    expect(siteKindLayoutDefaults("corporate", "vatan")).toMatchObject({ hmSiteKind: "corporate", hmVitrinTheme: "vatan", phpTheme: false });
  });
});

describe("default editor account", () => {
  it("subdomain sites -> <sub>@<parent>", () => {
    expect(defaultEditorLoginForHost("kibris.gundemi.org")?.email).toBe("kibris@gundemi.org");
    expect(defaultEditorLoginForHost("www.adana.fix.tc")?.email).toBe("adana@fix.tc");
    expect(defaultEditorLoginForHost("spor.suhaber.com.tr")?.email).toBe("spor@suhaber.com.tr");
    expect(defaultEditorLoginForHost("a.b.ornek.com")?.email).toBe("a.b@ornek.com");
  });
  it("normal domains -> bilgi@<domain>, password = username", () => {
    const a = defaultEditorLoginForHost("https://www.OrnekHaber.com/");
    expect(a).toEqual({ email: "bilgi@ornekhaber.com", username: "bilgi@ornekhaber.com", password: "bilgi@ornekhaber.com" });
    expect(defaultEditorLoginForHost("suhaber.com.tr")?.email).toBe("bilgi@suhaber.com.tr");
    expect(defaultEditorLoginForHost("localhost")).toBeNull();
  });
  it("uses the canonical (first) domain", () => {
    expect(defaultEditorLoginForSite({ domain: "adanahaber.com", domain2: "adana.gundemi.org" })?.email).toBe("bilgi@adanahaber.com");
    expect(defaultEditorLoginForSite({ domain: null, domain2: "adana.gundemi.org" })?.email).toBe("adana@gundemi.org");
  });
});

describe("concept site flag", () => {
  it("general site: flag false, widgets untouched", () => {
    expect(conceptSiteLayoutDefaults(false)).toEqual({ hmConceptSite: false });
    expect(conceptSiteLayoutDefaults(undefined, "spor")).toEqual({ hmConceptSite: false });
  });
  it("concept site: no burç, no Süper Lig unless sports", () => {
    const d = conceptSiteLayoutDefaults(true, "cevre");
    expect(d.hmConceptSite).toBe(true);
    expect(d.hmConceptTopic).toBe("cevre");
    expect(d.hmNewsYsHoroscopeEnabled).toBe(false);
    expect(d.hmNewsYsStandingsEnabled).toBe(false);
    expect(d.hmCatTree).toBeUndefined();
  });
  it("sports concept site keeps Süper Lig and gets the Spor tree", () => {
    const d = conceptSiteLayoutDefaults(true, "spor");
    expect(d.hmNewsYsStandingsEnabled).toBe(true);
    expect(d.hmNewsYsSportsHoroscopeEnabled).toBe(true);
    expect(d.hmNewsYsHoroscopeEnabled).toBe(false);
    expect(d.hmCatTree).toBe("spor");
    expect(d.hmNewsRssCategoryOnly).toContain("engelli-sporlari");
  });
  it("unknown topic falls back to diger", () => {
    expect(conceptSiteLayoutDefaults("true", "xyz").hmConceptTopic).toBe("diger");
    expect(normalizeHmConceptTopic("SPOR")).toBe("spor");
  });
});
