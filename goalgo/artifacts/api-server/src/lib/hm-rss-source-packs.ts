/**
 * Editör haber sitesi RSS kaynak paketleri (NTV, Diriliş, Birgün, Yerel).
 * Aktif paketin feed’leri site içi hibrit akışa eklenir; görseller harici URL olarak kalır.
 */

export type HmRssSourcePackId = "ntv" | "dirilis" | "birgun" | "yerel";

export type HmRssSourcePackFlags = {
  ntv?: boolean;
  dirilis?: boolean;
  birgun?: boolean;
  yerel?: boolean;
  /** Her beslemeden son 5 benzersiz haber. */
  karmaCek?: boolean;
};

export type HmRssSourcePackFeed = {
  id: string;
  label: string;
  url: string;
  categoryKey: string;
};

export const HM_RSS_KARMA_MAX_ITEMS = 5;

const NTV: HmRssSourcePackFeed[] = [
  { id: "ntv-son-dakika", label: "Son Dakika", url: "https://www.ntv.com.tr/son-dakika.rss", categoryKey: "gundem" },
  { id: "ntv-turkiye", label: "Türkiye", url: "https://www.ntv.com.tr/turkiye.rss", categoryKey: "gundem" },
  { id: "ntv-egitim", label: "Eğitim", url: "https://www.ntv.com.tr/egitim.rss", categoryKey: "egitim" },
  { id: "ntv-ekonomi", label: "Ekonomi", url: "https://www.ntv.com.tr/ekonomi.rss", categoryKey: "ekonomi" },
  { id: "ntv-para", label: "Para", url: "https://www.ntv.com.tr/ntvpara.rss", categoryKey: "ekonomi" },
  { id: "ntv-yasam", label: "Yaşam", url: "https://www.ntv.com.tr/yasam.rss", categoryKey: "yasam" },
  { id: "ntv-dunya", label: "Dünya", url: "https://www.ntv.com.tr/dunya.rss", categoryKey: "dunya" },
  { id: "ntv-teknoloji", label: "Teknoloji", url: "https://www.ntv.com.tr/teknoloji.rss", categoryKey: "teknoloji" },
  { id: "ntv-saglik", label: "Sağlık", url: "https://www.ntv.com.tr/saglik.rss", categoryKey: "saglik" },
  { id: "ntv-otomobil", label: "Otomobil", url: "https://www.ntv.com.tr/otomobil.rss", categoryKey: "otomobil" },
  { id: "ntv-spor", label: "Spor", url: "https://www.ntv.com.tr/sporskor.rss", categoryKey: "spor" },
];

