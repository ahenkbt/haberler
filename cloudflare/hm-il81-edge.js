/**
 * 81 İl Haber Ağı (2026-10-09, kullanıcı talebi "81 il için <il>.fix.tc il haber siteleri"): il haber siteleri
 * "<İl> Gündemi" (PHP Yenişafak teması). TP (twilight-pine) satırları önceden oluşturuldu (faz 1: id 1150–1169).
 * Bu kenar yardımcısı, hm-newsites25-edge.js gibi, by-domain araması ıskaladığında eşleşen PANEL satırını
 * (DATABASE_URL) bir kez oluşturur; böylece HM Editör girişi (<il>@fix.tc, şifre = kullanıcı adı, ilk girişte açılır),
 * yönetim listesi ve public haber-sitesi listesi (/api/hm/public/news-sites → ilSites) siteyi tanır.
 * İdempotent; var olan satır asla yeniden yazılmaz. Ankara (ASG/AHG) ve İstanbul (gundemi.org = Gündem İstanbul) burada yok.
 * Layout, TP satırıyla birebir aynıdır (IL81_BASE_LAYOUT + il81Layout()); layout.hmIl81 il sitesi işaretidir.
 */
export const IL81_REV = "81il-20261009";
export const IL81_CONTACT = {
  "phone": "0532 229 18 92",
  "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara"
};
export const IL81_CATS = [
  [
    "gundem",
    "Gündem"
  ],
  [
    "asayis",
    "Asayiş"
  ],
  [
    "yerel",
    "Belediye ve Yerel"
  ],
  [
    "ekonomi",
    "Ekonomi"
  ],
  [
    "egitim",
    "Eğitim"
  ],
  [
    "saglik",
    "Sağlık"
  ],
  [
    "spor",
    "Spor"
  ],
  [
    "kultur",
    "Kültür Sanat"
  ]
];
export const IL81_MENU = [
  [
    "Gündem",
    "/kategori/{s}-gundem"
  ],
  [
    "Asayiş",
    "/kategori/{s}-asayis"
  ],
  [
    "Belediye",
    "/kategori/{s}-yerel"
  ],
  [
    "Ekonomi",
    "/kategori/{s}-ekonomi"
  ],
  [
    "Eğitim",
    "/kategori/{s}-egitim"
  ],
  [
    "Sağlık",
    "/kategori/{s}-saglik"
  ],
  [
    "Spor",
    "/kategori/{s}-spor"
  ],
  [
    "Kültür Sanat",
    "/kategori/{s}-kultur"
  ],
  [
    "Özel Haber",
    "/kategori/ozel-haber"
  ],
  [
    "Tanıtım",
    "/tanitim"
  ],
  [
    "81 İl",
    "/iller"
  ]
];
export const IL81_BASE_LAYOUT = {
  "frontend": "php",
  "phpTheme": true,
  "hmVitrinTheme": "yenisafak",
  "hmFooterAboutHtml": "<p>TÜRKATA HABER AJANSI, Türk Kültürünü Araştırma ve Tanıtma Vakfı’nın haber ajansıdır. 1998’den bu yana yerel yönetimler, kamu kurumları ile sivil toplum ve sektör gündemini Türkçe olarak kamuoyuna aktarır.</p>\n<p>Yerelin Sesini Geleceğe Taşıyan Güvenilir Haber Ağı.</p>\n<h2 id=\"yayin-ilkeleri\">Yayın ilkeleri</h2>\n<p>Ajans, başlık, özet ve kaynak bağlantısıyla sınırlı besleme kayıtlarını olduğu gibi gösterir. Tam metin, kaynağın kendi sayfasındadır. Editörün yazdığı haberler bu sitede yayımlanır.</p>",
  "hmLayoutSanitizeRev": "hm-layout-sanitize-20260727a",
  "hmNewsFooterEnabled": true,
  "hmNewsSliderEnabled": true,
  "hmSehitSearchEnabled": false,
  "hmSiteRssDefaultsRev": "20260727site1",
  "hmTepeMansetOptInRev": "tepe-manset-default-on-v2",
  "hmNewsYsMansetEnabled": true,
  "hmNewsYsTickerEnabled": true,
  "hmRssKarmaDefaultsRev": "rss-karma-default-v1",
  "hmNewsYsAuthorsEnabled": false,
  "hmNewsYsGalleryEnabled": true,
  "hmNewsHeaderMenuEnabled": true,
  "hmNewsTepeMansetEnabled": true,
  "hmNewsYsMostReadEnabled": true,
  "hmNewsYsVideoBandEnabled": true,
  "hmNewsBreakingBandEnabled": true,
  "sadeNewsAtaturkBandEnabled": false,
  "hmNewsYsSideHeadlinesEnabled": true,
  "hmCorporateWarsSectionEnabled": false,
  "hmNewsCategorySectionsEnabled": true,
  "hmNewsYsCategoryBlocksEnabled": true,
  "hmCorporateAtaturkCornerEnabled": false,
  "hmCorporateCulturePortalBandEnabled": false,
  "hmCorporateNationalDaysSectionEnabled": false,
  "sadeNewsHistoryNationalDaysBandEnabled": false,
  "hmSiteKind": "news",
  "showPlatformNav": false,
  "hybridRssEnabled": false,
  "hmConceptSite": true,
  "hmNewsYsStandingsEnabled": false,
  "hmNewsYsSportsHoroscopeEnabled": false,
  "hmNewsYsHoroscopeEnabled": false,
  "hmNewsRssSources": [
    0
  ],
  "hmNewsAuthorsEnabled": false,
  "hmCatTree": "off",
  "hmConceptTopic": "il"
};
/** [slug, il, plaka, bölge, ana renk, ikinci renk, manşet preset, manşet stil, faz, öncelik anahtar kelimeleri] */
export const IL81_ROWS = [
  ["izmir", "İzmir", "35", "ege", "#0b6e99", "#e4572e", "sabah", "serit", 1, ["İzmir", "Aliağa", "Balçova", "Bayındır", "Bayraklı", "Bergama", "Beydağ", "Bornova", "Buca", "Çeşme", "Çiğli", "Dikili", "Foça"]
],
  ["bursa", "Bursa", "16", "marmara", "#1b5e20", "#c62828", "nefes", "izgara", 1, ["Bursa", "Büyükorhan", "Gemlik", "Harmancık", "İnegöl", "İznik", "Karacabey", "Keles", "Kestel", "Mudanya", "Mustafakemalpaşa", "Nilüfer", "Orhaneli"]
],
  ["antalya", "Antalya", "07", "akdeniz", "#b5470b", "#0b6e8a", "mynet", "kapak", 1, ["Antalya", "Akseki", "Alanya", "Demre", "Döşemealtı", "Elmalı", "Finike", "Gazipaşa", "Gündoğmuş", "İbradı", "Kepez", "Konyaaltı", "Korkuteli"]
],
  ["konya", "Konya", "42", "icanadolu", "#6a3d1f", "#2e7d32", "takvim", "bolunmus", 1, ["Konya", "Ahırlı", "Akören", "Akşehir", "Altınekin", "Beyşehir", "Bozkır", "Cihanbeyli", "Çeltik", "Çumra", "Derbent", "Derebucak", "Doğanhisar"]
],
  ["adana", "Adana", "01", "akdeniz", "#a3161c", "#f2a900", "odatv", "izgara", 1, ["Adana", "Çukurova", "Karaisalı", "Kozan", "Pozantı", "Saimbeyli", "Sarıçam", "Tufanbeyli", "Yumurtalık", "Yüreğir"]
],
  ["sanliurfa", "Şanlıurfa", "63", "guneydogu", "#8d5524", "#1e5aa8", "sabah", "kapak", 1, ["Şanlıurfa", "Akçakale", "Birecik", "Bozova", "Ceylanpınar", "Eyyübiye", "Halfeti", "Haliliye", "Harran", "Karaköprü", "Siverek", "Suruç", "Viranşehir"]
],
  ["gaziantep", "Gaziantep", "27", "guneydogu", "#7b1f3a", "#d4a017", "nefes", "serit", 1, ["Gaziantep", "Araban", "İslahiye", "Karkamış", "Nizip", "Nurdağı", "Oğuzeli", "Şahinbey", "Şehitkamil", "Yavuzeli"]
],
  ["kocaeli", "Kocaeli", "41", "marmara", "#12507a", "#f57c00", "mynet", "bolunmus", 1, ["Kocaeli", "Başiskele", "Çayırova", "Darıca", "Derince", "Dilovası", "Gebze", "Gölcük", "İzmit", "Kandıra", "Karamürsel", "Kartepe", "Körfez"]
],
  ["mersin", "Mersin", "33", "akdeniz", "#00796b", "#ef6c00", "takvim", "izgara", 1, ["Mersin", "Anamur", "Bozyazı", "Çamlıyayla", "Erdemli", "Gülnar", "Mezitli", "Silifke", "Tarsus", "Toroslar", "Yenişehir"]
],
  ["diyarbakir", "Diyarbakır", "21", "guneydogu", "#4e342e", "#c0392b", "odatv", "kapak", 1, ["Diyarbakır", "Bağlar", "Bismil", "Çermik", "Çınar", "Çüngüş", "Dicle", "Ergani", "Hani", "Hazro", "Kayapınar", "Kocaköy", "Kulp"]
],
  ["hatay", "Hatay", "31", "akdeniz", "#8e2430", "#2f6f4f", "sabah", "bolunmus", 1, ["Hatay", "Altınözü", "Antakya", "Arsuz", "Dörtyol", "Erzin", "Hassa", "İskenderun", "Kırıkhan", "Payas", "Reyhanlı", "Samandağ", "Yayladağı"]
],
  ["manisa", "Manisa", "45", "ege", "#5e3a8c", "#d81b60", "nefes", "kapak", 1, ["Manisa", "Ahmetli", "Akhisar", "Alaşehir", "Demirci", "Gölmarmara", "Gördes", "Kırkağaç", "Kula", "Salihli", "Sarıgöl", "Saruhanlı", "Selendi"]
],
  ["kayseri", "Kayseri", "38", "icanadolu", "#37474f", "#c62828", "mynet", "serit", 1, ["Kayseri", "Akkışla", "Bünyan", "Develi", "Felahiye", "Hacılar", "İncesu", "Kocasinan", "Melikgazi", "Özvatan", "Sarıoğlan", "Sarız", "Talas"]
],
  ["samsun", "Samsun", "55", "karadeniz", "#0d47a1", "#e53935", "takvim", "kapak", 1, ["Samsun", "Alaçam", "Asarcık", "Atakum", "Ayvacık", "Bafra", "Canik", "Çarşamba", "Havza", "İlkadım", "Kavak", "Ladik", "19 Mayıs"]
],
  ["balikesir", "Balıkesir", "10", "marmara", "#33691e", "#1565c0", "odatv", "serit", 1, ["Balıkesir", "Altıeylül", "Ayvalık", "Balya", "Bandırma", "Bigadiç", "Burhaniye", "Dursunbey", "Erdek", "Gömeç", "Havran", "İvrindi", "Karesi"]
],
  ["tekirdag", "Tekirdağ", "59", "marmara", "#5d1049", "#f9a825", "sabah", "izgara", 1, ["Tekirdağ", "Çerkezköy", "Çorlu", "Ergene", "Hayrabolu", "Kapaklı", "Malkara", "Marmaraereğlisi", "Muratlı", "Süleymanpaşa", "Şarköy"]
],
  ["aydin", "Aydın", "09", "ege", "#6b7a12", "#c2410c", "nefes", "bolunmus", 1, ["Aydın", "Bozdoğan", "Buharkent", "Çine", "Didim", "Efeler", "Germencik", "İncirliova", "Karacasu", "Karpuzlu", "Koçarlı", "Köşk", "Kuşadası"]
],
  ["van", "Van", "65", "doguanadolu", "#0e5e8a", "#c62828", "mynet", "izgara", 1, ["Van", "Bahçesaray", "Başkale", "Çaldıran", "Çatak", "Erciş", "Gevaş", "Gürpınar", "İpekyolu", "Muradiye", "Özalp", "Tuşba"]
],
  ["kahramanmaras", "Kahramanmaraş", "46", "akdeniz", "#9b2226", "#005f73", "takvim", "serit", 1, ["Kahramanmaraş", "Afşin", "Andırın", "Çağlayancerit", "Dulkadiroğlu", "Ekinözü", "Elbistan", "Göksun", "Nurhak", "Onikişubat", "Pazarcık", "Türkoğlu"]
],
  ["sakarya", "Sakarya", "54", "marmara", "#00695c", "#ad1457", "odatv", "bolunmus", 1, ["Sakarya", "Adapazarı", "Akyazı", "Arifiye", "Erenler", "Ferizli", "Geyve", "Hendek", "Karapürçek", "Karasu", "Kaynarca", "Pamukova", "Sapanca"]
]];

