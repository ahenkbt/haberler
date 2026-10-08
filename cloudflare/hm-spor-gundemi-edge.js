/**
 * spor.gundemi.org (2026-10-08): sports concept news site (PHP Yenişafak theme, TP twilight-pine id 1146).
 * The PHP row was created directly in TP; this edge helper creates the matching PANEL row (DATABASE_URL) on the
 * first by-domain lookup that misses, so HM Editör login (spor@gundemi.org, password = username, convention
 * account opened on first login) and the admin list know the site. Idempotent; an existing row is never rewritten.
 * Concept flags: hmConceptSite + hmConceptTopic "spor" (Süper Lig on, burçlar off; Spor tree; pool 230 limited to Spor).
 */
export const SPOR_GUNDEMI_SLUG = "spor";
export const SPOR_GUNDEMI_HOSTS = ["spor.gundemi.org", "spor.fix.tc"];
export const SPOR_GUNDEMI_DISPLAY_NAME = "Spor Gündemi";
export const SPOR_GUNDEMI_DESCRIPTION =
  "Futbol, basketbol, voleybol ve tüm branşlarda güncel spor haberleri — Süper Lig puan durumu, engelli sporları, amatör spor.";
export const SPOR_GUNDEMI_CONTACT = {
  email: "spor@gundemi.org",
  phone: "0532 229 18 92",
  address: "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
};
export const SPOR_GUNDEMI_LAYOUT = {
  "frontend": "php",
  "phpTheme": true,
  "hmYsKunye": {
    "lead": "THA – TürkAta Haber Ajansı, TürkAta Vakfı kuruluşu ve markasıdır.",
    "email": "bilgi@turkatahaber.com",
    "phone": "0532 229 18 92",
    "tuzel": "Tükav Gaziler Eğitim Kültür Hizmetleri Ltd. Şti.",
    "yayin": "TÜRKATA HABER AJANSI",
    "address": "Sağlık Mah. Aksu Cad. 13/5 Çankaya - Ankara",
    "genelMudur": "Nail Türkoğlu",
    "yaziIsleri": "Melek Acar",
    "yayinIlkeleri": "Ajans, başlık, özet ve kaynak bağlantısıyla sınırlı besleme kayıtlarını olduğu gibi gösterir. Tam metin, kaynağın kendi sayfasındadır. Editörün yazdığı haberler bu sitede yayımlanır.",
    "yayinYonetmeni": "Mustafa ÖZDEMİR"
  },
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
  "logoUrl": "/gundemi/logos/spor-gundemi.png",
  "faviconUrl": "/gundemi/logos/spor-gundemi.png",
  "hmYsSlogan": "Sporun nabzı burada atar.",
  "hmPrimaryColor": "#0b5a32",
  "hmSecondaryColor": "#d71920",
  "hmYsMansetPreset": "takvim",
  "hmNewsYsMansetLayout": "takvim",
  "showPlatformNav": false,
  "hybridRssEnabled": false,
  "hmCatTree": "spor",
  "hmConceptSite": true,
  "hmConceptTopic": "spor",
  "hmNewsYsStandingsEnabled": true,
  "hmNewsYsSportsHoroscopeEnabled": true,
  "hmNewsYsHoroscopeEnabled": false,
  "hmNewsRssSources": [
    230
  ],
  "hmNewsRssCategoryOnly": [
    "spor",
    "futbol",
    "basketbol",
    "voleybol",
    "hentbol",
    "gures",
    "atletizm",
    "tenis",
    "yuzme",
    "motor-sporlari",
    "dovus-sporlari",
    "e-spor",
    "amator-spor",
    "engelli-sporlari"
  ],
  "hmNavOnlyCategorySlugs": [
    "spor",
    "futbol",
    "basketbol",
    "voleybol",
    "hentbol",
    "gures",
    "atletizm",
    "tenis",
    "yuzme",
    "motor-sporlari",
    "dovus-sporlari",
    "e-spor",
    "amator-spor",
    "engelli-sporlari",
    "ozel-haber"
  ],
  "hmCategorySortSlugs": [
    "spor",
    "futbol",
    "basketbol",
    "voleybol",
    "hentbol",
    "gures",
    "atletizm",
    "tenis",
    "yuzme",
    "motor-sporlari",
    "dovus-sporlari",
    "e-spor",
    "amator-spor",
    "engelli-sporlari"
  ],
  "hmCorporateMenuItems": [
    {
      "id": "m1",
      "label": "Spor",
      "href": "/kategori/spor",
      "parentId": "",
      "enabled": true
    },
    {
      "id": "m2",
      "label": "Futbol",
      "href": "/kategori/futbol",
      "parentId": "",
      "enabled": true
    },
    {
      "id": "m3",
      "label": "Basketbol",
      "href": "/kategori/basketbol",
      "parentId": "",
      "enabled": true
    },
    {
      "id": "m4",
      "label": "Voleybol",
      "href": "/kategori/voleybol",
      "parentId": "",
      "enabled": true
    },
    {
      "id": "m5",
      "label": "Hentbol",
      "href": "/kategori/hentbol",
      "parentId": "",
      "enabled": true
    },
    {
      "id": "m6",
      "label": "Güreş",
      "href": "/kategori/gures",
      "parentId": "",
      "enabled": true
    },
    {
      "id": "m7",
      "label": "Atletizm",
      "href": "/kategori/atletizm",
      "parentId": "",
      "enabled": true
    },
    {
      "id": "m8",
      "label": "Tenis",
      "href": "/kategori/tenis",
      "parentId": "",
      "enabled": true
    },
    {
      "id": "m9",
      "label": "Motor Sporları",
      "href": "/kategori/motor-sporlari",
      "parentId": "",
      "enabled": true
    },
    {
      "id": "m10",
      "label": "E-Spor",
      "href": "/kategori/e-spor",
      "parentId": "",
      "enabled": true
    },
    {
      "id": "m11",
      "label": "Engelli Sporları",
      "href": "/kategori/engelli-sporlari",
      "parentId": "",
      "enabled": true
    },
    {
      "id": "m12",
      "label": "Amatör Spor",
      "href": "/kategori/amator-spor",
      "parentId": "",
      "enabled": true
    }
  ],
  "hmNewsHomeModuleCategorySlugs": {
    "ysMostRead": "futbol",
    "ysGallery": "spor"
  },
  "hmNewsTopicPriority": {
    "days": 3,
    "blocks": true,
    "categories": [
      "spor",
      "futbol",
      "basketbol",
      "voleybol",
      "hentbol",
      "gures",
      "atletizm",
      "tenis",
      "yuzme",
      "motor-sporlari",
      "dovus-sporlari",
      "e-spor",
      "amator-spor",
      "engelli-sporlari"
    ],
    "keywords": []
  },
  "hmNewsAuthorsEnabled": false
};