const DIRILIS: HmRssSourcePackFeed[] = [
  { id: "dirilis-asayis", label: "Asayiş", url: "https://www.dirilispostasi.com/rss/asayis", categoryKey: "asayis" },
  { id: "dirilis-genel", label: "Gündem", url: "https://www.dirilispostasi.com/rss/genel", categoryKey: "gundem" },
  { id: "dirilis-guncel", label: "Gündem", url: "https://www.dirilispostasi.com/rss/guncel", categoryKey: "gundem" },
  { id: "dirilis-kultur-sanat", label: "Kültür Sanat", url: "https://www.dirilispostasi.com/rss/kultur-sanat", categoryKey: "kultur-sanat" },
  { id: "dirilis-siyaset", label: "Siyaset", url: "https://www.dirilispostasi.com/rss/siyaset", categoryKey: "politika" },
  { id: "dirilis-spor", label: "Spor", url: "https://www.dirilispostasi.com/rss/spor", categoryKey: "spor" },
  { id: "dirilis-yerel", label: "Yerel", url: "https://www.dirilispostasi.com/rss/yerel-haber", categoryKey: "yerel" },
  { id: "dirilis-gundem", label: "Gündem", url: "https://www.dirilispostasi.com/rss/gundem", categoryKey: "gundem" },
  { id: "dirilis-magazin", label: "Magazin", url: "https://www.dirilispostasi.com/rss/magazin", categoryKey: "magazin" },
  { id: "dirilis-politika", label: "Siyaset", url: "https://www.dirilispostasi.com/rss/politika", categoryKey: "politika" },
  { id: "dirilis-otomobil", label: "Otomobil", url: "https://www.dirilispostasi.com/rss/otomobil", categoryKey: "otomobil" },
  { id: "dirilis-saglik", label: "Sağlık", url: "https://www.dirilispostasi.com/rss/saglik", categoryKey: "saglik" },
  { id: "dirilis-teknoloji", label: "Teknoloji", url: "https://www.dirilispostasi.com/rss/teknoloji", categoryKey: "teknoloji" },
  { id: "dirilis-yasam", label: "Yaşam", url: "https://www.dirilispostasi.com/rss/yasam", categoryKey: "yasam" },
  { id: "dirilis-teknoloji-bilim", label: "Teknoloji", url: "https://www.dirilispostasi.com/rss/teknoloji-ve-bilim", categoryKey: "teknoloji" },
  { id: "dirilis-hayat", label: "Yaşam", url: "https://www.dirilispostasi.com/rss/hayat", categoryKey: "yasam" },
  { id: "dirilis-diger", label: "Gündem", url: "https://www.dirilispostasi.com/rss/diger", categoryKey: "gundem" },
  { id: "dirilis-haber", label: "Gündem", url: "https://www.dirilispostasi.com/rss/haber", categoryKey: "gundem" },
  { id: "dirilis-savunma", label: "Savunma Sanayi", url: "https://www.dirilispostasi.com/rss/savunma-sanayi", categoryKey: "savunma-sanayi" },
];

const BIRGUN: HmRssSourcePackFeed[] = [
  { id: "birgun-avrupa", label: "Dünya", url: "https://www.birgun.net/rss/kategori/avrupa-36", categoryKey: "dunya" },
  { id: "birgun-bilim", label: "Teknoloji", url: "https://www.birgun.net/rss/kategori/bilim-40", categoryKey: "teknoloji" },
  { id: "birgun-bilisim", label: "Teknoloji", url: "https://www.birgun.net/rss/kategori/bilisim-25", categoryKey: "teknoloji" },
  { id: "birgun-cevre", label: "Yaşam", url: "https://www.birgun.net/rss/kategori/cevre-15", categoryKey: "yasam" },
  { id: "birgun-dunya", label: "Dünya", url: "https://www.birgun.net/rss/kategori/dunya-13", categoryKey: "dunya" },
  { id: "birgun-egitim", label: "Eğitim", url: "https://www.birgun.net/rss/kategori/egitim-31", categoryKey: "egitim" },
  { id: "birgun-guncel", label: "Gündem", url: "https://www.birgun.net/rss/kategori/guncel-7", categoryKey: "gundem" },
  { id: "birgun-kultur", label: "Kültür Sanat", url: "https://www.birgun.net/rss/kategori/kultur-sanat-11", categoryKey: "kultur-sanat" },
  { id: "birgun-saglik", label: "Sağlık", url: "https://www.birgun.net/rss/kategori/saglik-27", categoryKey: "saglik" },
  { id: "birgun-siyaset", label: "Siyaset", url: "https://www.birgun.net/rss/kategori/siyaset-8", categoryKey: "politika" },
  { id: "birgun-spor", label: "Spor", url: "https://www.birgun.net/rss/kategori/spor-12", categoryKey: "spor" },
  { id: "birgun-yerel", label: "Yerel", url: "https://www.birgun.net/rss/kategori/yerel-38", categoryKey: "yerel" },
  { id: "birgun-teknoloji", label: "Teknoloji", url: "https://www.birgun.net/rss/kategori/teknoloji-28", categoryKey: "teknoloji" },
  { id: "birgun-yasam", label: "Yaşam", url: "https://www.birgun.net/rss/kategori/yasam-14", categoryKey: "yasam" },
];