const trUpper = (s) => String(s).replace(/i/g, "İ").toUpperCase();

export function il81Layout(r) {
  const [slug, il, plate, region, primary, secondary, preset, stil, phase, keywords] = r;
  const name = `${il} Gündemi`;
  const email = `${slug}@fix.tc`;
  const catSlugs = IL81_CATS.map(([c]) => `${slug}-${c}`);
  const lead = `${il} ve ilçelerinin gündemi.`;
  return {
    ...IL81_BASE_LAYOUT,
    logoUrl: `/gundemi/logos/${slug}-gundemi.png`,
    faviconUrl: `/gundemi/logos/${slug}-gundemi-icon-192.png`,
    hmYsSlogan: lead,
    hmPrimaryColor: primary,
    hmSecondaryColor: secondary,
    hmYsMansetPreset: preset,
    hmNewsYsMansetLayout: preset,
    hmYsMansetStil: stil,
    hmYsMansetStilBase: preset,
    hmNewsRssCategoryOnly: [...catSlugs],
    hmNavOnlyCategorySlugs: [...catSlugs, "ozel-haber"],
    hmCategorySortSlugs: [...catSlugs],
    hmCorporateMenuItems: IL81_MENU.map(([label, href], i) => ({
      id: `m${i + 1}`, label, href: href.replace("{s}", slug), parentId: "", enabled: true,
    })),
    hmNewsHomeModuleCategorySlugs: { ysMostRead: `${slug}-gundem`, ysGallery: `${slug}-kultur` },
    hmNewsTopicPriority: { days: 3, blocks: true, categories: [...catSlugs], keywords: [...keywords] },
    hmYsKunye: { ...IL81_BASE_KUNYE, lead, email, yayin: trUpper(name) },
    hmIl81: { slug, il, plate, region, phase, rev: IL81_REV },
  };
}

