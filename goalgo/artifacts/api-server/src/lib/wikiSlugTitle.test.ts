import { describe, expect, it } from "vitest";
import {
  isRejectedWikiArticleSlug,
  sanitizeWikiArticleSlugParam,
  slugToWikiTitle,
} from "./wikiSlugTitle.js";

describe("sanitizeWikiArticleSlugParam", () => {
  it("converts spaces to underscores", () => {
    expect(sanitizeWikiArticleSlugParam("Phoebe Mitoloji")).toBe("Phoebe_Mitoloji");
    expect(sanitizeWikiArticleSlugParam("Phoebe%20Mitoloji")).toBe("Phoebe_Mitoloji");
  });

  it("strips trailing bot punctuation", () => {
    expect(sanitizeWikiArticleSlugParam("zahran?")).toBe("zahran");
    expect(sanitizeWikiArticleSlugParam("zahran...")).toBe("zahran");
    expect(sanitizeWikiArticleSlugParam("muzio clementi…")).toBe("muzio_clementi");
    expect(sanitizeWikiArticleSlugParam("Zahran!")).toBe("Zahran");
  });
});

describe("isRejectedWikiArticleSlug", () => {
  it("accepts spaced and punctuated titles after sanitize", () => {
    expect(isRejectedWikiArticleSlug("Phoebe Mitoloji")).toBe(false);
    expect(isRejectedWikiArticleSlug("phoebe_mitoloji")).toBe(false);
    expect(isRejectedWikiArticleSlug("zahran?")).toBe(false);
  });

  it("rejects empty and path tricks", () => {
    expect(isRejectedWikiArticleSlug("")).toBe(true);
    expect(isRejectedWikiArticleSlug("   ")).toBe(true);
    expect(isRejectedWikiArticleSlug("foo/bar")).toBe(true);
  });
});

describe("slugToWikiTitle", () => {
  it("maps sanitized underscore slug to wiki title spaces", () => {
    expect(slugToWikiTitle(sanitizeWikiArticleSlugParam("Phoebe Mitoloji"))).toBe("Phoebe Mitoloji");
  });
});
