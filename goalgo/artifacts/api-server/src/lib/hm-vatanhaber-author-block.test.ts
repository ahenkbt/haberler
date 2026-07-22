import { describe, expect, it } from "vitest";
import { shouldHideAuthorOnAnkaraHmSite } from "./hm-vatanhaber-author-block.js";

describe("shouldHideAuthorOnAnkaraHmSite", () => {
  it("hides Kerim Bahadır variants on ASG", () => {
    expect(
      shouldHideAuthorOnAnkaraHmSite({
        siteSlug: "asg",
        siteDomain: "ankarasehirgazetesi.com",
        authorName: "Kerim Bahadır",
      }),
    ).toBe(true);
    expect(
      shouldHideAuthorOnAnkaraHmSite({
        siteSlug: "asg",
        authorName: "KERİM BAHADIR ERTAŞ",
      }),
    ).toBe(true);
  });

  it("hides handwritten ASG removal list", () => {
    const names = [
      "Nur Delice",
      "Hüsnü Karabulut",
      "Gül Akdemir",
      "Abidin Server",
      "Abidin ŞANVER",
      "Ayşegül Seçilmiş",
      "Hasan Bora Yılmaz",
      "Harika Sarıkaya",
    ];
    for (const authorName of names) {
      expect(
        shouldHideAuthorOnAnkaraHmSite({
          siteSlug: "asg",
          siteDomain: "ankarasehirgazetesi.com",
          authorName,
        }),
        authorName,
      ).toBe(true);
    }
  });

  it("keeps ASG founder Hüseyin Akın / İmtiyaz", () => {
    expect(
      shouldHideAuthorOnAnkaraHmSite({
        siteSlug: "asg",
        siteDomain: "ankarasehirgazetesi.com",
        authorName: "Hüseyin Akın",
        authorTitle: "İmtiyaz Sahibi",
      }),
    ).toBe(false);
    expect(
      shouldHideAuthorOnAnkaraHmSite({
        siteSlug: "asg",
        authorName: "Hüseyin Akın",
      }),
    ).toBe(false);
  });

  it("hides Hüseyin Akın on AHG (not ASG founder)", () => {
    expect(
      shouldHideAuthorOnAnkaraHmSite({
        siteSlug: "ankarahabergundemi",
        authorName: "HÜSEYİN AKIN",
      }),
    ).toBe(true);
  });

  it("does not hide unrelated authors or non-Ankara sites", () => {
    expect(
      shouldHideAuthorOnAnkaraHmSite({
        siteSlug: "asg",
        authorName: "Mehmet Yılmaz",
      }),
    ).toBe(false);
    expect(
      shouldHideAuthorOnAnkaraHmSite({
        siteSlug: "vatanhaber",
        authorName: "Kerim Bahadır",
      }),
    ).toBe(false);
  });
});
