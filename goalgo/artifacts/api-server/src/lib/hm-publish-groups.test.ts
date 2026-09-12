import { describe, expect, it } from "vitest";
import {
  HM_ASG_AHG_PUBLISH_GROUP_ID,
  HM_PUBLISH_GROUPS,
  indexHmPublishGroupsBySiteId,
  isHmPublishGroupSharedEditorNews,
  publishGroupDefForSite,
} from "./hm-publish-groups.js";

describe("hm-publish-groups", () => {
  it("defines only the ASG+AHG named group", () => {
    expect(HM_PUBLISH_GROUPS).toHaveLength(1);
    expect(HM_PUBLISH_GROUPS[0]?.id).toBe(HM_ASG_AHG_PUBLISH_GROUP_ID);
    expect(HM_PUBLISH_GROUPS[0]?.slugs).toEqual(["asg", "ankarahabergundemi"]);
  });

  it("matches ASG/AHG by slug, alias, or domain — not VKD", () => {
    expect(publishGroupDefForSite({ slug: "asg" })?.id).toBe(HM_ASG_AHG_PUBLISH_GROUP_ID);
    expect(publishGroupDefForSite({ slug: "ankarahabergundemi" })?.id).toBe(HM_ASG_AHG_PUBLISH_GROUP_ID);
    expect(publishGroupDefForSite({ slug: "ahg" })?.id).toBe(HM_ASG_AHG_PUBLISH_GROUP_ID);
    expect(publishGroupDefForSite({ slug: "news", domain: "www.ankarasehirgazetesi.com" })?.id).toBe(
      HM_ASG_AHG_PUBLISH_GROUP_ID,
    );
    expect(publishGroupDefForSite({ slug: "vkd" })).toBeNull();
    expect(publishGroupDefForSite({ slug: "vatankahramanlari", domain: "vatankahramanlari.org" })).toBeNull();
    expect(publishGroupDefForSite({ slug: "su" })).toBeNull();
  });

  it("indexes a group only when both members exist", () => {
    const onlyAsg = indexHmPublishGroupsBySiteId([
      { id: 3, slug: "asg", domain: "ankarasehirgazetesi.com", domain2: null, domain3: null, active: true },
    ]);
    expect(onlyAsg.size).toBe(0);

    const both = indexHmPublishGroupsBySiteId([
      { id: 3, slug: "asg", domain: "ankarasehirgazetesi.com", domain2: null, domain3: null, active: true },
      { id: 8, slug: "ankarahabergundemi", domain: "ankarahabergundemi.com", domain2: null, domain3: null, active: true },
      { id: 7, slug: "vkd", domain: "vatankahramanlari.org", domain2: null, domain3: null, active: true },
    ]);
    expect(both.get(3)).toEqual({ id: HM_ASG_AHG_PUBLISH_GROUP_ID, siteIds: [3, 8] });
    expect(both.get(8)).toEqual({ id: HM_ASG_AHG_PUBLISH_GROUP_ID, siteIds: [3, 8] });
    expect(both.has(7)).toBe(false);
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
