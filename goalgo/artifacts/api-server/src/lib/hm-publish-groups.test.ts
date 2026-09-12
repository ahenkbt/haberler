import { describe, expect, it } from "vitest";
import {
  HM_EDITOR_PUBLISH_GROUP_ID,
  HM_EDITOR_PUBLISH_GROUP_SLUGS,
  HM_PUBLISH_GROUPS,
  indexHmPublishGroupsBySiteId,
  isHmPublishGroupSharedEditorNews,
  publishGroupDefForSite,
  siteMatchesPublishGroupSlug,
} from "./hm-publish-groups.js";

describe("hm-publish-groups", () => {
  it("uses live slugs asg + ankarahabergundemi only", () => {
    expect(HM_PUBLISH_GROUPS).toHaveLength(1);
    expect(HM_PUBLISH_GROUPS[0]?.id).toBe(HM_EDITOR_PUBLISH_GROUP_ID);
    expect([...HM_EDITOR_PUBLISH_GROUP_SLUGS]).toEqual(["asg", "ankarahabergundemi"]);
    expect(HM_EDITOR_PUBLISH_GROUP_SLUGS).not.toContain("ahg");
  });

  it("matches DB rows by live slug or host — never invented ahg", () => {
    expect(publishGroupDefForSite({ slug: "asg" })?.id).toBe(HM_EDITOR_PUBLISH_GROUP_ID);
    expect(publishGroupDefForSite({ slug: "ankarahabergundemi" })?.id).toBe(HM_EDITOR_PUBLISH_GROUP_ID);
    expect(publishGroupDefForSite({ slug: "ahg" })).toBeNull();
    expect(siteMatchesPublishGroupSlug({ slug: "ahg" }, "ankarahabergundemi")).toBe(false);
    expect(siteMatchesPublishGroupSlug({ slug: "ahg" }, "ahg")).toBe(false);
    expect(
      publishGroupDefForSite({ slug: "news", domain: "www.ankarasehirgazetesi.com" })?.id,
    ).toBe(HM_EDITOR_PUBLISH_GROUP_ID);
    expect(
      publishGroupDefForSite({ slug: "news", domain: "ankarahabergundemi.com" })?.id,
    ).toBe(HM_EDITOR_PUBLISH_GROUP_ID);
    expect(publishGroupDefForSite({ slug: "vkd" })).toBeNull();
    expect(publishGroupDefForSite({ slug: "vatankahramanlari", domain: "vatankahramanlari.org" })).toBeNull();
    expect(publishGroupDefForSite({ slug: "su" })).toBeNull();
  });

  it("indexes a group only when both live members exist in hm_news_sites", () => {
    const onlyAsg = indexHmPublishGroupsBySiteId([
      { id: 3, slug: "asg", domain: "ankarasehirgazetesi.com", domain2: null, domain3: null, active: true },
    ]);
    expect(onlyAsg.size).toBe(0);

    const both = indexHmPublishGroupsBySiteId([
      { id: 3, slug: "asg", domain: "ankarasehirgazetesi.com", domain2: null, domain3: null, active: true },
      { id: 8, slug: "ankarahabergundemi", domain: "ankarahabergundemi.com", domain2: null, domain3: null, active: true },
      { id: 7, slug: "vkd", domain: "vatankahramanlari.org", domain2: null, domain3: null, active: true },
      { id: 99, slug: "ahg", domain: "example.com", domain2: null, domain3: null, active: true },
    ]);
    expect(both.get(3)).toEqual({ id: HM_EDITOR_PUBLISH_GROUP_ID, siteIds: [3, 8] });
    expect(both.get(8)).toEqual({ id: HM_EDITOR_PUBLISH_GROUP_ID, siteIds: [3, 8] });
    expect(both.has(7)).toBe(false);
    expect(both.has(99)).toBe(false);
  });

  it("shares only editor-manual / site-only rows inside the group", () => {
    const group = [3, 8];
    expect(
      isHmPublishGroupSharedEditorNews({ siteId: 3, isEditorManual: true, siteOnly: true }, 8, group),
    ).toBe(true);
    expect(
      isHmPublishGroupSharedEditorNews({ siteId: 8, isEditorManual: true, siteOnly: true }, 3, group),
    ).toBe(true);
    expect(
      isHmPublishGroupSharedEditorNews({ siteId: 3, isEditorManual: false, siteOnly: false }, 8, group),
    ).toBe(false);
    expect(
      isHmPublishGroupSharedEditorNews({ siteId: 7, isEditorManual: true, siteOnly: true }, 8, group),
    ).toBe(false);
    expect(
      isHmPublishGroupSharedEditorNews({ siteId: 3, isEditorManual: true, siteOnly: true }, 7, group),
    ).toBe(false);
  });
});
