import { describe, expect, it } from "vitest";
import type { HmMapCityHeadline } from "@/lib/hmMapCityNews";
import {
  isNewsmapDbPublishedArticleHeadline,
  isNewsmapRssOnlyHeadline,
  resolveNewsmapHeadlineNavHref,
  resolveNewsmapOverlaySourceUrl,
} from "@/lib/haberHaritasiOverlaySourceUrl";

function headline(partial: Partial<HmMapCityHeadline> & Pick<HmMapCityHeadline, "title">): HmMapCityHeadline {
  return {
    city: "Denizli",
    href: "/haber/test-slug",
    kind: "news",
    ...partial,
  };
}

describe("haberHaritasiOverlaySourceUrl", () => {
  it("detects RSS-only headlines with external source URL", () => {
    const row = headline({
      title: "Er gaziler meclisten yasal düzenleme bekliyor",
      href: "/haber/er-gaziler-meclis-ten-yasal-duzenleme-bekliyor",
      source: undefined,
      rssSourceUrl: "https://www.sozcu.com.tr/er-gaziler-meclisten-yasal-duzenleme-bekliyor-p123456",
      feedLabel: "SÖZCÜ",
    });
    expect(isNewsmapRssOnlyHeadline(row)).toBe(true);
    expect(isNewsmapDbPublishedArticleHeadline(row)).toBe(false);
    expect(resolveNewsmapHeadlineNavHref(row)).toBeNull();
    expect(resolveNewsmapOverlaySourceUrl(row)).toBe(
      "https://www.sozcu.com.tr/er-gaziler-meclisten-yasal-duzenleme-bekliyor-p123456",
    );
  });

  it("treats explicit RSS source and internal rss preview path as RSS-only", () => {
    expect(
      isNewsmapRssOnlyHeadline(
        headline({
          title: "RSS",
          source: "rss",
          href: "/haberler/rss/feed9:abc",
          rssSourceUrl: "https://www.ntv.com.tr/gundem/x",
        }),
      ),
    ).toBe(true);
  });

  it("allows DB article overlay source and nav href", () => {
    const row = headline({
      title: "Site haberi",
      source: "db",
      href: "/haber/site-haberi",
      rssSourceUrl: null,
    });
    expect(isNewsmapRssOnlyHeadline(row)).toBe(false);
    expect(resolveNewsmapHeadlineNavHref(row)).toBe("/haber/site-haberi");
    expect(resolveNewsmapOverlaySourceUrl(row)).toBe("/haber/site-haberi");
  });

  it("nav href opens origin editor site for cross-site pool copy", () => {
    const row = headline({
      title: "Şan, Şeref ve Destansı Zaferlerle Dolu 2235 Yıl",
      source: "db",
      href: "/haber/san-sefef-ve-destansi-zaferlerle-dolu-2235-yil-asg-copy",
      rssSourceUrl: null,
      originUrl: "https://vatankahramanlari.org/haber/san-sefef-ve-destansi-zaferlerle-dolu-2235-yil",
      publishedOnSiteId: 42,
      sourceSiteSlug: "vatankahramanlari",
    });
    expect(resolveNewsmapHeadlineNavHref(row)).toBe(
      "https://vatankahramanlari.org/haber/san-sefef-ve-destansi-zaferlerle-dolu-2235-yil",
    );
  });

  it("prefers API originUrl for cross-site HM pool copy (vatankahramanlari on ASG)", () => {
    const row = headline({
      title: "Şan, Şeref ve Destansı Zaferlerle Dolu 2235 Yıl",
      source: "db",
      href: "/haber/san-sefef-ve-destansi-zaferlerle-dolu-2235-yil-asg-copy",
      rssSourceUrl: null,
      originUrl: "https://vatankahramanlari.org/haber/san-sefef-ve-destansi-zaferlerle-dolu-2235-yil",
      publishedOnSiteId: 42,
      sourceSiteSlug: "vatankahramanlari",
    });
    expect(resolveNewsmapOverlaySourceUrl(row)).toBe(
      "https://vatankahramanlari.org/haber/san-sefef-ve-destansi-zaferlerle-dolu-2235-yil",
    );
    expect(resolveNewsmapOverlaySourceUrl(row)).not.toContain("ankarasehirgazetesi.com");
  });

  it("never falls back to current-site /haber/ when internal pool ref lacks originUrl", () => {
    const row = headline({
      title: "Havuz kopyası",
      source: "db",
      href: "/haber/wrong-local-slug",
      rssSourceUrl: "yekpare-hm-pool:42:9001",
    });
    expect(resolveNewsmapOverlaySourceUrl(row)).toBeNull();
  });

  it("HM editör haber haritasında yekpare originUrl yerine site-içi /haber/ linki kullanır", () => {
    const row = headline({
      title: "Editör haberi",
      source: "db",
      href: "/haber/yerel-slug",
      originUrl: "https://yekpare.net/haber/yerel-slug",
      publishedOnSiteId: 7,
    });
    const hmPublicHref = (path: string) => `https://ankarasehirgazetesi.com${path}`;
    const opts = {
      linkMode: "hm-editor" as const,
      hmPublicHref,
      currentSiteId: 7,
    };
    expect(resolveNewsmapHeadlineNavHref(row, opts)).toBe("https://ankarasehirgazetesi.com/haber/yerel-slug");
    expect(resolveNewsmapOverlaySourceUrl(row, hmPublicHref, opts)).toBe(
      "https://ankarasehirgazetesi.com/haber/yerel-slug",
    );
  });

  it("uses yekpare portal originUrl for central DB articles on portal newsmap", () => {
    const row = headline({
      title: "Yekpare haber",
      source: "db",
      href: "/haber/yerel-slug",
      originUrl: "https://yekpare.net/haber/yerel-slug",
      publishedOnSiteId: null,
    });
    expect(resolveNewsmapOverlaySourceUrl(row)).toBe("https://yekpare.net/haber/yerel-slug");
  });
});
