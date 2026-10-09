/**
 * newsites25 (2026-10-08, user request "haber site sayısını 25 yapalım"): three new PHP Yenişafak news sites, created in
 * TP (twilight-pine ids 1147 memur, 1148 turkdunyasi, 1149 world). Like spor.gundemi.org (hm-spor-gundemi-edge.js), this
 * edge helper creates the matching PANEL row (DATABASE_URL) on the first by-domain lookup that misses, so HM Editör login
 * (convention account <sub>@<parent>, password = username, opened on first login), the admin list and the public
 * news-site logo grid (/api/hm/public/news-sites) know the site. Idempotent; an existing row is never rewritten.
 *   memur.gundemi.org (+ memur.fix.tc)              Memur Gündemi         concept: memur (kamu personeli)
 *   turkdunyasi.gundemi.org (+ turkdunyasi.fix.tc)  Türk Dünyası Gündemi  concept: turk-dunyasi
 *   world.fix.tc (canonical, + dunya.gundemi.org)    Dünya Gündemi         continents menu + hmWorldDateline
 * newsites27 (2026-10-09, user request): same pattern, TP ids 1170 / 1171 (layout = TP layout_json at creation):
 *   emlak.gundemi.org                               Emlak Gündemi         concept: emlak (konut, kentsel dönüşüm, TOKİ, kira, kredi, imar)
 *   isdunyasi.gundemi.org                           İş Dünyası Gündemi    concept: isdunyasi (sanayi, ihracat, lojistik, esnaf ve KOBİ)
 * harikaolacak (2026-10-09, user request): harikaolacak.com.tr, TP 1172, Harika Olacak — positive Gen-Z social news + lifestyle concept site.
 * goalgohaber (2026-10-09, user request): goalgo.com.tr, TP 1173, Goalgo Haber Yazılımı — CORPORATE marketing site (front end = Worker
 *   hm-goalgo-com-tr.js); panel row only for /editor (convention editor bilgi@goalgo.com.tr via hmConventionEditorEnabled) + contact inbox.
 * alladdinhaber (2026-10-09, user request): alladdin.app, Alladdin Haber Sitesi Yazılımı — separate CORPORATE marketing site (hm-alladdin-app.js), same pattern.
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
      "world.fix.tc",
      "dunya.gundemi.org"
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
  },
  {
    "slug": "emlak",
    "hosts": [
      "emlak.gundemi.org"
    ],
    "displayName": "Emlak Gündemi",
    "description": "Konut piyasası, kentsel dönüşüm, TOKİ, kira, konut kredisi, arsa ve imar, inşaat, ticari gayrimenkul, emlak hukuku ve piyasa verileri: Türkiye'nin emlak gündemi.",
    "contact": {
      "email": "emlak@gundemi.org",
      "phone": "0532 229 18 92",
      "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara"
    },
    "editorEmail": "emlak@gundemi.org",
    "layout": {
      "logoUrl": "/gundemi/logos/emlak-gundemi.png",
      "frontend": "php",
      "phpTheme": true,
      "hmCatTree": "off",
      "hmYsKunye": {
        "lead": "Konuttan arsaya, kiradan krediye emlağın gündemi.",
        "email": "emlak@gundemi.org",
        "phone": "0532 229 18 92",
        "tuzel": "Tükav Gaziler Eğitim Kültür Hizmetleri Ltd. Şti.",
        "yayin": "EMLAK GÜNDEMİ",
        "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
        "genelMudur": "Nail Türkoğlu",
        "yaziIsleri": "Melek Acar",
        "yayinIlkeleri": "Ajans, başlık, özet ve kaynak bağlantısıyla sınırlı besleme kayıtlarını olduğu gibi gösterir. Tam metin, kaynağın kendi sayfasındadır. Editörün yazdığı haberler bu sitede yayımlanır.",
        "yayinYonetmeni": "Mustafa ÖZDEMİR"
      },
      "faviconUrl": "/gundemi/logos/emlak-gundemi-icon-192.png",
      "hmSiteKind": "news",
      "hmYsSlogan": "Konuttan arsaya, kiradan krediye emlağın gündemi.",
      "hmConceptSite": true,
      "hmNewsSites27": "newsites27-20261009",
      "hmVitrinTheme": "yenisafak",
      "hmConceptTopic": "emlak",
      "hmPrimaryColor": "#0e4d64",
      "hmYsMansetStil": "bolunmus",
      "showPlatformNav": false,
      "hmNewsRssSources": [
        0
      ],
      "hmSecondaryColor": "#e07a1f",
      "hmYsMansetPreset": "mynet",
      "hybridRssEnabled": false,
      "hmFooterAboutHtml": "<p>TÜRKATA HABER AJANSI, Türk Kültürünü Araştırma ve Tanıtma Vakfı’nın haber ajansıdır. 1998’den bu yana yerel yönetimler, kamu kurumları ile sivil toplum ve sektör gündemini Türkçe olarak kamuoyuna aktarır.</p>\n<p>Yerelin Sesini Geleceğe Taşıyan Güvenilir Haber Ağı.</p>\n<h2 id=\"yayin-ilkeleri\">Yayın ilkeleri</h2>\n<p>Ajans, başlık, özet ve kaynak bağlantısıyla sınırlı besleme kayıtlarını olduğu gibi gösterir. Tam metin, kaynağın kendi sayfasındadır. Editörün yazdığı haberler bu sitede yayımlanır.</p>",
      "hmYsMansetStilBase": "mynet",
      "hmCategorySortSlugs": [
        "emlak-piyasa",
        "emlak-kentsel-donusum",
        "emlak-toki",
        "emlak-kira",
        "emlak-kredi",
        "emlak-arsa-imar",
        "emlak-projeler",
        "emlak-insaat",
        "emlak-ticari",
        "emlak-hukuk",
        "emlak-mimari"
      ],
      "hmLayoutSanitizeRev": "hm-layout-sanitize-20260727a",
      "hmNewsFooterEnabled": true,
      "hmNewsSliderEnabled": true,
      "hmNewsTopicPriority": {
        "days": 3,
        "blocks": true,
        "keywords": [
          "emlak",
          "konut",
          "kira",
          "kentsel dönüşüm",
          "toki",
          "konut kredisi",
          "arsa",
          "imar",
          "inşaat",
          "gayrimenkul",
          "tapu"
        ],
        "categories": [
          "emlak-piyasa",
          "emlak-kentsel-donusum",
          "emlak-toki",
          "emlak-kira",
          "emlak-kredi",
          "emlak-arsa-imar",
          "emlak-projeler",
          "emlak-insaat",
          "emlak-ticari",
          "emlak-hukuk",
          "emlak-mimari"
        ]
      },
      "hmCorporateMenuItems": [
        {
          "id": "m1",
          "href": "/kategori/emlak-piyasa",
          "label": "Piyasa",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m2",
          "href": "/kategori/emlak-kentsel-donusum",
          "label": "Kentsel Dönüşüm",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m3",
          "href": "/kategori/emlak-toki",
          "label": "TOKİ",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m4",
          "href": "/kategori/emlak-kira",
          "label": "Kira",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m5",
          "href": "/kategori/emlak-kredi",
          "label": "Kredi ve Finans",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m6",
          "href": "/kategori/emlak-arsa-imar",
          "label": "Arsa ve İmar",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m7",
          "href": "/kategori/emlak-projeler",
          "label": "Projeler",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m8",
          "href": "/kategori/emlak-insaat",
          "label": "İnşaat",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m9",
          "href": "/kategori/emlak-ticari",
          "label": "Ticari Gayrimenkul",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m10",
          "href": "/kategori/emlak-hukuk",
          "label": "Emlak Hukuku",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m11",
          "href": "/kategori/emlak-mimari",
          "label": "Mimari",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m12",
          "href": "/kategori/ozel-haber",
          "label": "Özel Haber",
          "enabled": true,
          "parentId": ""
        }
      ],
      "hmNewsAuthorsEnabled": true,
      "hmNewsYsMansetLayout": "mynet",
      "hmSehitSearchEnabled": false,
      "hmSiteRssDefaultsRev": "20260727site1",
      "hmTepeMansetOptInRev": "tepe-manset-default-on-v2",
      "hmNewsRssCategoryOnly": [
        "emlak-piyasa",
        "emlak-kentsel-donusum",
        "emlak-toki",
        "emlak-kira",
        "emlak-kredi",
        "emlak-arsa-imar",
        "emlak-projeler",
        "emlak-insaat",
        "emlak-ticari",
        "emlak-hukuk",
        "emlak-mimari"
      ],
      "hmNewsYsMansetEnabled": true,
      "hmNewsYsTickerEnabled": true,
      "hmRssKarmaDefaultsRev": "rss-karma-default-v1",
      "hmNavOnlyCategorySlugs": [
        "emlak-piyasa",
        "emlak-kentsel-donusum",
        "emlak-toki",
        "emlak-kira",
        "emlak-kredi",
        "emlak-arsa-imar",
        "emlak-projeler",
        "emlak-insaat",
        "emlak-ticari",
        "emlak-hukuk",
        "emlak-mimari",
        "ozel-haber"
      ],
      "hmNewsYsAuthorsEnabled": true,
      "hmNewsYsGalleryEnabled": true,
      "hmNewsHeaderMenuEnabled": true,
      "hmNewsTepeMansetEnabled": true,
      "hmNewsYsMostReadEnabled": true,
      "hmNewsYsHoroscopeEnabled": false,
      "hmNewsYsStandingsEnabled": false,
      "hmNewsYsVideoBandEnabled": true,
      "hmNewsBreakingBandEnabled": true,
      "sadeNewsAtaturkBandEnabled": false,
      "hmNewsYsSideHeadlinesEnabled": true,
      "hmCorporateWarsSectionEnabled": false,
      "hmNewsCategorySectionsEnabled": true,
      "hmNewsHomeModuleCategorySlugs": {
        "ysGallery": "emlak-projeler",
        "ysMostRead": "emlak-piyasa"
      },
      "hmNewsYsCategoryBlocksEnabled": true,
      "hmNewsYsSportsHoroscopeEnabled": false,
      "hmCorporateAtaturkCornerEnabled": false,
      "hmCorporateCulturePortalBandEnabled": false,
      "hmCorporateNationalDaysSectionEnabled": false,
      "sadeNewsHistoryNationalDaysBandEnabled": false
    }
  },
  {
    "slug": "isdunyasi",
    "hosts": [
      "isdunyasi.gundemi.org"
    ],
    "displayName": "İş Dünyası Gündemi",
    "description": "Sanayi, ihracat, lojistik, finans ve yatırım, şirketler, atamalar, röportajlar ile esnaf, KOBİ, odalar ve borsalar, teşvik ve mevzuat: iş dünyasının ve esnafın gündemi.",
    "contact": {
      "email": "isdunyasi@gundemi.org",
      "phone": "0532 229 18 92",
      "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara"
    },
    "editorEmail": "isdunyasi@gundemi.org",
    "layout": {
      "logoUrl": "/gundemi/logos/isdunyasi-gundemi.png",
      "frontend": "php",
      "phpTheme": true,
      "hmCatTree": "off",
      "hmYsKunye": {
        "lead": "Patrondan esnafa, iş dünyasının gündemi.",
        "email": "isdunyasi@gundemi.org",
        "phone": "0532 229 18 92",
        "tuzel": "Tükav Gaziler Eğitim Kültür Hizmetleri Ltd. Şti.",
        "yayin": "İŞ DÜNYASI GÜNDEMİ",
        "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
        "genelMudur": "Nail Türkoğlu",
        "yaziIsleri": "Melek Acar",
        "yayinIlkeleri": "Ajans, başlık, özet ve kaynak bağlantısıyla sınırlı besleme kayıtlarını olduğu gibi gösterir. Tam metin, kaynağın kendi sayfasındadır. Editörün yazdığı haberler bu sitede yayımlanır.",
        "yayinYonetmeni": "Mustafa ÖZDEMİR"
      },
      "faviconUrl": "/gundemi/logos/isdunyasi-gundemi-icon-192.png",
      "hmSiteKind": "news",
      "hmYsSlogan": "Patrondan esnafa, iş dünyasının gündemi.",
      "hmConceptSite": true,
      "hmNewsSites27": "newsites27-20261009",
      "hmVitrinTheme": "yenisafak",
      "hmConceptTopic": "isdunyasi",
      "hmPrimaryColor": "#1b2a40",
      "hmYsMansetStil": "kapak",
      "showPlatformNav": false,
      "hmNewsRssSources": [
        0
      ],
      "hmSecondaryColor": "#c8962e",
      "hmYsMansetPreset": "nefes",
      "hybridRssEnabled": false,
      "hmFooterAboutHtml": "<p>TÜRKATA HABER AJANSI, Türk Kültürünü Araştırma ve Tanıtma Vakfı’nın haber ajansıdır. 1998’den bu yana yerel yönetimler, kamu kurumları ile sivil toplum ve sektör gündemini Türkçe olarak kamuoyuna aktarır.</p>\n<p>Yerelin Sesini Geleceğe Taşıyan Güvenilir Haber Ağı.</p>\n<h2 id=\"yayin-ilkeleri\">Yayın ilkeleri</h2>\n<p>Ajans, başlık, özet ve kaynak bağlantısıyla sınırlı besleme kayıtlarını olduğu gibi gösterir. Tam metin, kaynağın kendi sayfasındadır. Editörün yazdığı haberler bu sitede yayımlanır.</p>",
      "hmYsMansetStilBase": "nefes",
      "hmCategorySortSlugs": [
        "isd-sanayi",
        "isd-ihracat",
        "isd-lojistik",
        "isd-finans",
        "isd-esnaf-kobi",
        "isd-odalar",
        "isd-sirketler",
        "isd-atamalar",
        "isd-girisim",
        "isd-roportaj",
        "isd-teknoloji",
        "isd-enerji",
        "isd-tarim-ekonomisi",
        "isd-mevzuat"
      ],
      "hmLayoutSanitizeRev": "hm-layout-sanitize-20260727a",
      "hmNewsFooterEnabled": true,
      "hmNewsSliderEnabled": true,
      "hmNewsTopicPriority": {
        "days": 3,
        "blocks": true,
        "keywords": [
          "sanayi",
          "ihracat",
          "lojistik",
          "yatırım",
          "şirket",
          "esnaf",
          "kobi",
          "kosgeb",
          "tobb",
          "tesk",
          "atama",
          "teşvik",
          "girişim",
          "enerji"
        ],
        "categories": [
          "isd-sanayi",
          "isd-ihracat",
          "isd-lojistik",
          "isd-finans",
          "isd-esnaf-kobi",
          "isd-odalar",
          "isd-sirketler",
          "isd-atamalar",
          "isd-girisim",
          "isd-roportaj",
          "isd-teknoloji",
          "isd-enerji",
          "isd-tarim-ekonomisi",
          "isd-mevzuat"
        ]
      },
      "hmCorporateMenuItems": [
        {
          "id": "m1",
          "href": "/kategori/isd-sanayi",
          "label": "Sanayi",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m2",
          "href": "/kategori/isd-ihracat",
          "label": "İhracat",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m3",
          "href": "/kategori/isd-lojistik",
          "label": "Lojistik",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m4",
          "href": "/kategori/isd-finans",
          "label": "Finans",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m5",
          "href": "/kategori/isd-esnaf-kobi",
          "label": "Esnaf ve KOBİ",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m6",
          "href": "/kategori/isd-odalar",
          "label": "Odalar ve Borsalar",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m7",
          "href": "/kategori/isd-sirketler",
          "label": "Şirketler",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m8",
          "href": "/kategori/isd-atamalar",
          "label": "Atamalar",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m9",
          "href": "/kategori/isd-girisim",
          "label": "Girişimcilik",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m10",
          "href": "/kategori/isd-roportaj",
          "label": "Röportaj",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m11",
          "href": "/kategori/isd-teknoloji",
          "label": "Teknoloji",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m12",
          "href": "/kategori/isd-enerji",
          "label": "Enerji",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m13",
          "href": "/kategori/isd-tarim-ekonomisi",
          "label": "Tarım Ekonomisi",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m14",
          "href": "/kategori/isd-mevzuat",
          "label": "Mevzuat ve Teşvik",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m15",
          "href": "/kategori/ozel-haber",
          "label": "Özel Haber",
          "enabled": true,
          "parentId": ""
        }
      ],
      "hmNewsAuthorsEnabled": true,
      "hmNewsYsMansetLayout": "nefes",
      "hmSehitSearchEnabled": false,
      "hmSiteRssDefaultsRev": "20260727site1",
      "hmTepeMansetOptInRev": "tepe-manset-default-on-v2",
      "hmNewsRssCategoryOnly": [
        "isd-sanayi",
        "isd-ihracat",
        "isd-lojistik",
        "isd-finans",
        "isd-esnaf-kobi",
        "isd-odalar",
        "isd-sirketler",
        "isd-atamalar",
        "isd-girisim",
        "isd-roportaj",
        "isd-teknoloji",
        "isd-enerji",
        "isd-tarim-ekonomisi",
        "isd-mevzuat"
      ],
      "hmNewsYsMansetEnabled": true,
      "hmNewsYsTickerEnabled": true,
      "hmRssKarmaDefaultsRev": "rss-karma-default-v1",
      "hmNavOnlyCategorySlugs": [
        "isd-sanayi",
        "isd-ihracat",
        "isd-lojistik",
        "isd-finans",
        "isd-esnaf-kobi",
        "isd-odalar",
        "isd-sirketler",
        "isd-atamalar",
        "isd-girisim",
        "isd-roportaj",
        "isd-teknoloji",
        "isd-enerji",
        "isd-tarim-ekonomisi",
        "isd-mevzuat",
        "ozel-haber"
      ],
      "hmNewsYsAuthorsEnabled": true,
      "hmNewsYsGalleryEnabled": true,
      "hmNewsHeaderMenuEnabled": true,
      "hmNewsTepeMansetEnabled": true,
      "hmNewsYsMostReadEnabled": true,
      "hmNewsYsHoroscopeEnabled": false,
      "hmNewsYsStandingsEnabled": false,
      "hmNewsYsVideoBandEnabled": true,
      "hmNewsBreakingBandEnabled": true,
      "sadeNewsAtaturkBandEnabled": false,
      "hmNewsYsSideHeadlinesEnabled": true,
      "hmCorporateWarsSectionEnabled": false,
      "hmNewsCategorySectionsEnabled": true,
      "hmNewsHomeModuleCategorySlugs": {
        "ysGallery": "isd-sanayi",
        "ysMostRead": "isd-sirketler"
      },
      "hmNewsYsCategoryBlocksEnabled": true,
      "hmNewsYsSportsHoroscopeEnabled": false,
      "hmCorporateAtaturkCornerEnabled": false,
      "hmCorporateCulturePortalBandEnabled": false,
      "hmCorporateNationalDaysSectionEnabled": false,
      "sadeNewsHistoryNationalDaysBandEnabled": false
    }
  },
  {
    "slug": "harikaolacak",
    "hosts": [
      "harikaolacak.com.tr",
      "www.harikaolacak.com.tr"
    ],
    "displayName": "Harika Olacak",
    "description": "Z kuşağı için sadece iyi ve pozitif haberler: trendler, müzik, dizi-film, kültür-sanat, etkinlikler, gezi, mekanlar, yeme-içme, sağlık, güzellik, moda, kampüs, oyun ve teknoloji. Suç, kaza, siyaset ve kötü haber yok. Harika Olacak!",
    "contact": {
      "email": "bilgi@harikaolacak.com.tr",
      "phone": "0532 229 18 92",
      "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara"
    },
    "editorEmail": "bilgi@harikaolacak.com.tr",
    "layout": {
      "logoUrl": "/brand/harikaolacak/harikaolacak.png",
      "frontend": "php",
      "phpTheme": true,
      "hmCatTree": "off",
      "hmYsKunye": {
        "lead": "Z kuşağının pozitif gündemi: trendler, etkinlikler, gezi ve iyi haberler.",
        "email": "bilgi@harikaolacak.com.tr",
        "phone": "0532 229 18 92",
        "tuzel": "Tükav Gaziler Eğitim Kültür Hizmetleri Ltd. Şti.",
        "yayin": "HARİKA OLACAK",
        "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
        "genelMudur": "Nail Türkoğlu",
        "yaziIsleri": "Melek Acar",
        "yayinIlkeleri": "Ajans, başlık, özet ve kaynak bağlantısıyla sınırlı besleme kayıtlarını olduğu gibi gösterir. Tam metin, kaynağın kendi sayfasındadır. Editörün yazdığı haberler bu sitede yayımlanır.",
        "yayinYonetmeni": "Mustafa ÖZDEMİR"
      },
      "faviconUrl": "/brand/harikaolacak/harikaolacak-icon-192.png",
      "hmSiteKind": "news",
      "hmYsSlogan": "Z kuşağının pozitif gündemi: trendler, etkinlikler, gezi ve iyi haberler.",
      "hmConceptSite": true,
      "hmVitrinTheme": "yenisafak",
      "hmConceptTopic": "harikaolacak",
      "hmHarikaOlacak": "harikaolacak-20261009",
      "hmPrimaryColor": "#7c3aed",
      "hmYsMansetStil": "izgara",
      "showPlatformNav": false,
      "hmNewsRssSources": [
        0
      ],
      "hmSecondaryColor": "#ff3d8b",
      "hmYsMansetPreset": "mynet",
      "hybridRssEnabled": false,
      "hmFooterAboutHtml": "<p><strong>Harika Olacak</strong>, Z kuşağı için hazırlanan pozitif sosyal haber ve yaşam sitesidir: trendler, müzik, dizi-film, kültür-sanat, etkinlikler, gezi, mekanlar, sağlık, güzellik, moda, kampüs, oyun ve teknoloji. Suç, kaza, siyaset ve kötü haber yok; sadece ilham veren, eğlendiren ve iyi hissettiren haberler.</p>\n<p>TÜRKATA HABER AJANSI, Türk Kültürünü Araştırma ve Tanıtma Vakfı’nın haber ajansıdır. 1998’den bu yana yerel yönetimler, kamu kurumları ile sivil toplum ve sektör gündemini Türkçe olarak kamuoyuna aktarır.</p>\n<p>Yerelin Sesini Geleceğe Taşıyan Güvenilir Haber Ağı.</p>\n<h2 id=\"yayin-ilkeleri\">Yayın ilkeleri</h2>\n<p>Ajans, başlık, özet ve kaynak bağlantısıyla sınırlı besleme kayıtlarını olduğu gibi gösterir. Tam metin, kaynağın kendi sayfasındadır. Editörün yazdığı haberler bu sitede yayımlanır.</p>",
      "hmYsMansetStilBase": "mynet",
      "hmCategorySortSlugs": [
        "ho-iyi-haber",
        "ho-trendler",
        "ho-eglence",
        "ho-muzik",
        "ho-dizi-film",
        "ho-kultur-sanat",
        "ho-etkinlikler",
        "ho-gezi",
        "ho-mekanlar",
        "ho-yeme-icme",
        "ho-saglik",
        "ho-yasam",
        "ho-guzellik",
        "ho-moda",
        "ho-kadin",
        "ho-oyun-teknoloji",
        "ho-kampus"
      ],
      "hmLayoutSanitizeRev": "hm-layout-sanitize-20260727a",
      "hmNewsFooterEnabled": true,
      "hmNewsSliderEnabled": true,
      "hmNewsTopicPriority": {
        "days": 3,
        "blocks": true,
        "exclude": [
          "süper lig",
          "maç",
          "transfer",
          "loto",
          "burç",
          "kurultay",
          "yeni parti",
          "öldü",
          "hayatını kaybetti",
          "kaza",
          "cinayet",
          "gözaltı",
          "tutuklandı",
          "deprem",
          "yangın",
          "savaş",
          "saldırı",
          "skandal",
          "seçim",
          "milletvekili",
          "zam",
          "enflasyon",
          "intihar",
          "taciz",
          "şiddet"
        ],
        "keywords": [
          "konser",
          "festival",
          "etkinlik",
          "sergi",
          "tiyatro",
          "gezi",
          "tatil",
          "kafe",
          "tarif",
          "trend",
          "tiktok",
          "instagram",
          "kampüs",
          "öğrenci",
          "güzellik",
          "moda",
          "müzik",
          "dizi",
          "film",
          "oyun",
          "yapay zeka",
          "iyi haber",
          "başarı",
          "ödül",
          "gönüllü",
          "sahiplen"
        ],
        "categories": [
          "ho-iyi-haber",
          "ho-trendler",
          "ho-eglence",
          "ho-muzik",
          "ho-dizi-film",
          "ho-kultur-sanat",
          "ho-etkinlikler",
          "ho-gezi",
          "ho-mekanlar",
          "ho-yeme-icme",
          "ho-saglik",
          "ho-yasam",
          "ho-guzellik",
          "ho-moda",
          "ho-kadin",
          "ho-oyun-teknoloji",
          "ho-kampus"
        ]
      },
      "hmCorporateMenuItems": [
        {
          "id": "m1",
          "href": "/kategori/ho-iyi-haber",
          "label": "İyi Haber",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m2",
          "href": "/kategori/ho-trendler",
          "label": "Trendler",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m3",
          "href": "/kategori/ho-eglence",
          "label": "Eğlence",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m4",
          "href": "/kategori/ho-muzik",
          "label": "Müzik",
          "enabled": true,
          "parentId": "m3"
        },
        {
          "id": "m5",
          "href": "/kategori/ho-dizi-film",
          "label": "Dizi & Film",
          "enabled": true,
          "parentId": "m3"
        },
        {
          "id": "m6",
          "href": "/kategori/ho-kultur-sanat",
          "label": "Kültür & Sanat",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m7",
          "href": "/kategori/ho-etkinlikler",
          "label": "Etkinlikler",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m8",
          "href": "/kategori/ho-gezi",
          "label": "Gezi",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m9",
          "href": "/kategori/ho-mekanlar",
          "label": "Mekanlar",
          "enabled": true,
          "parentId": "m8"
        },
        {
          "id": "m10",
          "href": "/kategori/ho-yeme-icme",
          "label": "Yeme & İçme",
          "enabled": true,
          "parentId": "m8"
        },
        {
          "id": "m11",
          "href": "/kategori/ho-saglik",
          "label": "Sağlık",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m12",
          "href": "/kategori/ho-yasam",
          "label": "Yaşam",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m13",
          "href": "/kategori/ho-guzellik",
          "label": "Güzellik",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m14",
          "href": "/kategori/ho-moda",
          "label": "Moda",
          "enabled": true,
          "parentId": "m13"
        },
        {
          "id": "m15",
          "href": "/kategori/ho-kadin",
          "label": "Kadın",
          "enabled": true,
          "parentId": "m13"
        },
        {
          "id": "m16",
          "href": "/kategori/ho-oyun-teknoloji",
          "label": "Oyun & Teknoloji",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m17",
          "href": "/kategori/ho-kampus",
          "label": "Kampüs",
          "enabled": true,
          "parentId": ""
        },
        {
          "id": "m18",
          "href": "/kategori/ozel-haber",
          "label": "Özel Haber",
          "enabled": true,
          "parentId": ""
        }
      ],
      "hmNewsAuthorsEnabled": true,
      "hmNewsYsMansetLayout": "mynet",
      "hmSehitSearchEnabled": false,
      "hmSiteRssDefaultsRev": "20260727site1",
      "hmTepeMansetOptInRev": "tepe-manset-default-on-v2",
      "hmNewsRssCategoryOnly": [
        "ho-iyi-haber",
        "ho-trendler",
        "ho-eglence",
        "ho-muzik",
        "ho-dizi-film",
        "ho-kultur-sanat",
        "ho-etkinlikler",
        "ho-gezi",
        "ho-mekanlar",
        "ho-yeme-icme",
        "ho-saglik",
        "ho-yasam",
        "ho-guzellik",
        "ho-moda",
        "ho-kadin",
        "ho-oyun-teknoloji",
        "ho-kampus"
      ],
      "hmNewsYsMansetEnabled": true,
      "hmNewsYsTickerEnabled": true,
      "hmRssKarmaDefaultsRev": "rss-karma-default-v1",
      "hmNavOnlyCategorySlugs": [
        "ho-iyi-haber",
        "ho-trendler",
        "ho-eglence",
        "ho-muzik",
        "ho-dizi-film",
        "ho-kultur-sanat",
        "ho-etkinlikler",
        "ho-gezi",
        "ho-mekanlar",
        "ho-yeme-icme",
        "ho-saglik",
        "ho-yasam",
        "ho-guzellik",
        "ho-moda",
        "ho-kadin",
        "ho-oyun-teknoloji",
        "ho-kampus",
        "ozel-haber"
      ],
      "hmNewsYsAuthorsEnabled": true,
      "hmNewsYsGalleryEnabled": true,
      "hmConceptAsideTopicOnly": true,
      "hmNewsHeaderMenuEnabled": true,
      "hmNewsTepeMansetEnabled": true,
      "hmNewsYsMostReadEnabled": true,
      "hmNewsYsHoroscopeEnabled": false,
      "hmNewsYsStandingsEnabled": false,
      "hmNewsYsVideoBandEnabled": false,
      "hmNewsBreakingBandEnabled": false,
      "hmConceptMostReadTopicOnly": true,
      "sadeNewsAtaturkBandEnabled": false,
      "hmNewsYsSideHeadlinesEnabled": true,
      "hmCorporateWarsSectionEnabled": false,
      "hmNewsCategorySectionsEnabled": true,
      "hmNewsHomeModuleCategorySlugs": {
        "ysGallery": "ho-gezi",
        "ysMostRead": "ho-trendler"
      },
      "hmNewsYsCategoryBlocksEnabled": true,
      "hmNewsYsSportsHoroscopeEnabled": false,
      "hmCorporateAtaturkCornerEnabled": false,
      "hmCorporateCulturePortalBandEnabled": false,
      "hmCorporateNationalDaysSectionEnabled": false,
      "sadeNewsHistoryNationalDaysBandEnabled": false
    }
  }
];

/**
 * Corporate (non-news) marketing sites that only need a PANEL row for /editor + the contact inbox.
 * Front end is served by the Worker; layout is corporate (excluded from news fan-out and public news-site lists).
 * Convention editor (bilgi@<domain>, password = e-mail, user decision) via layout.hmConventionEditorEnabled.
 */
