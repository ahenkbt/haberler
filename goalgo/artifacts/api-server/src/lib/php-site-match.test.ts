import { describe, expect, it } from "vitest";
import { matchPhpSiteRow } from "../../../../lib/db/src/phpSiteMatch";

// brand-shift 2026-10-11: real ids — panel 1134 = sosyalhizmetler.tr, PHP 1134 = inactive Marmara duplicate.
const php = [
  { id: 1134, slug: "marmara", domain: "marmara.gundemi.org", active: false },
  { id: 1143, slug: "marmara-gundemi", domain: "marmara.gundemi.org" },
  { id: 1145, slug: "sosyalhizmetler", domain: "sosyalhizmetler.tr", domain2: "sosyalhizmetler.gundemi.org" },
  { id: 1146, slug: "spor", domain: "spor.gundemi.org" },
  { id: 229, slug: "kirsehir", domain: "kirsehir.gundemi.org" },
];

describe("matchPhpSiteRow", () => {
  it("maps by domain, never by the same numeric id", () => {
    expect(matchPhpSiteRow({ id: 1134, slug: "sosyalhizmetler", domain: "sosyalhizmetler.tr" }, php)).toEqual({
      ok: true,
      phpSiteId: 1145,
      matchedBy: "domain",
    });
    expect(matchPhpSiteRow({ id: 1131, domain: "https://www.Kirsehir.gundemi.org/" }, php)).toMatchObject({ ok: true, phpSiteId: 229 });
  });
  it("matches an alias domain", () => {
    expect(matchPhpSiteRow({ id: 9, domain: "sosyalhizmetler.gundemi.org" }, php)).toMatchObject({ ok: true, phpSiteId: 1145 });
  });
  it("refuses when the domain is not in the PHP DB (no id fallback)", () => {
    const r = matchPhpSiteRow({ id: 1146, domain: "yok.example.org" }, php);
    expect(r.ok).toBe(false);
  });
  it("prefers the single active row, refuses when still ambiguous", () => {
    expect(matchPhpSiteRow({ id: 1, domain: "marmara.gundemi.org" }, php)).toMatchObject({ ok: true, phpSiteId: 1143 });
    const two = [...php, { id: 1144, slug: "marmara2", domain: "marmara.gundemi.org", active: true }];
    expect(matchPhpSiteRow({ id: 1, domain: "marmara.gundemi.org" }, two).ok).toBe(false);
  });
  it("uses slug only when the panel row has no domain", () => {
    expect(matchPhpSiteRow({ id: 5, slug: "spor" }, php)).toMatchObject({ ok: true, phpSiteId: 1146, matchedBy: "slug" });
    expect(matchPhpSiteRow({ id: 5, slug: "spor", domain: "other.org" }, php).ok).toBe(false);
  });
});
