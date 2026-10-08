/**
 * newsites25 (2026-10-08, user request "haber site sayısını 25 yapalım"): three new PHP Yenişafak news sites, created in
 * TP (twilight-pine ids 1147 memur, 1148 turkdunyasi, 1149 world). Like spor.gundemi.org (hm-spor-gundemi-edge.js), this
 * edge helper creates the matching PANEL row (DATABASE_URL) on the first by-domain lookup that misses, so HM Editör login
 * (convention account <sub>@<parent>, password = username, opened on first login), the admin list and the public
 * news-site logo grid (/api/hm/public/news-sites) know the site. Idempotent; an existing row is never rewritten.
 *   memur.gundemi.org (+ memur.fix.tc)              Memur Gündemi         concept: memur (kamu personeli)
 *   turkdunyasi.gundemi.org (+ turkdunyasi.fix.tc)  Türk Dünyası Gündemi  concept: turk-dunyasi
 *   world.fix.tc (canonical)                         Dünya Gündemi         continents menu + hmWorldDateline
 */
export const NEWSITES25 = [
  {
    "slug": "memur",
    "hosts": [
      "memur.gundemi.org",
      "memur.fix.tc"
    ],
    "displayName": "Memur Gündemi",
    "description": "Memur maaşı, zam, toplu sözleşme, atama, kadro, KPSS, emeklilik, özlük hakları, sendikalar ve kamu personel mevzuatı: kamu çalışanlarının gündemi.",
    "contact": {
      "phone": "0532 229 18 92",
      "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
      "email": "memur@gundemi.org"
    },
    "editorEmail": "memur@gundemi.org",
    "layout": {
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
      "hmNewsYsAuthorsEnabled": true,
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
      "hmNewsAuthorsEnabled": true,
      "logoUrl": "/gundemi/logos/memur-gundemi.png",
      "faviconUrl": "/gundemi/logos/memur-gundemi.png",
      "hmYsSlogan": "Kamu personelinin gündemi burada.",
      "hmPrimaryColor": "#1f3a68",
      "hmSecondaryColor": "#b91c1c",
      "hmYsMansetPreset": "nefes",
      "hmNewsYsMansetLayout": "nefes",
      "hmYsMansetStil": "izgara",
      "hmYsMansetStilBase": "nefes",
      "hmCatTree": "off",
      "hmConceptTopic": "memur",
      "hmNavOnlyCategorySlugs": [
        "memur-maas-zam",
        "toplu-sozlesme",
        "atama-kadro",
        "kpss",
        "personel-alimi",
        "memur-emeklilik",
        "ozluk-haklari",
        "sendikalar",
        "personel-mevzuati",
        "ozel-haber"
      ],
      "hmCategorySortSlugs": [
        "memur-maas-zam",
        "toplu-sozlesme",
        "atama-kadro",
        "kpss",
        "personel-alimi",
        "memur-emeklilik",
        "ozluk-haklari",
        "sendikalar",
        "personel-mevzuati"
      ],
      "hmCorporateMenuItems": [
        {
          "id": "m1",
          "label": "Maaş ve Zam",
          "href": "/kategori/memur-maas-zam",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m2",
          "label": "Toplu Sözleşme",
          "href": "/kategori/toplu-sozlesme",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m3",
          "label": "Atama ve Kadro",
          "href": "/kategori/atama-kadro",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m4",
          "label": "KPSS",
          "href": "/kategori/kpss",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m5",
          "label": "Personel Alımı",
          "href": "/kategori/personel-alimi",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m6",
          "label": "Emeklilik",
          "href": "/kategori/memur-emeklilik",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m7",
          "label": "Özlük Hakları",
          "href": "/kategori/ozluk-haklari",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m8",
          "label": "Sendikalar",
          "href": "/kategori/sendikalar",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m9",
          "label": "Mevzuat",
          "href": "/kategori/personel-mevzuati",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m10",
          "label": "Özel Haber",
          "href": "/kategori/ozel-haber",
          "parentId": "",
          "enabled": true
        }
      ],
      "hmNewsHomeModuleCategorySlugs": {
        "ysMostRead": "memur-maas-zam",
        "ysGallery": "atama-kadro"
      },
      "hmNewsTopicPriority": {
        "days": 3,
        "blocks": true,
        "categories": [
          "memur-maas-zam",
          "toplu-sozlesme",
          "atama-kadro",
          "kpss",
          "personel-alimi",
          "memur-emeklilik",
          "ozluk-haklari",
          "sendikalar",
          "personel-mevzuati"
        ],
        "keywords": [
          "memur",
          "kamu personel",
          "kamu çalışan",
          "toplu sözleşme",
          "maaş",
          "zam",
          "kpss",
          "atama",
          "kadro",
          "sendika",
          "emekli",
          "özlük"
        ]
      },
      "hmYsKunye": {
        "lead": "Kamu personelinin gündemi burada.",
        "email": "memur@gundemi.org",
        "phone": "0532 229 18 92",
        "tuzel": "Tükav Gaziler Eğitim Kültür Hizmetleri Ltd. Şti.",
        "yayin": "MEMUR GÜNDEMİ",
        "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
        "genelMudur": "Nail Türkoğlu",
        "yaziIsleri": "Melek Acar",
        "yayinIlkeleri": "Ajans, başlık, özet ve kaynak bağlantısıyla sınırlı besleme kayıtlarını olduğu gibi gösterir. Tam metin, kaynağın kendi sayfasındadır. Editörün yazdığı haberler bu sitede yayımlanır.",
        "yayinYonetmeni": "Mustafa ÖZDEMİR"
      },
      "hmNewsSites25": "newsites25-20261008"
    }
  },
  {
    "slug": "turkdunyasi",
    "hosts": [
      "turkdunyasi.gundemi.org",
      "turkdunyasi.fix.tc"
    ],
    "displayName": "Türk Dünyası Gündemi",
    "description": "Türk devletleri, Orta Asya, Azerbaycan, KKTC, Türk Devletleri Teşkilatı, Balkanlar ve Avrupa Türkleri; Türk tarihi ve kültürü üzerine haberler.",
    "contact": {
      "phone": "0532 229 18 92",
      "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
      "email": "turkdunyasi@gundemi.org"
    },
    "editorEmail": "turkdunyasi@gundemi.org",
    "layout": {
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
      "hmNewsYsAuthorsEnabled": true,
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
      "hmNewsAuthorsEnabled": true,
      "logoUrl": "/gundemi/logos/turkdunyasi-gundemi.png",
      "faviconUrl": "/gundemi/logos/turkdunyasi-gundemi.png",
      "hmYsSlogan": "Adriyatik’ten Çin Seddi’ne Türk dünyasının gündemi.",
      "hmPrimaryColor": "#0a7ea4",
      "hmSecondaryColor": "#c99a2e",
      "hmYsMansetPreset": "mynet",
      "hmNewsYsMansetLayout": "mynet",
      "hmYsMansetStil": "kapak",
      "hmYsMansetStilBase": "mynet",
      "hmCatTree": "off",
      "hmConceptTopic": "turk-dunyasi",
      "hmNavOnlyCategorySlugs": [
        "turk-devletleri",
        "orta-asya",
        "azerbaycan",
        "tdt",
        "balkanlar",
        "avrupa-turkleri",
        "kirim-kafkasya",
        "dogu-turkistan",
        "turk-tarihi",
        "turk-kulturu",
        "ozel-haber"
      ],
      "hmCategorySortSlugs": [
        "turk-devletleri",
        "orta-asya",
        "azerbaycan",
        "tdt",
        "balkanlar",
        "avrupa-turkleri",
        "kirim-kafkasya",
        "dogu-turkistan",
        "turk-tarihi",
        "turk-kulturu"
      ],
      "hmCorporateMenuItems": [
        {
          "id": "m1",
          "label": "Türk Devletleri",
          "href": "/kategori/turk-devletleri",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m2",
          "label": "Orta Asya",
          "href": "/kategori/orta-asya",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m3",
          "label": "Azerbaycan",
          "href": "/kategori/azerbaycan",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m4",
          "label": "Balkanlar",
          "href": "/kategori/balkanlar",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m5",
          "label": "Avrupa Türkleri",
          "href": "/kategori/avrupa-turkleri",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m6",
          "label": "Kırım ve Kafkasya",
          "href": "/kategori/kirim-kafkasya",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m7",
          "label": "Doğu Türkistan",
          "href": "/kategori/dogu-turkistan",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m8",
          "label": "Tarih",
          "href": "/kategori/turk-tarihi",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m9",
          "label": "Kültür",
          "href": "/kategori/turk-kulturu",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m10",
          "label": "TDT",
          "href": "/kategori/tdt",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m11",
          "label": "Özel Haber",
          "href": "/kategori/ozel-haber",
          "parentId": "",
          "enabled": true
        }
      ],
      "hmNewsHomeModuleCategorySlugs": {
        "ysMostRead": "turk-devletleri",
        "ysGallery": "turk-kulturu"
      },
      "hmNewsTopicPriority": {
        "days": 3,
        "blocks": true,
        "categories": [
          "turk-devletleri",
          "orta-asya",
          "azerbaycan",
          "tdt",
          "balkanlar",
          "avrupa-turkleri",
          "kirim-kafkasya",
          "dogu-turkistan",
          "turk-tarihi",
          "turk-kulturu"
        ],
        "keywords": [
          "türk dünyası",
          "türk devletleri",
          "azerbaycan",
          "kazakistan",
          "özbekistan",
          "kırgızistan",
          "türkmenistan",
          "kktc",
          "balkan",
          "kırım",
          "gagavuz",
          "türk tarihi"
        ]
      },
      "hmYsKunye": {
        "lead": "Adriyatik’ten Çin Seddi’ne Türk dünyasının gündemi.",
        "email": "turkdunyasi@gundemi.org",
        "phone": "0532 229 18 92",
        "tuzel": "Tükav Gaziler Eğitim Kültür Hizmetleri Ltd. Şti.",
        "yayin": "TÜRK DÜNYASI GÜNDEMİ",
        "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
        "genelMudur": "Nail Türkoğlu",
        "yaziIsleri": "Melek Acar",
        "yayinIlkeleri": "Ajans, başlık, özet ve kaynak bağlantısıyla sınırlı besleme kayıtlarını olduğu gibi gösterir. Tam metin, kaynağın kendi sayfasındadır. Editörün yazdığı haberler bu sitede yayımlanır.",
        "yayinYonetmeni": "Mustafa ÖZDEMİR"
      },
      "hmNewsSites25": "newsites25-20261008"
    }
  },
  {
    "slug": "world",
    "hosts": [
      "world.fix.tc"
    ],
    "displayName": "Dünya Gündemi",
    "description": "Avrupa’dan Asya’ya, Orta Doğu’dan Amerika’ya kıta kıta dünya gündemi: TurkAta News dünya haberleri.",
    "contact": {
      "phone": "0532 229 18 92",
      "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
      "email": "world@fix.tc"
    },
    "editorEmail": "world@fix.tc",
    "layout": {
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
      "hmNewsYsAuthorsEnabled": true,
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
      "hmNewsAuthorsEnabled": true,
      "logoUrl": "/gundemi/logos/dunya-gundemi.png",
      "faviconUrl": "/gundemi/logos/dunya-gundemi.png",
      "hmYsSlogan": "Kıta kıta dünyanın gündemi.",
      "hmPrimaryColor": "#0f4c5c",
      "hmSecondaryColor": "#e36414",
      "hmYsMansetPreset": "sabah",
      "hmNewsYsMansetLayout": "sabah",
      "hmYsMansetStil": "serit",
      "hmYsMansetStilBase": "sabah",
      "hmCatTree": "off",
      "hmConceptTopic": "dunya",
      "hmNavOnlyCategorySlugs": [
        "avrupa",
        "asya",
        "orta-dogu",
        "afrika",
        "kuzey-amerika",
        "guney-amerika",
        "okyanusya",
        "dunya-ekonomisi",
        "ozel-haber"
      ],
      "hmCategorySortSlugs": [
        "avrupa",
        "asya",
        "orta-dogu",
        "afrika",
        "kuzey-amerika",
        "guney-amerika",
        "okyanusya",
        "dunya-ekonomisi"
      ],
      "hmCorporateMenuItems": [
        {
          "id": "m1",
          "label": "Avrupa",
          "href": "/kategori/avrupa",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m2",
          "label": "Asya",
          "href": "/kategori/asya",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m3",
          "label": "Orta Doğu",
          "href": "/kategori/orta-dogu",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m4",
          "label": "Afrika",
          "href": "/kategori/afrika",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m5",
          "label": "Kuzey Amerika",
          "href": "/kategori/kuzey-amerika",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m6",
          "label": "Güney Amerika",
          "href": "/kategori/guney-amerika",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m7",
          "label": "Okyanusya",
          "href": "/kategori/okyanusya",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m8",
          "label": "Dünya Ekonomisi",
          "href": "/kategori/dunya-ekonomisi",
          "parentId": "",
          "enabled": true
        },
        {
          "id": "m9",
          "label": "Özel Haber",
          "href": "/kategori/ozel-haber",
          "parentId": "",
          "enabled": true
        }
      ],
      "hmNewsHomeModuleCategorySlugs": {
        "ysMostRead": "avrupa",
        "ysGallery": "asya"
      },
      "hmNewsTopicPriority": {
        "days": 3,
        "blocks": true,
        "categories": [
          "avrupa",
          "asya",
          "orta-dogu",
          "afrika",
          "kuzey-amerika",
          "guney-amerika",
          "okyanusya",
          "dunya-ekonomisi"
        ],
        "keywords": []
      },
      "hmYsKunye": {
        "lead": "Kıta kıta dünyanın gündemi.",
        "email": "world@fix.tc",
        "phone": "0532 229 18 92",
        "tuzel": "Tükav Gaziler Eğitim Kültür Hizmetleri Ltd. Şti.",
        "yayin": "DÜNYA GÜNDEMİ",
        "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
        "genelMudur": "Nail Türkoğlu",
        "yaziIsleri": "Melek Acar",
        "yayinIlkeleri": "Ajans, başlık, özet ve kaynak bağlantısıyla sınırlı besleme kayıtlarını olduğu gibi gösterir. Tam metin, kaynağın kendi sayfasındadır. Editörün yazdığı haberler bu sitede yayımlanır.",
        "yayinYonetmeni": "Mustafa ÖZDEMİR"
      },
      "hmNewsSites25": "newsites25-20261008",
      "hmWorldDateline": true
    }
  }
];