export const SEED_CORPORATE_SITES = [
  {
    "slug": "goalgohaber",
    "hosts": [
      "goalgo.com.tr",
      "www.goalgo.com.tr"
    ],
    "displayName": "Goalgo Haber Yazılımı",
    "description": "Goalgo Haber Yazılımı tanıtım sitesi (kurumsal; haber/RSS yok). Ön yüz Worker'da (hm-goalgo-com-tr.js); bu satır yalnızca /editor paneli ve iletişim kutusu içindir.",
    "contact": {
      "email": "bilgi@goalgo.com.tr",
      "phone": "0532 229 18 92",
      "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara"
    },
    "editorEmail": "bilgi@goalgo.com.tr",
    "layout": {
      "hmSiteKind": "corporate",
      "hmNewsSiteKind": "corporate",
      "hmCorporateSite": true,
      "hmNewsRssSources": [
        0
      ],
      "hybridRssEnabled": false,
      "showPlatformNav": false,
      "hmContactFormEnabled": true,
      "hmConventionEditorEnabled": true,
      "hmGoalgoSite": "goalgo-20261009",
      "logoUrl": "/goalgo-haber/logo.svg",
      "faviconUrl": "/goalgo-haber/icon-48.png",
      "hmPrimaryColor": "#7c5cff",
      "hmSecondaryColor": "#22d3ee"
    }
  },
  {
    "slug": "alladdinhaber",
    "hosts": [
      "alladdin.app",
      "www.alladdin.app"
    ],
    "displayName": "Alladdin Haber Sitesi Yazılımı",
    "description": "Alladdin Haber Sitesi Yazılımı tanıtım sitesi (kurumsal; haber/RSS yok). Ön yüz Worker'da (hm-alladdin-app.js); bu satır yalnızca /editor paneli ve iletişim kutusu içindir.",
    "contact": {
      "email": "bilgi@alladdin.app",
      "phone": "0532 229 18 92",
      "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara"
    },
    "editorEmail": "bilgi@alladdin.app",
    "layout": {
      "hmSiteKind": "corporate",
      "hmNewsSiteKind": "corporate",
      "hmCorporateSite": true,
      "hmNewsRssSources": [
        0
      ],
      "hybridRssEnabled": false,
      "showPlatformNav": false,
      "hmContactFormEnabled": true,
      "hmConventionEditorEnabled": true,
      "hmAlladdinSite": "alladdin-20261009",
      "logoUrl": "/alladdin/logo.svg",
      "faviconUrl": "/alladdin/icon-48.png",
      "hmPrimaryColor": "#2a1468",
      "hmSecondaryColor": "#f5b83d"
    }
  }
];

const ALL_SEED_SITES = [...NEWSITES25, ...SEED_CORPORATE_SITES];


function normHost(h) {
  return String(h || "").trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "").replace(/\.$/, "");
}

export function newsites25ForHost(host) {
  const h = normHost(host);
  return ALL_SEED_SITES.find((s) => s.hosts.includes(h)) || null;
}

export function newsites25ForSlug(slug) {
  const s = String(slug || "").trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  return ALL_SEED_SITES.find((x) => x.slug === s) || null;
}

/** Brand bindings (hm-brand-db-ensure.js HM_BRAND_DB_BINDINGS). */
export const NEWSITES25_BINDINGS = ALL_SEED_SITES.map((s) => ({
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