export function isSporGundemiHost(host) {
  return SPOR_GUNDEMI_HOSTS.includes(String(host || "").trim().toLowerCase().replace(/^www\./, ""));
}


/** @returns {Promise<{row: object|null, action: string}>} */
export async function ensureSporGundemiSiteOnSql(sql) {
  const [h1, h2] = SPOR_GUNDEMI_HOSTS;
  const existing = await sql`
    SELECT id, slug, domain, domain2, domain3, display_name, description, contact_json, layout_json, active, created_at, updated_at
    FROM hm_news_sites
    WHERE lower(trim(both '/' from coalesce(slug, ''))) = ${SPOR_GUNDEMI_SLUG}
       OR lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) IN (${h1}, ${h2})
       OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) IN (${h1}, ${h2})
       OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) IN (${h1}, ${h2})
    ORDER BY id ASC
    LIMIT 1
  `;
  if (existing?.[0]) return { row: existing[0], action: "spor_lookup" };
  const layout = JSON.stringify(SPOR_GUNDEMI_LAYOUT);
  const contact = JSON.stringify(SPOR_GUNDEMI_CONTACT);
  const rows = await sql`
    INSERT INTO hm_news_sites (slug, domain, domain2, domain3, display_name, description, contact_json, layout_json, active, created_at, updated_at)
    VALUES (${SPOR_GUNDEMI_SLUG}, ${h1}, ${h2}, NULL, ${SPOR_GUNDEMI_DISPLAY_NAME}, ${SPOR_GUNDEMI_DESCRIPTION},
            ${contact}::jsonb, ${layout}::jsonb, true, NOW(), NOW())
    RETURNING id, slug, domain, domain2, domain3, display_name, description, contact_json, layout_json, active, created_at, updated_at
  `;
  if (rows?.[0]) console.log("[hm-spor-gundemi] panel site created", rows[0].id);
  return { row: rows?.[0] || null, action: "spor_created" };
}