export const IL81_BASE_KUNYE = {
  "phone": "0532 229 18 92",
  "tuzel": "Tükav Gaziler Eğitim Kültür Hizmetleri Ltd. Şti.",
  "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
  "genelMudur": "Nail Türkoğlu",
  "yaziIsleri": "Melek Acar",
  "yayinIlkeleri": "Ajans, başlık, özet ve kaynak bağlantısıyla sınırlı besleme kayıtlarını olduğu gibi gösterir. Tam metin, kaynağın kendi sayfasındadır. Editörün yazdığı haberler bu sitede yayımlanır.",
  "yayinYonetmeni": "Mustafa ÖZDEMİR"
};

export const IL81 = IL81_ROWS.map((r) => {
  const [slug, il, plate, region] = r;
  return {
    slug,
    il,
    plate,
    region,
    hosts: [`${slug}.fix.tc`],
    displayName: `${il} Gündemi`,
    description: `${il} ve ilçelerinden son dakika yerel haberler: asayiş, belediye, ekonomi, eğitim, sağlık, spor ve kültür-sanat. 81 İl Haber Ağı üyesi.`,
    contact: { ...IL81_CONTACT, email: `${slug}@fix.tc` },
    editorEmail: `${slug}@fix.tc`,
    layout: il81Layout(r),
  };
});