function normHost(h) {
  return String(h || "").trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "").replace(/\.$/, "");
}

export function newsites25ForHost(host) {
  const h = normHost(host);
  return NEWSITES25.find((s) => s.hosts.includes(h)) || null;
}

export function newsites25ForSlug(slug) {
  const s = String(slug || "").trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  return NEWSITES25.find((x) => x.slug === s) || null;
}

/** Brand bindings (hm-brand-db-ensure.js HM_BRAND_DB_BINDINGS). */
export const NEWSITES25_BINDINGS = NEWSITES25.map((s) => ({
  domain: s.hosts[0],
  domains: [...s.hosts],
  slug: s.slug,
  displayName: s.displayName,
  description: s.description,
}));

/** @returns {Promise<{row: object|null, action: string}>} */
export async function ensureNewsites25SiteOnSql(sql, site) {
  const [h1, h2 = h1] = site.hosts;
  const existing = await sql`
    SELECT id, slug, domain, domain2, domain3, display_name, description, contact_json, layout_json, active, created_at, updated_at
    FROM hm_news_sites
    WHERE lower(trim(both '/' from coalesce(slug, ''))) = ${site.slug}
       OR lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) IN (${h1}, ${h2})
       OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) IN (${h1}, ${h2})
       OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) IN (${h1}, ${h2})
    ORDER BY id ASC
    LIMIT 1
  `;
  if (existing?.[0]) return { row: existing[0], action: "newsites25_lookup" };
  const rows = await sql`
    INSERT INTO hm_news_sites (slug, domain, domain2, domain3, display_name, description, contact_json, layout_json, active, created_at, updated_at)
    VALUES (${site.slug}, ${h1}, ${site.hosts[1] || null}, NULL, ${site.displayName}, ${site.description},
            ${JSON.stringify(site.contact)}::jsonb, ${JSON.stringify(site.layout)}::jsonb, true, NOW(), NOW())
    RETURNING id, slug, domain, domain2, domain3, display_name, description, contact_json, layout_json, active, created_at, updated_at
  `;
  if (rows?.[0]) console.log("[hm-newsites25] panel site created", site.slug, rows[0].id);
  return { row: rows?.[0] || null, action: "newsites25_created" };
}
