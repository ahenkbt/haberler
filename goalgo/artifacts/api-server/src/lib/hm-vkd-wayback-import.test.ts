import { describe, expect, it } from "vitest";
import {
  extractHaberLinksFromHtml,
  extractVkdWaybackArticle,
  isVkdHaberArticleUrl,
  mapVkdWaybackCategory,
  normalizeVkdCanonicalUrl,
  parseTurkishDateLabel,
  parseVkdWaybackPayload,
  resolveVkdArchivedImage,
  selectVkdHaberCdxRows,
  toWaybackImageUrl,
  waybackSourceKey,
} from "./hm-vkd-wayback-import.js";

const SAMPLE_HTML = `<!DOCTYPE html><html><head>
<title>Vatan Kahramanları Derneği Başkanı Mustafa Özdemir’den 15 Temmuz Mesajı</title>
<meta property="og:title" content="Vatan Kahramanları Derneği Başkanı Mustafa Özdemir’den 15 Temmuz Mesajı"/>
<meta property="og:image" content="https://vatankahramanlari.org.trtema/belediye/uploads/haberler/15-temmuz.jpeg"/>
</head><body>
<div class="innerPageContent">
  <div class="title"><h3>Vatan Kahramanları Derneği Başkanı Mustafa Özdemir’den 15 Temmuz Mesajı</h3></div>
  <div class="innerPageNewsDetail">
    <div class="post-img">
      <img src="/web/20250806055214im_/http://vatankahramanlari.org.tr/tema/belediye/uploads/haberler/15-temmuz.jpeg" alt="kapak">
    </div>
    <div class="post-meta">
      <span class="meta-date">15 Temmuz 2025, 10:40</span>
      <span class="meta-author">120 Okuma</span>
    </div>
    <p>Vatan Kahramanları Derneği Başkanı Mustafa &Ouml;zdemir, 15 Temmuz Demokrasi ve Milli Birlik G&uuml;n&uuml; dolayısıyla yayımladığı mesajında şu ifadelere yer verdi:</p>
    <p>O gece şehit düşen kahramanlarımızı rahmetle anıyoruz.</p>
    <div class="otherNews"><div class="title"><h3>Fotoğraf Galerisi</h3></div></div>
    <div class="innerGalleryDetail">
      <ul><li><a class="grouped_elements" href="tema/belediye/uploads/haberler/15-temmuz.jpeg"><img src="tema/belediye/uploads/haberler/kucuk/15-temmuz.jpeg"></a></li></ul>
    </div>
  </div>
</div>
</body></html>`;

describe("VKD Wayback URL helpers", () => {
  it("normalizes archive and www article URLs", () => {
    expect(
      normalizeVkdCanonicalUrl(
        "https://web.archive.org/web/20250806055214/https://www.vatankahramanlari.org.tr/haber/abb-kultur-ve-tabiat-varliklari-daire-baskanina-ziyaret.html",
      ),
    ).toBe(
      "https://vatankahramanlari.org.tr/haber/abb-kultur-ve-tabiat-varliklari-daire-baskanina-ziyaret.html",
    );
    expect(isVkdHaberArticleUrl("https://vatankahramanlari.org.tr/haberler.html")).toBe(false);
    expect(isVkdHaberArticleUrl("https://vatankahramanlari.org.tr/haber/uploads/logo/x.png")).toBe(false);
    expect(isVkdHaberArticleUrl("https://vatankahramanlari.org.tr/haber/15-temmuz-mesaji.html")).toBe(true);
  });

  it("rewrites content images to Wayback im_ and skips logos", () => {
    expect(
      toWaybackImageUrl(
        "/web/20250806055214im_/http://vatankahramanlari.org.tr/tema/belediye/uploads/haberler/15-temmuz.jpeg",
        "20250806055214",
      ),
    ).toBe(
      "https://web.archive.org/web/20250806055214im_/http://vatankahramanlari.org.tr/tema/belediye/uploads/haberler/15-temmuz.jpeg",
    );
    expect(
      toWaybackImageUrl(
        "https://vatankahramanlari.org.trtema/belediye/uploads/haberler/15-temmuz.jpeg",
        "20250806055214",
      ),
    ).toContain("/tema/belediye/uploads/haberler/15-temmuz.jpeg");
    expect(
      toWaybackImageUrl(
        "http://vatankahramanlari.org.tr/tema/belediye/uploads/logo/lg.jpg",
        "20250806055214",
      ),
    ).toBeNull();
  });

  it("parses Turkish date labels as UTC+3 local wall time", () => {
    const d = parseTurkishDateLabel("15 Temmuz 2025, 10:40");
    expect(d?.toISOString()).toBe("2025-07-15T07:40:00.000Z");
  });
});