const YEREL: HmRssSourcePackFeed[] = [
  { id: "yerel-ticarihayat-ankara", label: "Ankara", url: "https://www.ticarihayat.com/rss/ankara-haberleri", categoryKey: "ankara" },
  { id: "yerel-bizimankara-gundem", label: "Ankara", url: "https://www.bizimankara.com.tr/rss/ankahaber-gundem", categoryKey: "ankara" },
  { id: "yerel-bizimankara-ankara", label: "Ankara", url: "https://www.bizimankara.com.tr/rss/ankara", categoryKey: "ankara" },
  { id: "yerel-bizimankara-asayis", label: "Yerel", url: "https://www.bizimankara.com.tr/rss/asayis", categoryKey: "yerel" },
  { id: "yerel-bizimankara-ilcelerden", label: "Yerel", url: "https://www.bizimankara.com.tr/rss/ilcelerden", categoryKey: "yerel" },
  { id: "yerel-bizimankara-siyaset", label: "Ankara", url: "https://www.bizimankara.com.tr/rss/siyaset", categoryKey: "ankara" },
  { id: "yerel-bizimankara-yurt", label: "Yerel", url: "https://www.bizimankara.com.tr/rss/yurt", categoryKey: "yerel" },
  { id: "yerel-ankaramuhabir", label: "Ankara", url: "https://www.ankaramuhabir.com/rss/ankara", categoryKey: "ankara" },
  { id: "yerel-24saat-ankara", label: "Ankara", url: "https://www.24saatgazetesi.com/rss/ankara-haberleri", categoryKey: "ankara" },
  { id: "yerel-redaktor-ankara", label: "Ankara", url: "https://www.redaktorhaber.com/rss/ankara-haberleri-5", categoryKey: "ankara" },
  { id: "yerel-redaktor-asayis", label: "Yerel", url: "https://www.redaktorhaber.com/rss/asayis-17", categoryKey: "yerel" },
  { id: "yerel-baskent-ankara", label: "Ankara", url: "https://baskentgazete.com.tr/rss/ankara", categoryKey: "ankara" },
  { id: "yerel-baskent-asayis", label: "Yerel", url: "https://baskentgazete.com.tr/rss/asayis", categoryKey: "yerel" },
  { id: "yerel-haberes-asayis", label: "Yerel", url: "https://www.haberes.com.tr/rss/asayis", categoryKey: "yerel" },
  { id: "yerel-gordion-ankara", label: "Ankara", url: "https://www.gordionhaber.com/rss/ankara", categoryKey: "ankara" },
  { id: "yerel-gordion-asayis", label: "Yerel", url: "https://www.gordionhaber.com/rss/asayis", categoryKey: "yerel" },
  { id: "yerel-gordion-genel", label: "Yerel", url: "https://www.gordionhaber.com/rss/genel", categoryKey: "yerel" },
];

export const HM_RSS_SOURCE_PACKS: Record<HmRssSourcePackId, { label: string; feeds: HmRssSourcePackFeed[] }> = {
  ntv: { label: "NTV RSS", feeds: NTV },
  dirilis: { label: "Diriliş RSS", feeds: DIRILIS },
  birgun: { label: "Birgün RSS", feeds: BIRGUN },
  yerel: { label: "Yerel RSS", feeds: YEREL },
};

export function parseHmRssSourcePackFlags(raw: unknown): HmRssSourcePackFlags {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  return {
    ntv: o.ntv === true,
    dirilis: o.dirilis === true,
    birgun: o.birgun === true,
    yerel: o.yerel === true,
    karmaCek: o.karmaCek === true,
  };
}

export function listEnabledHmRssSourcePackFeeds(flags: HmRssSourcePackFlags): HmRssSourcePackFeed[] {
  const out: HmRssSourcePackFeed[] = [];
  const seen = new Set<string>();
  for (const id of ["ntv", "dirilis", "birgun", "yerel"] as const) {
    if (flags[id] !== true) continue;
    for (const feed of HM_RSS_SOURCE_PACKS[id].feeds) {
      const url = feed.url.trim().toLowerCase();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push(feed);
    }
  }
  return out;
}