const BY_HOST = new Map();
for (const s of IL81) for (const h of s.hosts) BY_HOST.set(h, s);
const BY_SLUG = new Map(IL81.map((s) => [s.slug, s]));

const normHost = (h) => String(h || "").trim().toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
export function il81ForHost(host) { return BY_HOST.get(normHost(host)) || null; }
export function il81ForSlug(slug) { return BY_SLUG.get(String(slug || "").trim().toLowerCase()) || null; }

/** layout_json (obje veya metin) il sitesi mi? */
export function isIl81Layout(layout) {
  let l = layout;
  if (typeof l === "string") { try { l = JSON.parse(l); } catch { return false; } }
  return Boolean(l && typeof l === "object" && l.hmIl81 && typeof l.hmIl81 === "object");
}

export const IL81_BINDINGS = IL81.map((s) => ({
  domain: s.hosts[0],
  domains: [...s.hosts],
  slug: s.slug,
  displayName: s.displayName,
  description: s.description,
}));

/** @returns {Promise<{row: object|null, action: string}>} */
export async function ensureIl81SiteOnSql(sql, site) {
  const h1 = site.hosts[0];
  const existing = await sql`
    SELECT id, slug, domain, domain2, domain3, display_name, description, contact_json, layout_json, active, created_at, updated_at
    FROM hm_news_sites
    WHERE lower(trim(both '/' from coalesce(slug, ''))) = ${site.slug}
       OR lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${h1}
       OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${h1}
       OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${h1}
    ORDER BY id ASC
    LIMIT 1
  `;
  if (existing?.[0]) return { row: existing[0], action: "il81_lookup" };
  const rows = await sql`
    INSERT INTO hm_news_sites (slug, domain, domain2, domain3, display_name, description, contact_json, layout_json, active, created_at, updated_at)
    VALUES (${site.slug}, ${h1}, NULL, NULL, ${site.displayName}, ${site.description},
            ${JSON.stringify(site.contact)}::jsonb, ${JSON.stringify(site.layout)}::jsonb, true, NOW(), NOW())
    RETURNING id, slug, domain, domain2, domain3, display_name, description, contact_json, layout_json, active, created_at, updated_at
  `;
  if (rows?.[0]) console.log("[hm-il81] panel site created", site.slug, rows[0].id);
  return { row: rows?.[0] || null, action: "il81_created" };
}