describe("VKD Wayback extract", () => {
  it("extracts title, date, body, category and featured image", () => {
    const article = extractVkdWaybackArticle(SAMPLE_HTML, {
      originalUrl: "https://vatankahramanlari.org.tr/haber/vatan-kahramanlari-dernegi-baskani-mustafa-ozdemir-den-15-temmuz-mesaji.html",
      timestamp: "20250806055214",
    });
    expect(article?.title).toContain("15 Temmuz Mesajı");
    expect(article?.dateLabel).toBe("15 Temmuz 2025, 10:40");
    expect(article?.date).toBe("2025-07-15T07:40:00.000Z");
    expect(article?.categorySlug).toBe("sehit-gazi");
    expect(article?.content).toContain("Mustafa Özdemir");
    expect(article?.content).not.toContain("Fotoğraf Galerisi");
    expect(article?.featuredImageUrl).toContain("im_/");
    expect(article?.featuredImageUrl).toContain("haberler/15-temmuz.jpeg");
    expect(article?.bodyImageUrls.length).toBeGreaterThan(0);
  });

  it("collects haber links from a homepage fragment", () => {
    const links = extractHaberLinksFromHtml(
      `<a href="haber/aziz-milletimizin-basi-sagolsun.html">x</a><a href="/haberler.html">list</a>`,
    );
    expect(links).toEqual(["https://vatankahramanlari.org.tr/haber/aziz-milletimizin-basi-sagolsun.html"]);
  });

  it("maps categories without inventing slugs", () => {
    expect(mapVkdWaybackCategory("Kıbrıs Gazisi Sadık Coşkun hayatını kaybetti")).toBe("sehit-gazi");
    expect(mapVkdWaybackCategory("ASKERİ UÇAĞIMIZ DÜŞTÜ 20 ASKERİMİZ ŞEHİT OLDU")).toBe("sehit-gazi");
    expect(mapVkdWaybackCategory("AZİZ MİLLETİMİZİN BAŞI SAĞOLSUN")).toBe("sehit-gazi");
    expect(mapVkdWaybackCategory("Vatan Kahramanları Derneği'nden federasyon kararı")).toBe("dernegimiz");
    expect(mapVkdWaybackCategory("Onursal Üyeler")).toBe("dernegimiz");
    expect(mapVkdWaybackCategory("Muğla Milletvekili Selçuk Özdağ'ı ziyaret")).toBe("faaliyetlerimiz");
    expect(
      mapVkdWaybackCategory(
        "Muğla Milletvekili Selçuk Özdağ'ı ziyaret",
        "Derneğimiz şehit yakınları ve gazilerle yan yanadır.",
      ),
    ).toBe("faaliyetlerimiz");
  });

  it("dedupes CDX rows onto one preferred snapshot per article", () => {
    const picked = selectVkdHaberCdxRows([
      { timestamp: "20240601000000", original: "http://vatankahramanlari.org.tr/haber/foo.html" },
      { timestamp: "20250806055214", original: "https://www.vatankahramanlari.org.tr/haber/foo.html" },
      { timestamp: "20240617091642", original: "https://vatankahramanlari.org.tr/haber/assets/img/favicon.png" },
    ]);
    expect(picked).toEqual([
      {
        timestamp: "20250806055214",
        original: "https://vatankahramanlari.org.tr/haber/foo.html",
      },
    ]);
  });

  it("maps article slugs to archived anasayfa images without loose substring hits", () => {
    const catalog = [
      {
        timestamp: "20260103092311",
        original:
          "https://vatankahramanlari.org.tr/tema/belediye/uploads/haberler/anasayfa/vatan-kahramanlari-dernegi-baskani-mustafa-ozdemir-den-15-temmuz-mesaji.jpeg",
      },
      {
        timestamp: "20260103232606",
        original:
          "https://vatankahramanlari.org.tr/tema/belediye/uploads/haberler/anasayfa/azerbaycanli-gazilerden-vatan-kahramanlari-dernegi-ne-anlamli-ziyaret.jpeg",
      },
      {
        timestamp: "20260103092314",
        original:
          "https://vatankahramanlari.org.tr/tema/belediye/uploads/haberler/anasayfa/20-askerimiz-sehit-oldu-basin-sagolsun-turkiye.jpg",
      },
    ];
    const hit = resolveVkdArchivedImage({
      slug: "vatan-kahramanlari-dernegi-baskani-mustafa-ozdemir-den-15-temmuz-mesaji",
      catalog,
    });
    expect(hit).toContain("15-temmuz-mesaji.jpeg");
    const generic = resolveVkdArchivedImage({ slug: "vatan-kahramanlari-dernegi", catalog });
    expect(generic).toBeNull();
    const plane = resolveVkdArchivedImage({
      slug: "askeri-ucagimiz-dustu-20-askerimiz-sehit-oldu",
      catalog,
    });
    expect(plane).toContain("20-askerimiz-sehit-oldu");
  });

  it("parses payload and builds idempotent source keys", () => {
    const payload = parseVkdWaybackPayload({
      items: [
        {
          title: "Ziyaret",
          slug: "ziyaret",
          canonicalUrl: "https://vatankahramanlari.org.tr/haber/ziyaret.html",
          content: "<p>ok</p>",
        },
        {
          title: "Ziyaret",
          canonicalUrl: "https://www.vatankahramanlari.org.tr/haber/ziyaret.html",
        },
      ],
    });
    expect(payload.items).toHaveLength(1);
    expect(waybackSourceKey(payload.items[0]!.canonicalUrl)).toBe(
      "vkd-wayback:https://vatankahramanlari.org.tr/haber/ziyaret.html",
    );
  });
});
